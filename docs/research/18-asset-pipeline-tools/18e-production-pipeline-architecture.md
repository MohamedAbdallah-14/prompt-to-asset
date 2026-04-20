---
title: "Architectural Blueprint for a Production Asset Pipeline"
category: 18-asset-pipeline-tools
angle: 18e
author: research-subagent-18e
date: 2026-04-19
status: draft
tags:
  - architecture
  - queue
  - bullmq
  - cloud-tasks
  - s3
  - r2
  - cdn
  - webhooks
  - idempotency
  - dlq
  - observability
  - cost-model
primary_sources:
  - https://docs.bullmq.io/
  - https://developers.cloudflare.com/queues/
  - https://developers.cloudflare.com/r2/
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/
  - https://www.backblaze.com/b2/cloud-storage-pricing.html
  - https://bunny.net/pricing/
  - https://www.inngest.com/docs
  - https://cloud.google.com/tasks/docs
  - https://opentelemetry.io/docs/
word_count_target: 2500-4000
---

# Architectural Blueprint for a Production Asset Pipeline

## Executive Summary

A production-grade asset generation pipeline for a prompt-enhancement product (logos, icons, illustrations, OG images) must absorb bursty, high-latency model calls (5–60 s per image), tolerate vendor failures (Gemini Imagen, OpenAI `gpt-image-1`, Flux, Recraft, Ideogram), serve assets from a global edge, and **never charge a user twice for the same pixels**. The canonical architecture is:

```
POST /generate → API → enqueue(jobId, promptHash, idempotencyKey)
                       ↓
                 cache lookup (prompt_hash → asset_url)
                       ↓ miss
                   worker pool
                       ↓
       model call (Imagen / gpt-image-1 / Flux / Recraft)
                       ↓
              post-process (rembg, upscale, vectorize)
                       ↓
           object storage (S3 / R2 / B2 / Bunny)
                       ↓
                CDN (Cloudflare / Bunny / CloudFront)
                       ↓
            webhook + signed URL back to caller
```

Three load-bearing decisions dominate cost and reliability:

1. **Queue substrate.** BullMQ+Redis for self-hosted flexibility (priority queues, rate limiting per vendor, repeatable jobs), or Inngest/Cloudflare Queues/Cloud Tasks for serverless-native deployments where you don't want to babysit Redis.
2. **Storage + CDN pair.** Cloudflare R2 + Cloudflare CDN is the egress-free default for public assets; S3 + CloudFront is the enterprise default; Backblaze B2 + Bunny CDN is the cheapest serious option (Bandwidth Alliance makes egress free between B2 and Cloudflare/Bunny).
3. **Prompt-hash caching + idempotency keys.** SHA-256 over a *canonicalized* prompt (normalized whitespace, sorted parameters, stable JSON) collapses duplicate user requests — typically 20–40 % of traffic on consumer asset tools — into a single model call, paying back the engineering cost inside the first month.

At 10 k assets/month the total infra bill sits in the **$20–60 range** (model spend excluded); at 1 M assets/month it sits in the **$500–2,500 range** depending on the storage/CDN pair. Model spend dwarfs infra at both scales — an additional reason the cache is critical.

## Architecture Diagram

