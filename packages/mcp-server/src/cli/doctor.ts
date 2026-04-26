// `p2a doctor` — inventory of what's available in the current environment.
//
// Read-only. Mirrors what asset_capabilities() reports over MCP, but surfaces
// it as human-readable text for users who haven't wired the server into an IDE
// yet. Useful first command during onboarding.
//
// We bucket providers into three groups so the output is self-explanatory:
//   1. Free-tier / zero-key — Cloudflare Workers AI (Flux-1-Schnell on 10k
//      neurons/day), Hugging Face Inference (free token), Pollinations (zero
//      signup), Stable Horde (anonymous queue). Google removed Gemini/Imagen
//      image-gen from the free API tier in Dec 2025; AI Studio web UI is still
//      free for interactive use (paste-only).
//   2. Paid direct APIs — OpenAI, Google (Gemini/Imagen image-gen — now paid
//      only), Ideogram, Recraft, BFL, Stability, Leonardo, fal.ai. Provide a
//      real key, generate directly.
//   3. Paste-only — Midjourney, Adobe Firefly, Krea, Google AI Studio web UI.
//      No programmatic API (or no free API); asset_enhance_prompt +
//      asset_ingest_external handles the round trip.

import {
  providerAvailability,
  PASTE_ONLY_PROVIDERS,
  FREE_TIER_PROVIDERS
} from "../providers/index.js";
import { loadSharp } from "../pipeline/sharp.js";
import { checkDataIntegrity } from "../data-integrity.js";
import { execFileSync } from "node:child_process";
import { doctor } from "../tools/doctor.js";
import { autoFix } from "../tools/doctor-fix.js";

