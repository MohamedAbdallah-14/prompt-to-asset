import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tier0, tier2Vlm } from "../pipeline/validate.js";
import type { ValidateAssetInputT } from "../schemas.js";
import type { ValidationResult } from "../types.js";

export async function validateAsset(input: ValidateAssetInputT): Promise<ValidationResult> {
  const buf = readFileSync(resolve(input.image));
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