```
                    ┌──────────────────────────────────────────────┐
                    │                   Client                      │
                    │   (Cursor/Claude skill, web UI, CLI, Figma)   │
                    └───────────────┬──────────────────────────────┘
                                    │ HTTPS
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │                     Edge / API                            │
        │   Cloudflare Worker or Fastify/Hono behind a load         │
        │   balancer. Auth, rate-limit, request validation.         │
        └───────┬──────────────────────────────────────┬───────────┘
                │ POST /generate                       │ GET /jobs/:id
                ▼                                      ▼
        ┌───────────────────┐                 ┌────────────────────┐
        │ Prompt Canonicalizer│ ─┐              │  Job Status Store  │
        │  - trim, nfc, sort │  │              │  (Redis / D1 /     │
        │  - SHA-256 → hash  │  │              │   Postgres)        │
        └───────────────────┘  │              └─────────▲──────────┘
                               │                        │
                               ▼                        │
                     ┌───────────────────┐              │
                     │  Cache Lookup     │──hit──►  return signed URL
                     │ (KV / Redis)      │              │
                     │ hash → asset_url  │              │
                     └─────────┬─────────┘              │
                               │ miss                   │
                               ▼                        │
                 ┌──────────────────────────┐           │
                 │  Queue                   │           │
                 │  BullMQ / Cloudflare     │──► DLQ ───┤
                 │  Queues / SQS / Cloud    │           │
                 │  Tasks / Inngest         │           │
                 │  (priority, rate-limit,  │           │
                 │   per-vendor lane)       │           │
                 └─────────┬────────────────┘           │
                           │ lease                      │
                           ▼                            │
               ┌─────────────────────────────┐          │
               │    Worker Pool              │          │
               │  Node/Python containers,    │          │
               │  Lambda, Cloudflare Workers │          │
               │  (exponential backoff,      │          │
               │   per-vendor concurrency)   │          │
               └──────┬───────┬──────────────┘          │
                      │       │                         │
      ┌───────────────┘       └─────────────────┐       │
      ▼                                         ▼       │
┌──────────────┐                        ┌─────────────────┐
│ Model Call   │                        │ Post-Processing │
│ Imagen 4,    │                        │ rembg/BiRefNet, │
│ gpt-image-1, │ ──────── raw ─────────►│ Real-ESRGAN,    │
│ Flux, Recraft│                        │ vtracer, sharp  │
└──────────────┘                        └────────┬────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │  Object Storage     │
                                      │  S3 / R2 / B2 /     │
                                      │  Bunny Storage      │
                                      │  key = hash/variant │
                                      └──────────┬──────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │  CDN                │
                                      │  Cloudflare / Bunny │
                                      │  / CloudFront       │
                                      └──────────┬──────────┘
                                                 │
                                                 ▼
                                        signed URL +
                                       webhook (HMAC)
```

## Component Tradeoffs

### 1. Queue

| Option | Infra | $ at 1 M jobs | Strengths | Weaknesses |
|---|---|---|---|---|
| **BullMQ + Redis** | self-host or Upstash/Elasticache | ~$10–50/mo Redis | Priority queues, rate-limit per job name, repeatable jobs, flow producer (parent/child), QueueEvents bus, great TS types, Bull Board UI | You operate Redis. Must handle persistence (AOF), HA (Redis Sentinel/Cluster). |
| **Cloudflare Queues** | serverless | ~$0.40/M ops + Worker compute | Zero-ops, integrates with Workers and R2 in the same request, per-queue consumer concurrency up to 250, automatic DLQ via `dead_letter_queue` binding | Message size 128 KB; no priority; delivery-only semantics (at-least-once). |
| **AWS SQS + Lambda** | serverless | ~$0.40/M SQS + Lambda | Battle-tested, FIFO queues with message-group IDs for per-user ordering, visibility timeout + redrive to DLQ, maturity of tooling | Cold starts for Lambda on 30–60 s model calls unless using provisioned concurrency or Fargate; 15-min Lambda ceiling. |
| **Google Cloud Tasks** | serverless | ~$0.40/M after 1M free | HTTP-target push model, built-in retry with exponential backoff, rate limits per queue, works cleanly with Cloud Run which has no 15-min limit | Fewer community libraries; less rich scheduling than BullMQ. |
| **Inngest** | managed | ~$20/mo base + usage | Step functions with durable execution, replay, concurrency controls per event key, built-in observability UI | Vendor lock-in; pricing grows with step count, not job count; harder to run fully offline. |
| **Temporal** | managed or self-host | $$ | Durable workflows, beats everything else for multi-step orchestration (generate → upscale → vectorize) | Operational weight; overkill below 100 k jobs/day. |

