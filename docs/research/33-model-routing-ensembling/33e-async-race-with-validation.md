# 33e — Async Race with Validation

**Focus:** Fire multiple model calls in parallel, return the first result that passes validation. fal.ai queue mechanics, Promise.race patterns, cancellation, and cost control.

> **Updated 2026-04-21:** fal.ai Queue API mechanics verified — no material API changes since the original research. OpenRouter routing clarified: parallel race is not natively supported (sequential fallback only); parallel dispatch requires issuing concurrent HTTP requests directly. New models relevant to async race patterns: Flux.2 [klein] (Apache 2.0, Jan 2026, sub-second on local GPU — race leg that may resolve before API calls even return from queue). FLUX.1 Kontext [pro] (May 29, 2025) and [dev] (June 26, 2025) added as race candidates for instruction-based image editing tasks.

---

## The Pattern

An async race is the parallelized complement to a sequential cascade (33b): instead of trying models in order and waiting for each to succeed or fail before trying the next, fire all candidate models simultaneously and return the first one that passes the validation gate.

**When to prefer race over cascade:**
- Generation latency is the bottleneck (not cost).
- Models have similar cost profiles — no cheap/expensive gradient to exploit.
- Brief complexity is ambiguous — you don't know which model will win.
- You want a hard latency SLA (e.g., 15-second P95 generation time).

**When to prefer cascade over race:**
- Cost is the primary constraint.
- Models have a clear cheap-to-expensive ordering with a known cascade threshold.
- Request volume is high and parallelizing all models is too expensive.

---

## fal.ai Queue API for Parallel Dispatch

fal.ai's Queue API (https://fal.ai/docs/model-apis/model-endpoints/queue) is designed for exactly this pattern. Key properties:

- **Submit returns immediately** with a `request_id` and polling/streaming URLs.
- **Session affinity via `hint`:** Route concurrent requests to the same runner (keeps model weights warm); useful for BoN-N from the same model.
- **Priority:** `"normal"` (default) or `"low"`. Use `"low"` for background challenger variants in A/B mode.
- **Cancellation:** `handler.cancel()` removes in-queue requests immediately; in-progress requests receive a signal (app must implement cancellation handling).
- **Retry:** Up to 10 automatic retries on runner failure. Disable with `X-Fal-No-Retry` header to avoid wasted retries when you have a race and one runner slot has already won.
- **Webhooks:** POST completion payload to your server — preferred over polling for async race patterns.

**Parallel submit pattern (Python):**
```python
import asyncio, fal_client

async def race_with_validation(brief: str, models: list[str], validator) -> dict:
    handlers = [
        fal_client.submit_async(model, arguments={"prompt": brief})
        for model in models
    ]
    
    winner = None
    pending = set(asyncio.create_task(h.get_async()) for h in handlers)
    
    while pending and winner is None:
        done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            result = task.result()
            if validator(result):
                winner = result
                # Cancel remaining in-queue jobs to stop wasting money
                for h in handlers:
                    if not h.is_done():
                        await h.cancel_async()
                break
    
    return winner or raise NoValidResultError()
```

**TypeScript / Node.js pattern** using `Promise.race` with a validation wrapper:
```typescript
async function raceWithValidation(brief: string, models: string[]): Promise<AssetResult> {
  const validatedPromises = models.map(model =>
    generateAndValidate(model, brief) // rejects if validation fails
  );
  
  // Promise.any returns first that resolves (not first that settles)
  // Use Promise.any, not Promise.race, to skip validation failures
  return Promise.any(validatedPromises);
}
```

`Promise.any` (ES2021) is the correct primitive here, not `Promise.race`. `Promise.race` returns the first to _settle_ (including rejections); `Promise.any` returns the first to _resolve_, skipping rejections. If all reject, `AggregateError` gives you all failure reasons.

---

## Cancellation Economics

The main risk in an async race is paying for N model calls when only 1 result is needed. The cost impact depends on where in the generation pipeline the winner is declared:

- **Cancelled before GPU starts (IN_QUEUE state):** No compute cost on fal.ai; you pay API call overhead only.
- **Cancelled during generation (IN_PROGRESS state):** You likely pay for the partial compute, but at least you don't pay for a complete result. Policy varies by provider.
- **Completed but discarded:** Full cost regardless.

**Mitigation:** Use `start_timeout` on fal.ai to bound the total wall-clock window. If the best model completes in 12 seconds and the `start_timeout` is 15 seconds, slower runners that haven't started by then are dropped automatically.

For OpenRouter: model fallbacks are sequential by default. OpenRouter does not expose a true parallel-race API — you must issue concurrent requests yourself and use the `models[]` array only for sequential fallback. OpenRouter's Auto Exacto re-evaluates providers every 5 minutes across throughput, tool-call telemetry, and benchmark scores (on by default for requests with tools) — but this is provider-level load balancing, not model-level parallel racing.

