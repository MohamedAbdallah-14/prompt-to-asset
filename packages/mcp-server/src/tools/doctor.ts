// Tool: asset_doctor
//
// Structured environment inventory — MCP-callable equivalent of `p2a doctor`.
//
// Returns native-dependency status, provider keys (grouped by free / paid /
// paste-only), pipeline extension URLs, modes available right now, and a
// concrete "what to try next" suggestion the LLM can relay to the user.
//
// Overlaps slightly with asset_capabilities but is not a duplicate:
//  - asset_capabilities reports what the server CAN run (capability matrix).
//  - asset_doctor reports what the local MACHINE is configured to run (keys,
//    binaries, node modules). CLI users ran `p2a doctor` for this — now LLMs
//    in MCP hosts get the same data without shelling out.
//
// Read-only. No network. Cheap to call on every onboarding question.

import { execFileSync } from "node:child_process";
import type { DoctorInputT } from "../schemas.js";
import { PASTE_ONLY_PROVIDERS } from "../providers/index.js";
import { detectApiAvailability } from "../modes.js";
import { loadSharp } from "../pipeline/sharp.js";
import { checkDataIntegrity, type DataIntegrityReport } from "../data-integrity.js";
import { autoFix, type AutoFixReport } from "./doctor-fix.js";

export interface DoctorResult {
  runtime: {
    node: string;
    platform: string;
    arch: string;
  };
  native_dependencies: {
    sharp: { installed: boolean; note: string };
    vtracer: { installed: boolean; path: string | null };
    potrace: { installed: boolean; path: string | null };
    "png-to-ico": { installed: boolean };
    satori: { installed: boolean };
    "resvg-js": { installed: boolean };
    "tesseract.js": { installed: boolean };
    svgo: { installed: boolean };
  };
  free_tier_routes: Array<{
    rank: number;
    id: string;
    live: boolean;
    note: string;
  }>;
  paid_providers: Array<{
    id: string;
    key_set: boolean;
    note: string;
  }>;
  paste_only_providers: Array<{
    id: string;
    note: string;
  }>;
  pipeline_urls: {
    PROMPT_TO_BUNDLE_RMBG_URL: boolean;
    PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL: boolean;
    PROMPT_TO_BUNDLE_UPSCALER_URL: boolean;
    PROMPT_TO_BUNDLE_VLM_URL: boolean;
  };
  modes_available: {
    inline_svg: boolean;
    external_prompt_only: boolean;
    api_free: boolean;
    api_paid: boolean;
  };
  what_to_try_next: string[];
  data_integrity?: DataIntegrityReport;
  auto_fix?: AutoFixReport;
}