export async function doctorCommand(argv: string[] = []): Promise<void> {
  const dataOnly = argv.includes("--data");
  const asJson = argv.includes("--json");
  const fix = argv.includes("--fix");
  const dryRun = argv.includes("--dry-run");

  if (fix) {
    const report = await autoFix({ dry_run: dryRun });
    if (asJson) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
      process.exit(report.ok ? 0 : 1);
    }
    const lines: string[] = [];
    lines.push(`prompt-to-asset doctor --fix${dryRun ? " --dry-run" : ""}`);
    lines.push("");
    lines.push(`Platform: ${report.platform} ${report.arch}`);
    lines.push("");
    if (report.steps.length === 0 && report.manual_hints.length === 0) {
      lines.push("Nothing to install — all native binaries and optional modules present.");
    } else {
      if (report.steps.length > 0) {
        lines.push(dryRun ? "Planned steps (dry-run):" : "Ran:");
        for (const s of report.steps) {
          const tag = !s.ran ? "(planned)" : s.success ? "[ok]" : "[FAILED]";
          lines.push(`  ${tag}  ${s.command} ${s.args.join(" ")}`);
          lines.push(`          ${s.reason}`);
          if (s.output && !s.success) {
            lines.push(
              s.output
                .split("\n")
                .map((l: string) => `          │ ${l}`)
                .join("\n")
            );
          }
        }
        lines.push("");
      }
      if (report.manual_hints.length > 0) {
        lines.push("Run these yourself:");
        for (const h of report.manual_hints) lines.push(`  - ${h}`);
        lines.push("");
      }
      if (report.still_missing.length > 0) {
        lines.push(`Still missing: ${report.still_missing.join(", ")}`);
        lines.push("");
      }
    }
    process.stdout.write(lines.join("\n") + "\n");
    process.exit(report.ok ? 0 : 1);
  }

  // --json short-circuits the text-rendering path and calls the MCP tool
  // directly. Useful for scripts / CI / LLM-over-Bash.
  if (asJson) {
    const report = await doctor({ check_data: dataOnly });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (dataOnly && report.data_integrity && !report.data_integrity.ok) {
      process.exit(1);
    }
    return;
  }

  if (dataOnly) {
    const report = checkDataIntegrity();
    const lines: string[] = [];
    lines.push("prompt-to-asset doctor --data");
    lines.push("");
    lines.push("Data integrity (model-registry ↔ routing-table)");
    lines.push(`  status                      ${report.ok ? "ok" : "FAILED"}`);
    lines.push(`  models in registry          ${report.stats.models_in_registry}`);
    lines.push(`  routing rules               ${report.stats.routing_rules}`);
    lines.push(`  referenced by rules         ${report.stats.models_referenced_by_rules}`);
    lines.push(`  dangling rule references    ${report.stats.dangling_rule_refs}`);
    lines.push(`  orphan models               ${report.stats.orphan_models}`);
    lines.push("");
    if (report.errors.length > 0) {
      lines.push("Errors");
      for (const e of report.errors) lines.push(`  - ${e}`);
      lines.push("");
    }
    if (report.warnings.length > 0) {
      lines.push("Warnings");
      for (const w of report.warnings) lines.push(`  - ${w}`);
      lines.push("");
    }
    process.stdout.write(lines.join("\n") + "\n");
    process.exit(report.ok ? 0 : 1);
  }

  const lines: string[] = [];
  lines.push("prompt-to-asset doctor");
  lines.push("");

  lines.push("Runtime");
  lines.push(`  node         ${process.version}`);
  lines.push(`  platform     ${process.platform} ${process.arch}`);
  lines.push("");

  lines.push("Optional native dependencies");
  const sharp = await loadSharp();
  lines.push(
    `  sharp        ${sharp ? "installed" : "MISSING (needed for fan-out / OG rendering)"}`
  );
  lines.push(`  vtracer      ${hasBinary("vtracer")}`);
  lines.push(`  potrace      ${hasBinary("potrace")}`);
  lines.push(`  png-to-ico   ${await hasNodeModule("png-to-ico")}`);
  lines.push(`  satori       ${await hasNodeModule("satori")}`);
  lines.push(`  resvg-js     ${await hasNodeModule("@resvg/resvg-js")}`);
  lines.push(`  tesseract.js ${await hasNodeModule("tesseract.js")}`);
  lines.push(`  svgo         ${await hasNodeModule("svgo")}`);
  lines.push("");

  const avail = providerAvailability();

  // Free routes ranked by quality, cost, and friction. Best-first so a user
  // scanning the output picks the top live row and moves on. See
  // docs/research/23-combinations/05-free-tier.md for the justification.
  // NOTE 2026-04-21: Google removed Gemini/Imagen image-gen from its free API
  // tier in Dec 2025 — an unbilled GEMINI_API_KEY returns HTTP 429 with
  // limit:0 on image endpoints. Cloudflare is now rank 1; Google is listed
  // only under paste-only (AI Studio web UI remains free).
  lines.push("Free-tier / zero-key routes  (recommended starting point — $0, ranked best → worst)");
  const rankedFree: Array<{ key: string; rank: number; live: boolean; note: string }> = [
    {
      key: "cloudflare",
      rank: 1,
      live: avail["cloudflare"] ?? false,
      note: "Cloudflare Workers AI — Flux-1-Schnell + SDXL, 10k neurons/day free. Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID."
    },
    {
      key: "nvidia-nim",
      rank: 2,
      live: avail["nvidia"] ?? false,
      note: "NVIDIA NIM — Flux.1-dev / Flux.2-klein / SDXL Turbo / SD 3.5 Large / SANA at 4K, 1k requests/month free. NVIDIA_API_KEY (key prefix nvapi-), no credit card. Sign up at https://build.nvidia.com."
    },
    {
      key: "huggingface",
      rank: 3,
      live: avail["huggingface"] ?? false,
      note: "HF Inference — hosted SD/SDXL/Flux-schnell on a free read token. HF_TOKEN, no credit card."
    },
    {
      key: "stable-horde",
      rank: 4,
      live: avail["stable-horde"] ?? false,
      note: "Stable Horde — community GPUs, queue can be long. Anonymous or free API key."
    },
    {
      key: "pollinations",
      rank: 5,
      live: avail["pollinations"] ?? false,
      note: "Pollinations — zero signup but quality is poor. Verified 2026-04-26: silently serves SANA when you request Flux, downsizes 1024² to 768², logo output unusable. Last-resort only."
    }
  ];
  for (const r of rankedFree) {
    const state = r.live ? "on " : "off";
    lines.push(`  ${r.rank}. ${r.key.padEnd(13)} ${state}  ${r.note}`);
  }
  lines.push(
    "  +  local-comfyui  community MCP adapter (comfyui-mcp) — run your own GPU; out of scope here"
  );
  lines.push("");

  lines.push("Paid direct APIs  (api mode)");
  for (const [name, ok] of Object.entries(avail)) {
    if (FREE_TIER_PROVIDERS.includes(name)) continue;
    if (PASTE_ONLY_PROVIDERS.includes(name)) continue;
    lines.push(`  ${name.padEnd(14)} ${ok ? "set" : "unset"}  ${paidHint(name)}`);
  }
  lines.push("");

  lines.push("Paste-only providers  (external_prompt_only mode)");
  for (const name of PASTE_ONLY_PROVIDERS) {
    lines.push(`  ${name.padEnd(14)} paste  ${pasteHint(name)}`);
  }
  lines.push(
    `  ${"google-aistudio".padEnd(14)} paste  https://aistudio.google.com — free interactive UI for Gemini/Imagen image-gen (API free tier was removed 2025-12). Download the PNG, then call asset_ingest_external.`
  );
  lines.push("");

  lines.push("Pipeline extension URLs");
  lines.push(
    `  PROMPT_TO_BUNDLE_RMBG_URL              ${process.env["PROMPT_TO_BUNDLE_RMBG_URL"] ? "set" : "unset"}`
  );
  lines.push(
    `  PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL ${process.env["PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL"] ? "set" : "unset"}`
  );
  lines.push(
    `  PROMPT_TO_BUNDLE_UPSCALER_URL          ${process.env["PROMPT_TO_BUNDLE_UPSCALER_URL"] ? "set" : "unset"}`
  );
  lines.push(
    `  PROMPT_TO_BUNDLE_VLM_URL               ${process.env["PROMPT_TO_BUNDLE_VLM_URL"] ? "set" : "unset"}`
  );
  lines.push("");

  const anyPaid = Object.entries(avail).some(
    ([n, v]) => v && !FREE_TIER_PROVIDERS.includes(n) && !PASTE_ONLY_PROVIDERS.includes(n)
  );
  const anyFree = FREE_TIER_PROVIDERS.some((n) => avail[n]);

  lines.push("Modes available right now");
  lines.push("  inline_svg            always — requires only a host LLM.");
  lines.push("  external_prompt_only  always — any web UI works.");
  lines.push(
    `  api (free)            ${anyFree ? "yes (Cloudflare / NVIDIA NIM / HF / Horde / Pollinations depending on keys)" : "no"}`
  );
  lines.push(
    `  api (paid)            ${anyPaid ? "yes (≥1 paid provider key set)" : "no — optional; set a key to enable"}`
  );
  lines.push("");

  // Suggest the single highest-quality step the user can take right now.
  // Pattern: concrete command + why. Works whether they have zero keys, one,
  // or many.
  lines.push("What to try next");
  if (!anyPaid && !anyFree) {
    lines.push("  1. Use inline_svg for logos/favicons/icons — zero network, no key.");
    lines.push(
      '       Ask your MCP host: "generate an app icon for an app called X, inline_svg mode."'
    );
    lines.push("  2. For a free programmatic route, set up Cloudflare Workers AI:");
    lines.push("       https://dash.cloudflare.com → Workers AI → create an API token;");
    lines.push(
      "       export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...  # Flux-1-Schnell, 10k neurons/day, no credit card."
    );
    lines.push(
      "  3. For paste-only free: generate in https://aistudio.google.com and call asset_ingest_external on the downloaded PNG."
    );
  } else if (!anyPaid) {
    lines.push("  Fully operational on free tier. One concrete next step:");
    lines.push(
      "    npx prompt-to-asset init        # scaffold brand.json + wire your IDE's MCP config"
    );
    lines.push(
      "    p2a pick                       # interactive model picker — asks asset type + constraints"
    );
    if (!avail["cloudflare"]) {
      lines.push(
        "    export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...  # unlocks Flux-1-Schnell (10k neurons/day free)"
      );
    }
    if (!avail["nvidia"]) {
      lines.push(
        "    export NVIDIA_API_KEY=nvapi-...     # https://build.nvidia.com — Flux.1-dev / Flux.2-klein / SANA, 1k req/month free"
      );
    }
  } else {
    lines.push("  You have at least one paid key. Recommended habits:");
    lines.push("    - default to mode=inline_svg for logos/icons (zero cost, deterministic).");
    lines.push("    - set P2A_MAX_SPEND_USD_PER_RUN to cap any single call.");
    lines.push("    - run `p2a doctor --data` in CI to catch routing/registry drift.");
  }
  lines.push("");

  process.stdout.write(lines.join("\n") + "\n");
}

