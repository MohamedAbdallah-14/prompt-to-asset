# 33e — Async Race with Validation

**Focus:** Fire multiple model calls in parallel, return the first result that passes validation. fal.ai queue mechanics, Promise.race patterns, cancellation, and cost control.

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

For OpenRouter: model fallbacks are sequential by default. OpenRouter does not expose a true parallel-race API — you must issue concurrent requests yourself and use the `models[]` array only for sequential fallback.

---

## Validation as the Race Gate

The race only works if validation is fast enough to not negate the parallelism benefit. Validation tiers:

**Tier 0 — deterministic (< 1s):** Dimension check, alpha channel, FFT checkerboard. Implemented locally with sharp/pngcheck/pillow. This should always run first — it costs nothing and immediately disqualifies clearly broken outputs.

**Tier 1 — VLM judge (1–5s):** Only run if tier 0 passes. This is the expensive gate. For a race with N=3 models where tier 0 takes 0.5s and tier 1 takes 3s, total gate latency before returning a result is 3.5s. The parallelism benefit is only realized if generation takes longer than 3.5s — which it does for most diffusion models (8–30s typical).

**Avoid:** Running OCR + Levenshtein wordmark check synchronously in the validation gate during a race. OCR adds 2–5s latency. Run it as a post-race async check and surface warnings in the AssetBundle rather than blocking the race.

---

## Mixture-of-Experts Application

A more sophisticated variant: route different asset sub-types to domain-specialized models in parallel, then merge results. Example for a full app icon bundle:

- **Mark generation:** `recraft-v3` (vector specialist)
- **Background fill / color palette:** `flux-pro` (photorealistic scene specialist)
- **Composite + platform export:** deterministic pipeline

These three steps are partially parallelizable: start `recraft-v3` and `flux-pro` in parallel; merge when both complete. This is not a race (you need both results) but a parallel async dependency graph — the standard `Promise.all` / `asyncio.gather` pattern.

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
- https://fal.ai/learn/devs/gen-ai-performance-optimization
- https://openrouter.ai/docs/guides/routing/model-fallbacks
- https://openrouter.ai/docs/guides/features/model-routing
- https://www.geeksforgeeks.org/system-design/how-to-fix-a-race-condition-in-an-async-architecture/
- https://fal.ai/docs/examples/video-generation/deploy-multi-gpu-inference