> **Updated 2026-04-21:** OpenRouter confirmation: `models[]` array is sequential fallback only. Parallel racing across different models requires explicit concurrent HTTP requests. The Auto Router (powered by Not Diamond) selects a single model per request — it does not dispatch to multiple models simultaneously. For true parallel race behavior, use fal.ai Queue API directly or issue concurrent OpenAI/Anthropic/BFL API calls and implement `Promise.any` / `asyncio.wait(FIRST_COMPLETED)` in your own orchestrator.

---

## Validation as the Race Gate

The race only works if validation is fast enough to not negate the parallelism benefit. Validation tiers:

**Tier 0 — deterministic (< 1s):** Dimension check, alpha channel, FFT checkerboard. Implemented locally with sharp/pngcheck/pillow. This should always run first — it costs nothing and immediately disqualifies clearly broken outputs.

**Tier 1 — VLM judge (1–5s):** Only run if tier 0 passes. This is the expensive gate. For a race with N=3 models where tier 0 takes 0.5s and tier 1 takes 3s, total gate latency before returning a result is 3.5s. The parallelism benefit is only realized if generation takes longer than 3.5s — which it does for most diffusion models (8–30s typical).

**Avoid:** Running OCR + Levenshtein wordmark check synchronously in the validation gate during a race. OCR adds 2–5s latency. Run it as a post-race async check and surface warnings in the AssetBundle rather than blocking the race.

---

## Mixture-of-Experts Application

A more sophisticated variant: route different asset sub-types to domain-specialized models in parallel, then merge results. Example for a full app icon bundle:

- **Mark generation:** `recraft-v4` (vector specialist, Feb 2026 SOTA for native SVG)
- **Background fill / color palette:** `flux.2-dev` or `flux.2-max` (photorealistic scene specialist)
- **Composite + platform export:** deterministic pipeline

These three steps are partially parallelizable: start `recraft-v4` and `flux.2-dev` in parallel; merge when both complete. This is not a race (you need both results) but a parallel async dependency graph — the standard `Promise.all` / `asyncio.gather` pattern.

**FLUX.1 Kontext [pro/dev] as a race leg for editing tasks:** For instruction-based image editing (e.g., "change the icon background color to match brand palette"), FLUX.1 Kontext [pro] (May 29, 2025) and [dev] (June 26, 2025, open-weights, 12B) are strong candidates for a race against a prompt-only diffusion model. Kontext excels at local edits preserving subject identity — useful for logo-on-background compositing and platform-specific adaptations.

> **Updated 2026-04-21:** `recraft-v3` updated to `recraft-v4` (Feb 2026). `flux-pro` updated to `flux.2-dev` / `flux.2-max`. FLUX.1 Kontext added as an editing-task race candidate. Flux.2 [klein] (Apache 2.0, Jan 2026, ~13GB VRAM) is a compelling local race leg: sub-second on RTX 3090 means a local [klein] leg can race against a remote API call and often win on latency for simple briefs. Implement as a `Promise.any` between the local [klein] result and the remote API result; validate both with tier-0 checks and return whichever passes first.

---

## fal.ai Specific Notes

- `hint` parameter provides session affinity but not guaranteed same-GPU routing — it hints the dispatcher to prefer a runner that already has the model weights loaded. Use the same hint value across BoN calls to the same model for latency savings.
- Retry default of 10 can cause a race to effectively stall if one model runner fails repeatedly. Set `X-Fal-No-Retry: true` on all race legs except the primary/fallback to prevent zombie retries after the race is won.
- Webhook delivery is more reliable than polling for races with N > 2 — polling three endpoints simultaneously adds 3× network overhead; webhooks consolidate delivery.

---

## Cost-Latency Summary

| Strategy | Cost | Latency | Best for |
|---|---|---|---|
| Sequential cascade | 1× (average) | N × (gen + val) worst case | Cost-sensitive, high volume |
| Async race (N=2) | ~1.5× (average if 50% cancel) | Single gen + val time | Latency SLA with similar-cost models |
| Async race (N=3) | ~2× | Single gen + val time | High-quality brand assets |
| BoN (N=3, return best) | 3× | Single gen time + N × val | Maximum quality, no latency budget |

---

**Sources:**
- https://fal.ai/docs/model-apis/model-endpoints/queue
- https://fal.ai/docs/documentation/model-apis/inference/queue
- https://fal.ai/learn/devs/gen-ai-performance-optimization
- https://openrouter.ai/docs/guides/routing/model-fallbacks
- https://openrouter.ai/docs/guides/features/model-routing
- https://www.geeksforgeeks.org/system-design/how-to-fix-a-race-condition-in-an-async-architecture/
- https://fal.ai/docs/examples/video-generation/deploy-multi-gpu-inference
- https://bfl.ai/announcements/flux-1-kontext (FLUX.1 Kontext [pro] release, May 29, 2025)
- https://bfl.ai/announcements/flux-1-kontext-dev (FLUX.1 Kontext [dev] open weights, June 26, 2025)
- https://github.com/black-forest-labs/flux2 (Flux.2 [klein] repo)
- https://bfl.ai/blog/flux2-klein-towards-interactive-visual-intelligence
