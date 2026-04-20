import { readFileSync } from "node:fs";
import { tier0, tier1Alignment, tier2Vlm } from "../pipeline/validate.js";
import { safeReadPath } from "../security/paths.js";
import type { ValidateAssetInputT } from "../schemas.js";
import type { ValidationResult } from "../types.js";

export async function validateAsset(input: ValidateAssetInputT): Promise<ValidationResult> {
  const buf = readFileSync(safeReadPath(input.image));
  const result = await tier0({
    image: buf,
    asset_type: input.asset_type,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    ...(input.intended_text && { intended_text: input.intended_text }),
    transparency_required:
      input.asset_type === "logo" ||
      input.asset_type === "app_icon" ||
      input.asset_type === "transparent_mark" ||
      input.asset_type === "sticker" ||
      input.asset_type === "icon_pack"
  });

  if (input.run_vqa) {
    const promptForVqa = input.prompt ?? input.intended_text ?? "";
    if (promptForVqa.length === 0) {
      result.warnings.push(
        "tier-1 VQAScore skipped — no `prompt` or `intended_text` provided to align against."
      );
    } else {
      const vqa = await tier1Alignment(buf, input.asset_type, promptForVqa);
      if (!vqa.ran) {
        result.warnings.push(
          "tier-1 VQAScore skipped — PROMPT_TO_BUNDLE_VQA_URL not set. Point it at a VLM endpoint that accepts `{ image_base64, prompt, asset_type }` and returns `{ score: 0..1, notes? }`. See docs/research/27-agent-evaluation-frameworks/27b-image-generation-eval-pipelines.md."
        );
      } else if (vqa.error) {
        result.warnings.push(`tier-1 VQAScore error: ${vqa.error}`);
      } else {
        const t1: Record<string, number | string | boolean> = { ran: true };
        if (vqa.score !== undefined) t1["score"] = vqa.score;
        if (vqa.notes && vqa.notes.length > 0) t1["notes"] = vqa.notes.join(" | ");
        result.tier1 = t1;
        if (vqa.score !== undefined && vqa.score < 0.5) {
          result.warnings.push(
            `VQAScore ${vqa.score.toFixed(2)} < 0.5 — output does not clearly satisfy the prompt.`
          );
        }
      }
    }
  }

  if (input.run_vlm) {
    const vlm = await tier2Vlm(buf, input.asset_type, {
      ...(input.intended_text && { intended_text: input.intended_text }),
      ...(input.brand_bundle?.palette?.[0] && { brand_primary: input.brand_bundle.palette[0] })
    });
    if (!vlm.ran) {
      result.warnings.push(
        "tier-2 VLM-as-judge skipped — PROMPT_TO_BUNDLE_VLM_URL not set. Point it at a VLM endpoint that accepts `{ image_base64, asset_type, intended_text?, brand_primary? }` and returns `{ pass, score?, notes? }`."
      );
    } else if (vlm.error) {
      result.warnings.push(`tier-2 VLM-as-judge error: ${vlm.error}`);
    } else {
      const t2: Record<string, boolean | number | string> = { ran: true };
      if (vlm.pass !== undefined) t2["pass"] = vlm.pass;
      if (vlm.score !== undefined) t2["score"] = vlm.score;
      if (vlm.notes && vlm.notes.length > 0) {
        t2["notes"] = vlm.notes.join(" | ");
        for (const note of vlm.notes) result.warnings.push(`VLM: ${note}`);
      }
      result.tier2 = t2;
      if (vlm.pass === false) {
        result.pass = false;
      }
    }
  }

  return result;
}
