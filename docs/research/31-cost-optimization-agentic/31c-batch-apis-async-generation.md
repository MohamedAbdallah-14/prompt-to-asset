# 31c — Batch APIs for Async Generation

## The Pattern

Both Anthropic and OpenAI offer batch APIs that trade latency (24-hour completion window) for a flat 50% cost discount. For an asset pipeline that includes non-interactive steps — icon pack generation, background jobs, pre-warming common logo variants — batch mode is the clearest cost lever available.

---

## Anthropic Message Batches API

**Official docs:** [platform.claude.com/docs/en/build-with-claude/batch-processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)

**Key parameters:**
- Up to 10,000 requests per batch
- Results available within 24 hours; most batches complete in under 1 hour
- 50% discount on both input and output tokens, stacks with prompt caching

**Concrete pricing for prompt enhancement (Haiku 4.5):**

| Mode | Input | Output |
|---|---|---|
| Standard | $1.00/MTok | $5.00/MTok |
| Batch only | $0.50/MTok | $2.50/MTok |
| Batch + cache read | $0.05/MTok | $2.50/MTok |

A 500-token enhancement call on Haiku with batch + cache: ~$0.000025. At 10,000 calls, that is $0.25 vs $5.00 standard-rate uncached — 20x reduction.

**Implementation pattern for this project:**

```typescript
// Collect deferred asset requests into a batch queue
const batchRequests = assetQueue.map(req => ({
  custom_id: req.requestId,
  params: {
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: req.brief }]
  }
}));

const batch = await anthropic.beta.messages.batches.create({ requests: batchRequests });
// Poll: await anthropic.beta.messages.batches.retrieve(batch.id)
// Results expire after 29 days
```

**Caveat:** Batch API is not eligible for Anthropic's Zero Data Retention policy. If a user has ZDR requirements, use standard API.

---

## OpenAI Batch API

**Official docs:** [developers.openai.com/api/docs/guides/batch](https://developers.openai.com/api/docs/guides/batch)

**Key parameters:**
- Up to 50,000 requests per batch; 200 MB file size limit
- Completion window: 24 hours (non-configurable)
- 50% cost discount on all supported endpoints
- Does NOT consume standard rate limit tokens (separate pool)

**Critically for this project: `/v1/images/generations` and `/v1/images/edits` are explicitly supported endpoints.** This means gpt-image-1 generation can be batched.

**gpt-image-1 batch pricing:**
- Standard: ~$0.04/image (1024×1024, standard quality)
- Batch: ~$0.02/image

For an icon pack of 20 variants at batch price: $0.40 vs $0.80. At scale (1,000 icon packs/month): $400 vs $800.

**Implementation:**
```jsonl
{"custom_id": "req-001", "method": "POST", "url": "/v1/images/generations",
 "body": {"model": "gpt-image-1", "prompt": "...", "n": 1,
          "size": "1024x1024", "background": "transparent"}}
```

Upload as JSONL to the Files API, then create the batch:
```python
batch = client.batches.create(
    input_file_id=file.id,
    endpoint="/v1/images/generations",
    completion_window="24h"
)
```

---

## Where Batch Mode Fits in the Asset Pipeline

| Pipeline step | Batch viable? | Notes |
|---|---|---|
| `asset_enhance_prompt` | Yes (Anthropic batch) | Queue enhancement requests, process overnight |
| `asset_generate_*` (api mode) | Yes (OpenAI batch) | Icon packs, bulk favicons, pre-warmed OG images |
| `asset_validate` | Yes (Anthropic batch) | Run OCR + quality checks asynchronously |
| `asset_remove_background` | No (third-party API) | BiRefNet/BRIA has no batch endpoint |
| Interactive `inline_svg` | No | User is waiting synchronously |

**Recommended architecture:** Keep the interactive path synchronous. Introduce a batch queue for: (a) `asset_generate_app_icon` when generating a full AppIconSet (multiple sizes), (b) offline validation/QA passes over previously generated assets, (c) pre-generating common brand assets during off-peak hours.

---

## Caveats

- 24-hour window means batch mode is incompatible with the current interactive MCP tool flow. It requires a separate async pipeline with a queue, a worker, and a notification mechanism.
- OpenAI batch results are delivered as a JSONL file — the image data comes back as base64 or a URL, requiring a second download step.
- Anthropic batch has no streaming; you poll the batch status until completion.

**Sources:**
- [Anthropic Batch Processing Docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI Batch API Docs](https://developers.openai.com/api/docs/guides/batch)
- [Save 50% on OpenAI API Costs Using Batch Requests](https://engineering.miko.ai/save-50-on-openai-api-costs-using-batch-requests-6ad41214b4ac)
- [Anthropic Batches API Overview](https://www.anthropic.com/news/message-batches-api)