**Recommendation:** BullMQ for self-hosted or Kubernetes, Cloudflare Queues if the rest of the stack is already on Workers+R2, Inngest if you want step-function semantics without running infra. At 10 k/month all three are effectively free; at 1 M/month BullMQ on a $50 Redis is cheapest, Cloudflare Queues costs ~$0.40, SQS ~$0.40 but Lambda compute adds more.

### 2. Object Storage

| Option | Storage $/GB-mo | Egress $/GB | Class A ops $/M | Class B ops $/M | Notes |
|---|---|---|---|---|---|
| **AWS S3 Standard** | 0.023 | 0.09 (first 10 TB, then tiered) | 5.00 | 0.40 | Baseline; expensive egress is the killer. |
| **Cloudflare R2** | 0.015 | **0** | 4.50 | 0.36 | Free egress is the single biggest cost lever. S3-compatible API. |
| **Backblaze B2** | 0.006 | 0.01 (free to CF/Bunny via Bandwidth Alliance; free for 3× stored bytes) | 0 (uploads free) | 0.004/10k | Cheapest at-rest; pairs perfectly with Bunny CDN. |
| **Bunny Storage** | 0.01 (edge) / 0.02 (replicated) | 0 within Bunny CDN | 0 | 0 | Tight integration with Bunny CDN, per-region replication. |
| **Wasabi** | 0.0069 | 0 (but 1 TB/mo egress cap per TB stored) | 0 | 0 | Flat pricing; egress-fair-use policy can bite. |

**Recommendation for this product:**
- **Default:** Cloudflare R2 — zero egress means you can serve the full-resolution asset repeatedly without watching bandwidth bills.
- **Cost-optimized:** Backblaze B2 + Bunny CDN — lowest $/GB-month for a cold-heavy asset library.
- **Enterprise-required:** S3 + CloudFront — if the customer mandates AWS IAM and VPC endpoints.

Key sizes we're paying for:
- 1024×1024 PNG with alpha ≈ 1–3 MB.
- Full asset set for one logo (PNG 512/1024/2048 + SVG + favicon.ico + OG 1200×630) ≈ 6–10 MB.
- 1 M assets/month averaging 2 MB raw + 4× variants ≈ **8 TB/month** new storage.

### 3. CDN

| CDN | Cost model | Egress $/GB (US/EU) | Notes |
|---|---|---|---|
| **Cloudflare** | Free tier unlimited; Pro $20/mo; Business $200/mo | Free for cached content; R2 egress free | Workers at edge for signed-URL validation, image resizing via Cloudflare Images. |
| **Bunny CDN** | $0.005–0.01/GB | 0.005 (EU/NA), 0.01 (ASIA), 0.03 (LATAM/AF) | Cheapest raw $/GB with real PoPs; Bunny Optimizer for on-the-fly resize. |
| **CloudFront** | Usage + request fees | 0.085 (US/EU) above 1 TB free | 1 TB/month free perpetually (AWS Free Tier extension since 2021). Great Lambda@Edge story. |
| **Fastly** | Commitment | ~0.12 | Premium option; VCL flexibility. |

**Recommendation:** Cloudflare when paired with R2 (single egress-free plane). Bunny when paired with B2 or Bunny Storage. CloudFront only if you're all-in on AWS.

### 4. Prompt-Hash Caching

Canonicalization rules before hashing:

1. Unicode NFC normalize.
2. Collapse whitespace (`/\s+/g` → single space), trim.
3. Lowercase model-agnostic text; keep case for brand-sensitive tokens.
4. Sort JSON parameter keys; drop nil/default values.
5. Include `{model, aspect_ratio, seed?, guidance_scale?, style_preset?, negative_prompt}` in the hash — different params produce different pixels.
6. `hash = sha256(canonical_prompt + ":" + canonical_params)`.

Storage layout:

```
assets/<hash_prefix_2>/<hash>/
    raw.png                    (model output)
    1024.png, 512.png, 256.png (resized)
    transparent.png            (post-rembg)
    vector.svg                 (post-vtracer)
    og_1200x630.png
    metadata.json              (prompt, model, timings, cost)
```