export async function doctor(input: DoctorInputT): Promise<DoctorResult> {
  // Use the live detector (reads process.env each call) rather than the
  // snapshotted CONFIG-backed providerAvailability(). The difference matters
  // when keys are set after process start (e.g. tests, or the user does
  // `export GEMINI_API_KEY=...` then runs p2a doctor without restarting).
  const avail = detectApiAvailability();

  // Runtime
  const runtime = {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  };

  // Native deps — run all checks in parallel to keep this snappy.
  const [sharpMod, pngToIcoOk, satoriOk, resvgOk, tesseractOk, svgoOk, vtracerPath, potracePath] =
    await Promise.all([
      loadSharp(),
      hasNodeModule("png-to-ico"),
      hasNodeModule("satori"),
      hasNodeModule("@resvg/resvg-js"),
      hasNodeModule("tesseract.js"),
      hasNodeModule("svgo"),
      Promise.resolve(findBinary("vtracer")),
      Promise.resolve(findBinary("potrace"))
    ]);

  const native_dependencies = {
    sharp: {
      installed: Boolean(sharpMod),
      note: sharpMod ? "ok" : "MISSING (needed for fan-out / OG rendering)"
    },
    vtracer: { installed: vtracerPath !== null, path: vtracerPath },
    potrace: { installed: potracePath !== null, path: potracePath },
    "png-to-ico": { installed: pngToIcoOk },
    satori: { installed: satoriOk },
    "resvg-js": { installed: resvgOk },
    "tesseract.js": { installed: tesseractOk },
    svgo: { installed: svgoOk }
  };

  // Free-tier routes, ranked best-first (same order as CLI doctor).
  // NOTE 2026-04-26: public Gemini API pricing lists no free image-output
  // tier for Imagen 4 or Nano Banana. Google AI Studio remains a free
  // interactive paste-only route; programmatic free CLI generation should start
  // with Cloudflare, NVIDIA NIM, HF, Horde, then Pollinations as last resort.
  const freeRanked: Array<{ rank: number; id: string; live: boolean; note: string }> = [
    {
      rank: 1,
      id: "cloudflare",
      live: Boolean(avail["cloudflare"]),
      note: "Cloudflare Workers AI — Flux-1-Schnell + SDXL, 10k neurons/day free. Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID."
    },
    {
      rank: 2,
      id: "nvidia-nim",
      live: Boolean(avail["nvidia"]),
      note: "NVIDIA NIM — Flux.1-dev / Flux.2-klein / SDXL Turbo / SD 3.5 Large / SANA, 1k requests/month free. NVIDIA_API_KEY, no credit card."
    },
    {
      rank: 3,
      id: "huggingface",
      live: Boolean(avail["huggingface"]),
      note: "HF Inference — hosted SD/SDXL/Flux-schnell on a free read token. HF_TOKEN, no credit card."
    },
    {
      rank: 4,
      id: "stable-horde",
      live: Boolean(avail.horde),
      note: "Stable Horde — community GPUs, anonymous queue can be long."
    },
    {
      rank: 5,
      id: "pollinations",
      live: Boolean(avail["pollinations"]),
      note: "Pollinations — zero signup, rate-limited (~1 req/15s anonymous). Last resort: silent model swaps and variable quality."
    }
  ];

  // Paid direct APIs — iterate a known list so we get stable output even
  // when the ApiAvailability shape gains new fields.
  const paid: DoctorResult["paid_providers"] = [
    { id: "openai", key_set: avail.openai, note: paidHint("openai") },
    { id: "google", key_set: Boolean(avail["google"]), note: paidHint("google") },
    { id: "ideogram", key_set: avail.ideogram, note: paidHint("ideogram") },
    { id: "recraft", key_set: avail.recraft, note: paidHint("recraft") },
    { id: "flux", key_set: avail.flux, note: paidHint("flux") },
    { id: "stability", key_set: avail.stability, note: paidHint("stability") },
    { id: "leonardo", key_set: avail.leonardo, note: paidHint("leonardo") },
    { id: "fal", key_set: avail.fal, note: paidHint("fal") },
    { id: "freepik", key_set: Boolean(avail["freepik"]), note: paidHint("freepik") },
    { id: "pixazo", key_set: Boolean(avail["pixazo"]), note: paidHint("pixazo") },
    { id: "replicate", key_set: avail.replicate, note: paidHint("replicate") },
    { id: "comfyui", key_set: avail.comfyui, note: paidHint("comfyui") }
  ];

  const paste_only_providers = PASTE_ONLY_PROVIDERS.map((name) => ({
    id: name,
    note: pasteHint(name)
  }));

  const pipeline_urls = {
    PROMPT_TO_BUNDLE_RMBG_URL: Boolean(process.env["PROMPT_TO_BUNDLE_RMBG_URL"]),
    PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL: Boolean(
      process.env["PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL"]
    ),
    PROMPT_TO_BUNDLE_UPSCALER_URL: Boolean(process.env["PROMPT_TO_BUNDLE_UPSCALER_URL"]),
    PROMPT_TO_BUNDLE_VLM_URL: Boolean(process.env["PROMPT_TO_BUNDLE_VLM_URL"])
  };

  const anyPaid = paid.some((p) => p.key_set);
  // Google is intentionally excluded from the free-route count: as of
  // 2026-04-21 its image API has no free tier (see note above freeRanked).
  // An unbilled GEMINI_API_KEY returns 429 with limit:0, so treating it as
  // "live free" misleads the host LLM into picking a route that cannot run.
  const anyFree = Boolean(
    avail.huggingface || avail.cloudflare || avail["nvidia"] || avail.pollinations || avail.horde
  );

  const modes_available = {
    inline_svg: true,
    external_prompt_only: true,
    api_free: anyFree,
    api_paid: anyPaid
  };

  // "What to try next" — same logic as the CLI, but as an array of strings so
  // the LLM can surface the most relevant one to the user without reformatting.
  const what_to_try_next: string[] = [];
  if (!anyPaid && !anyFree) {
    what_to_try_next.push(
      "No free or paid API routes are live. Zero-key paths still work: ask the LLM for `inline_svg mode` on a logo/favicon/icon, or use `external_prompt_only` to paste into https://aistudio.google.com (free web UI) and then call asset_ingest_external."
    );
    what_to_try_next.push(
      "For a free programmatic route, the best single unlock is Cloudflare Workers AI: sign up at https://dash.cloudflare.com → Workers AI → create an API token, then `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...`. Flux-1-Schnell, 10k neurons/day free, no credit card."
    );
  } else if (!anyPaid) {
    what_to_try_next.push(
      "Fully operational on free tier. Ask the LLM: `generate a favicon for my app, inline_svg mode`."
    );
    if (!avail.cloudflare) {
      what_to_try_next.push(
        "For hero/illustration output, Cloudflare Workers AI is the best free programmatic route (Flux-1-Schnell, 10k neurons/day). Set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID from https://dash.cloudflare.com."
      );
    }
    if (avail["google"]) {
      what_to_try_next.push(
        "GEMINI_API_KEY is set, but Google image output is paid API usage. Enable billing for Imagen 4 or Nano Banana, or keep Google as paste-only via AI Studio web UI (https://aistudio.google.com) → asset_ingest_external."
      );
    }
  } else {
    what_to_try_next.push(
      "At least one paid key is configured. Default to `inline_svg` for logos/icons to keep cost at zero; reserve `api` mode for illustration/hero where diffusion adds real value."
    );
    what_to_try_next.push(
      "Set `P2A_MAX_SPEND_USD_PER_RUN` in your shell to cap single-call spend."
    );
  }

  const result: DoctorResult = {
    runtime,
    native_dependencies,
    free_tier_routes: freeRanked,
    paid_providers: paid,
    paste_only_providers,
    pipeline_urls,
    modes_available,
    what_to_try_next
  };

  if (input.check_data) {
    result.data_integrity = checkDataIntegrity();
  }

  if (input.auto_fix) {
    result.auto_fix = await autoFix({ dry_run: input.auto_fix_dry_run ?? false });
  }

  return result;
}