function paidHint(name: string): string {
  switch (name) {
    case "openai":
      return "gpt-image-1 / gpt-image-1.5 / dall-e-3 — best transparent PNG + text rendering";
    case "google":
      return "Gemini 3 Flash Image (Nano Banana) / Imagen 4 — billing required; no API free tier as of 2025-12. Nano Banana $0.039/img, Imagen 4 Fast $0.02/img. AI Studio web UI (https://aistudio.google.com) is free but paste-only.";
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
    default:
      return "";
  }
}

function hasBinary(bin: string): string {
  // Binary names here are hardcoded literals (vtracer, potrace) — no user input
  // reaches execFileSync. Using execFile (not exec) to avoid any shell layer.
  const looker = process.platform === "win32" ? "where" : "command";
  try {
    if (looker === "where") {
      const r = execFileSync("where", [bin], { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim()
        .split(/\r?\n/)[0];
      return r ? `found at ${r}` : "not on PATH";
    }
    // POSIX: `command -v` is a shell builtin; try `which` as fallback.
    const r = execFileSync("which", [bin], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return r ? `found at ${r}` : "not on PATH";
  } catch {
    return "not on PATH";
  }
}

async function hasNodeModule(mod: string): Promise<string> {
  try {
    await import(mod);
    return "installed";
  } catch {
    return "missing";
  }
}