On `POST /generate` the API:

1. Canonicalizes and hashes the prompt.
2. Looks up `KV[hash]` (Cloudflare KV, Redis `GET`, or DynamoDB point query — 1–5 ms).
3. On hit, returns the signed URL immediately without queueing.
4. On miss, enqueues the job with `hash` as the dedup/job ID so concurrent duplicate requests collapse (BullMQ `jobId`, SQS FIFO `MessageDeduplicationId`, Cloudflare Queues custom handling).

Expected cache hit rate: **20–40 %** for consumer flows (logos for "my SaaS", favicon for "my app"), **5–10 %** for deeply personalized flows. Even 20 % hit rate halves the multi-second first-byte latency and pays back all model spend for those hits.

### 5. Webhook Pattern for Long-Running Generations

Most image models take 5–60 s; SDXL Flux dev + Real-ESRGAN + vectorization easily hits 90 s. The API must not block.

Two supported flows:

**Sync-with-polling:**
- `POST /generate` → 202 Accepted with `{job_id, status_url}`.
- Client polls `GET /jobs/:job_id` every 2 s until `status: "succeeded"`.
- Suitable for interactive UIs.

**Async webhook:**
- `POST /generate { webhook_url }` → 202 Accepted with `{job_id}`.
- Worker on completion POSTs to `webhook_url` with `{job_id, status, asset_urls, prompt_hash}` + `X-Signature: sha256=<hmac(secret, body)>`.
- Webhook retries: 5× exponential backoff (1 s, 5 s, 30 s, 2 m, 10 m), giving ~12-minute delivery window; after that, DLQ.
- **Signature verification is mandatory** — clients must reject unsigned or stale requests. Include a `X-Timestamp` header and reject older than 5 minutes to kill replay attacks.
- Use **per-customer webhook secrets**, not a global secret.

Pattern lifted directly from Stripe, GitHub, and Replicate webhooks — all three publicly document their HMAC schemes and are worth cloning verbatim.

### 6. Idempotency Keys & Retry-Safe Workers

Two layers:

**Client-supplied idempotency key** (`Idempotency-Key` header, Stripe-style):
- API stores `{idempotency_key → job_id}` in Redis/KV with 24 h TTL.
- Replaying the same key within 24 h returns the *same* `job_id` even if the request body is identical (or 409 if the body differs — mismatched replay).

**Server-computed dedup key** (`prompt_hash`):
- Collapses identical prompts from *different* users into a single model call when allowed.
- Disable for paid/private tier; enable for free/public tier.

**Worker safety rules:**
- Workers must be pure functions of `(prompt, params, seed)` — no side effects beyond writing to the content-addressed storage path `hash/variant.ext`. Re-execution is safe because writes are idempotent (same key overwrites same bytes).
- Use **exponential backoff with jitter** for vendor retries: 1s, 2s, 4s, 8s + `rand(0,1s)`.
- Cap vendor retries at 3 before DLQ.
- **Never retry on 4xx** (bad prompt, safety filter) — DLQ immediately with a structured reason.
- **Always retry on 5xx and network errors**.
- Track `attempt_count` in job metadata; log every attempt with OpenTelemetry span.

### 7. Dead-Letter Queue (DLQ)

Every queue must have a DLQ. Routes into DLQ:

1. **Retries exhausted** (hard failure on vendor side).
2. **Safety rejection** (DALL·E returns `content_policy_violation`, Imagen returns `PERSON_GENERATION_NOT_ALLOWED`).
3. **Invalid prompt** post-canonicalization.
4. **Worker crash** (visibility timeout expiry in SQS; stalled jobs in BullMQ).

DLQ consumers:
- An alerting subscriber → PagerDuty/Sentry on sustained DLQ rate.
- A nightly re-drive job that re-enqueues transient-looking failures after vendor incident windows.
- A manual-review UI for safety rejections (so prompts can be rewritten or whitelisted).