function paidHint(name: string): string {
  switch (name) {
    case "openai":
      return "gpt-image-1 / gpt-image-1.5 / dall-e-3 — best transparent PNG + text rendering";
    case "google":
      return "Gemini 3 Flash Image (Nano Banana / Nano Banana 2) / Nano Banana Pro / Imagen 4 — paid API image output. Paid: Nano Banana $0.039, Nano Banana 2 $0.067-$0.151 (1K-4K), Nano Banana Pro $0.134-$0.24 (1K-4K), Imagen 4 Fast/Standard/Ultra $0.02/$0.04/$0.06. AI Studio web UI (https://aistudio.google.com) is free but paste-only.";
    case "ideogram":
      return "Ideogram 3 / 3 Turbo — best-in-class wordmark rendering";
    case "recraft":
      return "Recraft V3 — native SVG output, brand style_id";
    case "flux":
    case "bfl":
      return "Flux Pro / Flux.2 / Kontext — photoreal hero art, multi-ref brand lock";
    case "stability":
      return "SDXL / SD3 Large / Playground v3 — open-weight hosted";
    case "leonardo":
      return "Phoenix 1.0 + SDXL presets";
    case "fal":
      return "fal.ai aggregator — alt path for Flux and SDXL";
    case "freepik":
      return "Freepik — Mystic / Flux / native icon SVG / remove-background. 5 EUR free trial, no credit card.";
    case "pixazo":
      return "Pixazo — free tier exists but Appy Pie LLP claims output ownership on free-tier generations; paid tier transfers ownership.";
    case "replicate":
      return "Replicate aggregator — Flux 1.1 Pro, Recraft V3, Ideogram V3, SDXL behind one key";
    case "comfyui":
      return "User-owned ComfyUI (Modal / Runpod / self-host) — unlocks brand-LoRA";
    default:
      return "";
  }
}

function pasteHint(name: string): string {
  switch (name) {
    case "midjourney":
      return "https://www.midjourney.com/app — Discord or web UI only";
    case "adobe":
      return "https://firefly.adobe.com — commercial indemnity; enterprise IMS OAuth only";
    case "krea":
      return "https://www.krea.ai — realtime canvas; no stable API";
    case "google-aistudio":
      return "https://aistudio.google.com — free interactive UI for Gemini/Imagen image-gen. Download the PNG, then call asset_ingest_external.";
    default:
      return "";
  }
}

function findBinary(bin: string): string | null {
  const looker = process.platform === "win32" ? "where" : "which";
  try {
    const result = execFileSync(looker, [bin], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .split(/\r?\n/)[0];
    return result && result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

async function hasNodeModule(mod: string): Promise<boolean> {
  try {
    await import(mod);
    return true;
  } catch {
    return false;
  }
}
