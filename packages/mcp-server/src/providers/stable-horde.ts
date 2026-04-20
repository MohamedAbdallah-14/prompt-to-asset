import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Stable Horde — distributed community GPU cluster.
 *
 * Anonymous usage is free (queue-based kudos system); users with an API key
 * get priority. Queue times vary from seconds (popular models) to minutes.
 * Apikey 0000000000 = anonymous bucket.
 *
 * See: https://aihorde.net/api/
 */
export const StableHordeProvider: Provider = {
  name: "stable-horde",

  supportsModel(modelId: string): boolean {
    return ["horde-sdxl", "horde-sd-1.5", "horde-flux"].includes(modelId);
  },

  isAvailable(): boolean {
    // Stable Horde works anonymously — it's free but queued. Always available.
    return process.env["HORDE_DISABLED"] !== "1";
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (process.env["HORDE_DISABLED"] === "1") {
      if (process.env["PROMPT_TO_BUNDLE_DRY_RUN"] === "1") {
        return {
          image: dummyPng(req.width, req.height),
          format: "png",
          model: modelId,
          seed: req.seed,
          native_rgba: false,
          native_svg: false,
          raw_response: { dry_run: true, prompt: req.prompt }
        };
      }
      throw new ProviderError(
        "stable-horde",
        modelId,
        "Stable Horde disabled via HORDE_DISABLED=1. Unset or pick a different model."
      );
    }

    const apikey = process.env["HORDE_API_KEY"] || "0000000000"; // anonymous bucket
    const hordeModel = hordeModelName(modelId);

    const createResp = await fetch("https://aihorde.net/api/v2/generate/async", {
      method: "POST",
      headers: {
        apikey,
        "Content-Type": "application/json",
        "Client-Agent": "prompt-to-asset:0.1:https://github.com/MohamedAbdallah-14/prompt-to-asset"
      },
      body: JSON.stringify({
        prompt: req.prompt,
        params: {
          width: Math.min(1024, req.width),
          height: Math.min(1024, req.height),
          steps: 30,
          cfg_scale: 7,
          sampler_name: "k_euler_a",
          seed: String(req.seed),
          ...(req.negative_prompt && { negative_prompt: req.negative_prompt })
        },
        models: [hordeModel],
        nsfw: false,
        trusted_workers: true
      })
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      throw new ProviderError("stable-horde", modelId, `HTTP ${createResp.status}: ${errText}`);
    }

    const createJson = (await createResp.json()) as { id?: string };
    const id = createJson.id;
    if (!id) throw new ProviderError("stable-horde", modelId, "no id in create response");

    // Poll — queue times vary; cap at 5 minutes for interactive UX.
    let imageUrl: string | null = null;
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const check = await fetch(
        `https://aihorde.net/api/v2/generate/status/${encodeURIComponent(id)}`,
        { headers: { apikey } }
      );
      if (!check.ok) continue;
      const cj = (await check.json()) as {
        done?: boolean;
        faulted?: boolean;
        generations?: Array<{ img?: string }>;
      };
      if (cj.faulted) {
        throw new ProviderError("stable-horde", modelId, "generation faulted on the horde");
      }
      if (cj.done && cj.generations?.[0]?.img) {
        imageUrl = cj.generations[0].img;
        break;
      }
    }
    if (!imageUrl) {
      throw new ProviderError(
        "stable-horde",
        modelId,
        "timed out waiting for the horde (anonymous queue can exceed 5 min — retry with HORDE_API_KEY for priority)"
      );
    }

    // The horde returns either a data: URL or an r2 HTTPS URL
    let image: Buffer;
    if (imageUrl.startsWith("data:")) {
      const b64 = imageUrl.split(",", 2)[1] ?? "";
      image = Buffer.from(b64, "base64");
    } else {
      const imgResp = await fetch(imageUrl);
      image = Buffer.from(await imgResp.arrayBuffer());
    }

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: { horde_id: id },
      native_rgba: false,
      native_svg: false
    };
  }
};

function hordeModelName(modelId: string): string {
  const map: Record<string, string> = {
    "horde-sdxl": "SDXL 1.0",
    "horde-sd-1.5": "stable_diffusion",
    "horde-flux": "Flux.1-Schnell fp8 (Compact)"
  };
  return map[modelId] ?? map["horde-sdxl"]!;
}