BullMQ: `failed` queue with `attempts: 3, backoff: { type: 'exponential', delay: 1000 }`. Cloudflare Queues: declarative `dead_letter_queue` in `wrangler.toml`. SQS: `RedrivePolicy { maxReceiveCount: 3, deadLetterTargetArn }`. Cloud Tasks: retry config on the queue, then manual DLQ via a second queue.

### 8. Observability

**Traces (OpenTelemetry):**
- Span per HTTP request.
- Child span per queue enqueue.
- Child span per worker execution, with sub-spans per stage (`model.call`, `postprocess.rembg`, `storage.put`, `cdn.invalidate`).
- Attributes: `prompt_hash`, `model`, `tokens`, `cost_usd`, `cache_hit`, `attempt_count`.

Back-ends that speak OTLP natively: **Honeycomb**, **Grafana Tempo**, **Datadog**, **New Relic**, **SigNoz** (OSS), **Sentry** (traces in Sentry 8+).

**Errors: Sentry.** Capture worker exceptions with `prompt_hash` and `job_id` as tags. Automatic issue grouping by vendor error class.

**Metrics (Prometheus format):**
- `pipeline_jobs_total{status,model}` counter.
- `pipeline_job_duration_seconds{stage}` histogram.
- `pipeline_cache_hit_ratio` gauge.
- `pipeline_queue_depth{queue}` gauge.
- `pipeline_vendor_error_rate{vendor}` gauge (SLO: < 2 %).

**Logs:** structured JSON, never log raw prompt contents at INFO (PII and copyright concerns) — log the `prompt_hash` and the first 80 chars.

## Cost Model

### Assumptions

- Asset: one "asset set" = 5 PNG variants + 1 SVG + 1 favicon = ~8 MB, 7 files.
- Per generation: 1 model call averaging 10 MP of output pixels, compressed to ~2 MB raw.
- Stored forever (no TTL) unless noted.
- Views per asset: 50 (the user + their CI + their website visitors).
- Model cost excluded (varies wildly: Flux schnell $0.003, Imagen 4 $0.04, gpt-image-1 Medium $0.042).

### Scenario A: 10 k assets/month

| Line item | Calc | $/mo |
|---|---|---|
| Storage (R2) | 10 k × 8 MB = 80 GB × $0.015 | 1.20 |
| Storage cumulative year 1 avg | ~480 GB × $0.015 | 7.20 |
| Class A ops (uploads) | 10 k × 7 = 70 k × $4.50/M | 0.32 |
| Class B ops (reads) | 10 k × 50 views × 3 hits = 1.5 M × $0.36/M | 0.54 |
| CDN egress (Cloudflare, R2) | 0 | 0 |
| Queue (BullMQ on 1× $10 Upstash or SQS) | flat | 10 (Upstash) or 0.04 (SQS) |
| Redis cache (optional) | Upstash free tier | 0 |
| Observability (Sentry + free Grafana Cloud) | free tier | 0 |
| **Total infra** | | **~$20–30** |

### Scenario B: 1 M assets/month

| Line item | Calc | $/mo |
|---|---|---|
| Storage new (R2) | 1 M × 8 MB = 8 TB × $0.015 | 120 |
| Storage cumulative (avg 48 TB over year 1) | 48 TB × $0.015 | 720 |
| Class A ops | 7 M × $4.50/M | 31.50 |
| Class B ops | 150 M × $0.36/M | 54 |
| CDN egress (Cloudflare) | 0 | 0 |
| Queue (BullMQ on $50 Redis cluster) | flat | 50 |
| Cache (Redis cluster) | | 30 |
| Observability (Grafana Cloud Pro + Sentry Team) | | 75 |
| **Total infra (year-1 avg)** | | **~$960–1,200** |

Compare against the S3 + CloudFront version of the same workload:

| Line item | 1 M/mo on S3+CloudFront | $/mo |
|---|---|---|
| Storage (S3) | 48 TB × $0.023 | 1,104 |
| Class A/B ops | ~ | 65 |
| CloudFront egress | 150 M × 2 MB avg = 300 TB × $0.085 after first 1 TB free | **25,415** |
| Queue (SQS + Lambda) | | 100 |
| **Total** | | **~$26,700** |

The ~25× egress gap is why R2 (or B2+Bunny) is not optional at scale. **Cloudflare R2 + Cloudflare CDN is the single most consequential cost choice in this architecture.**

### Cheapest serious alternative: B2 + Bunny

| Line item | 1 M/mo on B2+Bunny | $/mo |
|---|---|---|
| Storage (B2) | 48 TB × $0.006 | 288 |
| B2→Bunny egress | free (Bandwidth Alliance) | 0 |
| Bunny CDN to users | 300 TB × $0.005 (EU/NA weighted) | 1,500 |
| **Total** | | **~$1,790** |

Bunny wins on storage but loses on viewer egress once traffic passes ~50 TB/month. For most prompt-enhancement products, R2+CF remains the sweet spot. If cold storage dominates (you keep assets around but they're rarely viewed), B2 wins outright.

### Cache amortization

A 25 % cache hit rate at 1 M generations = 250 k avoided model calls. At an average blended model cost of $0.02 that's **$5,000/month saved** — ~5× the entire infra line. Building the prompt-hash cache is the highest-leverage engineering investment on this pipeline.

## OSS Reference Repos

Repos that implement most or all of this pattern end-to-end and are worth reading before writing any code:

1. **[replicate/cog](https://github.com/replicate/cog)** — packaging format plus a queue-backed prediction server used by Replicate's production. Reference for idempotent prediction IDs, webhook delivery, signed URL outputs. Actively maintained, thousands of stars.
2. **[fal-ai/isomorphic-fal-client](https://github.com/fal-ai/isomorphic-fal-client)** and the public fal.ai API docs — canonical queued-generation API with `/run` (sync), `/queue` (async), `/status`, `/cancel`, and webhook delivery.
3. **[runpod-workers/worker-template](https://github.com/runpod-workers/worker-template)** — minimal worker that polls a RunPod queue, calls a model, uploads to S3, responds. Good small reference.
4. **[huggingface/huggingface_hub](https://github.com/huggingface/huggingface_hub)** — Inference Endpoints client; illustrates idempotent prediction IDs and retry-safe semantics.
5. **[comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)** + **[Comfy-Deploy/comfyui-deploy](https://github.com/BennyKok/comfyui-deploy)** — Comfy-Deploy wraps ComfyUI with queue, webhooks, S3 upload, auth. Production-oriented.
6. **[OvhCloud/fast-image-generation](https://github.com/ovh)** and similar OVH/Hugging Face reference stacks — Kubernetes + Redis + BullMQ + S3 pattern.
7. **[unkeyed/unkey](https://github.com/unkeyed/unkey)** — API key and rate-limit infra commonly placed in front of image-gen APIs; good reference for per-customer quota enforcement.
8. **[inngest/inngest](https://github.com/inngest/inngest)** — the OSS engine itself; reading its code clarifies durable execution and step replay.
9. **[vercel/modelfusion](https://github.com/vercel/modelfusion)** (now `ai`-sdk adjacent) — TypeScript abstractions for calling image/text models with retry + telemetry.
10. **[langgenius/dify](https://github.com/langgenius/dify)** — an LLM application platform whose image-generation workflow uses Celery + Redis + S3; worth reading the `api/services/app_generate_service.py` + `workflow` folder for a full BullMQ-equivalent pattern in Python.
11. **[expo/eas-build](https://github.com/expo/eas-build)** — not image-specific, but an exemplary queue-backed async-build pipeline with signed-URL artifact delivery, webhooks, and an HTTP `/build/:id` polling endpoint. The API shape is almost 1-for-1 reusable.
12. **[stripe/stripe-go](https://github.com/stripe/stripe-go) + [stripe docs: idempotency](https://stripe.com/docs/api/idempotent_requests)** — the reference implementation of idempotency keys in a public HTTP API.
13. **[taskforcesh/bullmq](https://github.com/taskforcesh/bullmq)** itself — the docs under `docs/gitbook/patterns/` include "manually handling idempotency", "reliable job processing", and "job completion" patterns directly applicable here.
14. **[cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk)** — examples under `templates/queues/*` show the full Worker + Queue + R2 + DLQ wiring in ~100 lines.

## Concrete Skeleton (BullMQ + R2 variant)

```ts
// api/generate.ts
const hash = sha256(canonicalize(prompt, params))
const cached = await kv.get(`asset:${hash}`)
if (cached) return { status: 'succeeded', asset_urls: cached }

await queue.add('generate', { hash, prompt, params, webhook_url }, {
  jobId: hash,                // idempotency: dedupes concurrent identical prompts
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 10000 },
  removeOnFail:     { count: 50000 },   // retained for DLQ inspection
})
return { job_id: hash, status: 'queued' }
```

```ts
// worker.ts
new Worker('generate', async job => {
  const span = tracer.startSpan('worker.generate', {
    attributes: { prompt_hash: job.data.hash, model: job.data.params.model },
  })
  try {
    const raw = await callModel(job.data.prompt, job.data.params)   // retry-safe
    const variants = await postprocess(raw)
    const urls = await uploadAll(variants, `assets/${job.data.hash}`) // content-addressed
    await kv.set(`asset:${job.data.hash}`, urls, { ex: 60 * 60 * 24 * 365 })
    if (job.data.webhook_url) await deliverWebhook(job.data.webhook_url, { job_id: job.id, urls })
    return urls
  } finally { span.end() }
}, { connection, concurrency: 8, limiter: { max: 50, duration: 1000 } })
```

Four lines that disproportionately matter: `jobId: hash` (dedup), content-addressed storage key (idempotent upload), `attempts: 3` with exponential backoff (transient-failure tolerance), and `kv.set` of the completed result (future cache hits).

## References

- BullMQ docs — https://docs.bullmq.io/ (patterns: reliable job processing, idempotency, flow producer)
- Cloudflare Queues — https://developers.cloudflare.com/queues/reference/configuration/ (dead_letter_queue, consumers, batch)
- Cloudflare R2 pricing — https://developers.cloudflare.com/r2/pricing/
- AWS S3 pricing — https://aws.amazon.com/s3/pricing/
- AWS SQS docs — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Backblaze B2 pricing — https://www.backblaze.com/b2/cloud-storage-pricing.html
- Bandwidth Alliance — https://www.cloudflare.com/bandwidth-alliance/
- Bunny CDN pricing — https://bunny.net/pricing/
- CloudFront pricing — https://aws.amazon.com/cloudfront/pricing/
- Google Cloud Tasks — https://cloud.google.com/tasks/docs/creating-http-target-tasks
- Inngest — https://www.inngest.com/docs (durable execution, concurrency controls)
- Temporal — https://docs.temporal.io/
- Stripe idempotency — https://stripe.com/docs/api/idempotent_requests
- Stripe webhook best practices — https://stripe.com/docs/webhooks/best-practices
- Replicate webhooks — https://replicate.com/docs/reference/webhooks
- fal.ai queue API — https://fal.ai/docs/model-endpoints/queue
- OpenTelemetry spec — https://opentelemetry.io/docs/specs/otel/
- Sentry performance for queues — https://docs.sentry.io/product/performance/queue-monitoring/
- Cloudflare Workers + Queues + R2 templates — https://github.com/cloudflare/workers-sdk/tree/main/templates
- ComfyUI-Deploy — https://github.com/BennyKok/comfyui-deploy
- Replicate Cog — https://github.com/replicate/cog
- BullMQ patterns: https://docs.bullmq.io/patterns/manually-fetching-jobs and https://docs.bullmq.io/patterns/idempotent-jobs
