#!/usr/bin/env node
/**
 * Annotate data/model-registry.json with cost_hint fields. One-shot migration.
 * Sources:
 *   - OpenAI: platform.openai.com/docs/pricing (gpt-image-1 $0.040/sq image).
 *   - Google: ai.google.dev/pricing (Imagen/Gemini Flash Image tiers).
 *   - BFL: docs.bfl.ai (Flux Pro / 2 / Schnell / Dev per-image).
 *   - Ideogram: ideogram.ai/api (turbo $0.03/img, full $0.06).
 *   - Recraft: recraft.ai/pricing ($0.04/img SVG/PNG).
 *   - Cloudflare: developers.cloudflare.com/workers-ai/pricing (neurons).
 *   - Replicate: per-run rates from each model page.
 *   - Stable Horde / Pollinations / HF: free with rate limits.
 * Numbers reflect published rates at the time of this migration; refresh if
 * providers change pricing (treat as human-readable hints, not billing truth).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const path = resolve(here, "..", "data", "model-registry.json");
const registry = JSON.parse(readFileSync(path, "utf-8"));

const HINTS = {
  "gpt-image-1": "$0.04/img (low quality) — up to $0.19 (high)",
  "gpt-image-1.5": "$0.04–0.19/img (parity with 1.0)",
  "dall-e-3": "$0.04/img (1024²) — deprecated 2026-05-12",
  "imagen-3": "$0.03/img (Vertex AI). No free API tier as of 2025-12.",
  "imagen-4":
    "$0.04/img paid; Imagen 4 Fast $0.02/img. No free API tier as of 2025-12; AI Studio web UI free for interactive use.",
  "gemini-3-flash-image":
    "No free API tier as of 2025-12; $0.039/img (Nano Banana). AI Studio web UI is free for interactive use.",
  "gemini-3-pro-image":
    "No free API tier as of 2025-12; Nano Banana 2 $0.067/img (1K), $0.101 (2K), $0.151 (4K). AI Studio web UI free for interactive use.",
  "sd-1.5": "$0.01/img (Stability Core)",
  sdxl: "$0.04/img (Stability Core)",
  "sd3-large": "$0.065/img (Stability SD3)",
  "flux-schnell": "$0.003/img (BFL)",
  "flux-dev": "$0.025/img (BFL, non-commercial)",
  "flux-pro": "$0.04/img (BFL Pro 1.1)",
  "flux-2": "$0.05/img (BFL Flux.2)",
  "flux-kontext-pro": "$0.04/edit (BFL Kontext)",
  "midjourney-v6": "paste-only — subscription, no per-call cost",
  "midjourney-v7": "paste-only — subscription, no per-call cost",
  "ideogram-3": "$0.06/img (direct API)",
  "ideogram-3-turbo": "$0.03/img direct; free: 10/wk on web (watermark)",
  "recraft-v3": "$0.04/img (direct)",
  "playground-v3": "$0.04/img (Stability Core passthrough)",
  "leonardo-phoenix": "free: 150 tokens/day; then metered",
  "leonardo-diffusion-xl": "free: 150 tokens/day; then metered",
  "krea-image-1": "paste-only — no public API",
  "firefly-3": "paste-only in core — enterprise Firefly API is billed per-credit",
  "fal-flux-pro": "$0.05/img (fal.ai)",
  "fal-flux-2": "$0.06/img (fal.ai)",
  "fal-sdxl": "$0.005/img (fal.ai fast-sdxl)",
  "pollinations-flux": "free, zero-signup — ~1 req/15s anonymous",
  "pollinations-turbo": "free, zero-signup — fastest Pollinations preset",
  "pollinations-kontext": "free, zero-signup — edit endpoint",
  "pollinations-sd": "free, zero-signup — SD 1.5 preset",
  "horde-sdxl": "free — anonymous kudos queue",
  "horde-flux": "free — anonymous kudos queue",
  "hf-sdxl": "free with HF_TOKEN — rate-limited",
  "hf-sd3": "free with HF_TOKEN — rate-limited",
  "hf-flux-schnell": "free with HF_TOKEN — rate-limited",
  "hf-flux-dev": "free with HF_TOKEN — rate-limited (non-commercial)",
  "cf-flux-1-schnell": "~11 neurons/img (free: 10k neurons/day)",
  "cf-flux-2-klein-4b": "~8 neurons/img (free: 10k/day)",
  "cf-flux-2-klein-9b": "~12 neurons/img (free: 10k/day)",
  "cf-flux-2-dev": "~24 neurons/img (free: 10k/day)",
  "cf-sdxl": "~6 neurons/img (free: 10k/day)",
  "cf-sdxl-lightning": "~2 neurons/img (free: 10k/day — cheapest CF option)",
  "cf-dreamshaper-8-lcm": "~3 neurons/img (free: 10k/day)",
  "cf-leonardo-phoenix": "~10 neurons/img (free: 10k/day)",
  "cf-leonardo-lucid-origin": "~10 neurons/img (free: 10k/day)",
  "replicate-flux-1.1-pro": "$0.04/run (Replicate markup on BFL)",
  "replicate-flux-schnell": "$0.003/run",
  "replicate-flux-dev": "$0.025/run (non-commercial)",
  "replicate-sdxl": "~$0.00725/run",
  "replicate-sd3": "$0.035/run",
  "replicate-recraft-v3": "$0.04/run (Recraft passthrough)",
  "replicate-ideogram-3": "$0.08/run (Ideogram passthrough)"
};

let added = 0;
let skipped = 0;
for (const m of registry.models) {
  if (HINTS[m.id] && !m.cost_hint) {
    m.cost_hint = HINTS[m.id];
    added++;
  } else if (m.cost_hint) {
    skipped++;
  }
}

writeFileSync(path, JSON.stringify(registry, null, 2) + "\n");
process.stdout.write(`added cost_hint to ${added} models; ${skipped} already had one.\n`);
