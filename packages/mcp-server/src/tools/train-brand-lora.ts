import { readFileSync } from "node:fs";
import { safeReadPath } from "../security/paths.js";
import type { TrainBrandLoraInputT } from "../schemas.js";

/**
 * Tool: asset_train_brand_lora
 *
 * Posts a small training set (20-50 brand-consistent images) to a user-owned
 * LoRA training endpoint (Modal / Runpod / fly.io / self-host) and returns
 * a LoRA id the downstream `comfyui-*` / `sdxl` providers can reference.
 *
 * Like `comfyui.ts`, we don't bundle the trainer — the user owns the
 * deployment. This tool is scaffolding so the rest of the pipeline has a
 * clean `lora` field on GenerateRequest.
 *
 * Endpoint contract:
 *   POST $PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL
 *     body: {
 *       name: string,                    // brand slug
 *       base_model: string,              // "sdxl-1.0" | "flux-1-dev" | …
 *       training_images: string[],       // base64-encoded PNG/JPEG
 *       rank?: number,                   // LoRA rank, default 16
 *       steps?: number,                  // training steps, default 1200
 *       captions?: string[]              // per-image caption overrides
 *     }
 *     response 200: { lora_id: string, status: "ready"|"training", lora_url?: string }
 *     response !200: plain text error (surfaced as Error)
 *
 * Research basis:
 *   - docs/research/06-stable-diffusion-flux/6d-lora-training-for-brand-style.md
 *   - docs/research/15-style-consistency-brand/ (full set)
 *   - docs/research/23-combinations/09-comfyui-native.md
 *
 * This is a Phase-4 scaffold. It works end-to-end when the endpoint exists,
 * and returns a clear error with pointer docs when the env var is unset.
 */
export async function trainBrandLora(input: TrainBrandLoraInputT): Promise<{
  ok: boolean;
  lora_id?: string;
  status?: "ready" | "training";
  lora_url?: string;
  error?: string;
  warnings: string[];
}> {
  const url = process.env["PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL"];
  if (!url) {
    return {
      ok: false,
      error:
        "PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL not set. Point it at a LoRA-training endpoint. Reference implementations: Modal + ai-toolkit (https://modal.com/docs/examples/flux_lora), Replicate replicate/flux-dev-lora-trainer. See docs/research/06-stable-diffusion-flux/6d-lora-training-for-brand-style.md.",
      warnings: []
    };
  }
  const token = process.env["PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_TOKEN"];

  const warnings: string[] = [];
  if (input.training_images.length < 15) {
    warnings.push(
      `only ${input.training_images.length} training images provided — LoRA quality degrades below ~20. Research suggests 20-50 curated shots.`
    );
  }
  if (input.training_images.length > 100) {
    warnings.push(
      `${input.training_images.length} training images — training cost scales linearly; consider curating to <=50 representative shots.`
    );
  }

  // Each path goes through safeReadPath so a crafted MCP input can't read
  // outside the project's allow-list. Base64 payload stays local until POST.
  const imagesBase64: string[] = [];
  for (const p of input.training_images) {
    const buf = readFileSync(safeReadPath(p));
    imagesBase64.push(buf.toString("base64"));
  }

  const body: Record<string, unknown> = {
    name: input.name,
    base_model: input.base_model,
    training_images: imagesBase64,
    rank: input.rank ?? 16,
    steps: input.steps ?? 1200
  };
  if (input.captions && input.captions.length > 0) body["captions"] = input.captions;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600_000)
    });
  } catch (err) {
    return { ok: false, error: `fetch failed: ${(err as Error).message}`, warnings };
  }

  if (!resp.ok) {
    const errText = await resp.text();
    return { ok: false, error: `HTTP ${resp.status}: ${errText.slice(0, 400)}`, warnings };
  }

  const json = (await resp.json()) as {
    lora_id?: string;
    status?: "ready" | "training";
    lora_url?: string;
  };
  if (!json.lora_id) {
    return { ok: false, error: "training endpoint did not return lora_id", warnings };
  }

  return {
    ok: true,
    lora_id: json.lora_id,
    status: json.status ?? "training",
    ...(json.lora_url && { lora_url: json.lora_url }),
    warnings
  };
}
