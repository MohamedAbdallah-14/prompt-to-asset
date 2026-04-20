// `p2a pick` — interactive model picker.
//
// Answers the user request: "a UI for user to select [the model]." Runs in the
// terminal, no browser, no extra deps. Asks asset type + constraints, calls
// the same router used by the MCP tools, and prints a ranked list of routes
// with cost/free-tier/paste-target annotations. The user can then copy the
// enhanced prompt or generate directly.
//
// Intentionally dep-free (no @clack/prompts / inquirer) to match init.ts and
// keep the install tiny. Works in plain-old TTYs and inside IDE terminals.

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { enhancePrompt } from "../tools/enhance-prompt.js";
import { findModel } from "../config.js";
import {
  providerAvailability,
  PASTE_ONLY_PROVIDERS,
  FREE_TIER_PROVIDERS
} from "../providers/index.js";
import { detectApiAvailability, isApiAvailableFor } from "../modes.js";
import { resolvePasteTargets } from "../paste-targets.js";
import type { AssetType } from "../types.js";

const ASSET_TYPES: Array<{ id: AssetType; label: string }> = [
  { id: "logo", label: "logo (wordmark or pure mark)" },
  { id: "app_icon", label: "app icon (iOS / Android / PWA / visionOS)" },
  { id: "favicon", label: "favicon + PWA manifest bundle" },
  { id: "og_image", label: "OG / Twitter social card (1200×630)" },
  { id: "illustration", label: "spot illustration / empty state" },
  { id: "hero", label: "hero banner / landing image" },
  { id: "splash_screen", label: "mobile splash screen" },
  { id: "icon_pack", label: "icon pack (matching 24×24 set)" },
  { id: "sticker", label: "sticker / die-cut mark" },
  { id: "transparent_mark", label: "transparent PNG mark" }
];

export async function pickCommand(argv: string[]): Promise<void> {
  const yes = argv.includes("--yes") || argv.includes("-y");
  const rl = createInterface({ input, output });

  process.stdout.write("prompt-to-asset pick — answer a few questions, get a ranked route.\n\n");

  // 1) Asset type
  process.stdout.write("What are you generating?\n");
  ASSET_TYPES.forEach((t, i) => process.stdout.write(`  ${i + 1}. ${t.label}\n`));
  const pickIdx = await ask(rl, `\nChoose 1–${ASSET_TYPES.length}`, "1", yes);
  const typeIdx = Math.max(1, Math.min(ASSET_TYPES.length, Number(pickIdx) || 1)) - 1;
  const assetType = ASSET_TYPES[typeIdx]!.id;

  // 2) Brief
  const brief = await ask(
    rl,
    "\nOne-line brief (e.g. 'minimal flat logo for a weather app called Halcyon')",
    `${assetType} for a tech product`,
    yes
  );

  // 3) Wordmark text (affects routing — Ideogram for <=3 words, drop for >3)
  const wordmark = await ask(
    rl,
    "\nIs there visible text in the asset? Type the text (≤3 words for best fidelity) or press Enter",
    "",
    yes
  );

  // 4) Transparency / vector constraints
  const wantsTransparent = await askYesNo(
    rl,
    "\nDoes the asset need a transparent background?",
    defaultTransparency(assetType),
    yes
  );
  const wantsVector = await askYesNo(
    rl,
    "Do you want an SVG (vector) output alongside PNG?",
    defaultVector(assetType),
    yes
  );

  rl.close();

  // 5) Route via the same pipeline the MCP tools use
  const spec = await enhancePrompt({
    brief,
    asset_type: assetType,
    transparent: wantsTransparent,
    vector: wantsVector,
    ...(wordmark.length > 0 && { text_content: wordmark })
  });

  const avail = detectApiAvailability();
  const { primary_targets, fallback_targets } = resolvePasteTargets(
    spec.target_model,
    spec.fallback_models
  );

  // 6) Render the decision
  const out: string[] = [];
  out.push("\n─── route ─────────────────────────────────────────────");
  out.push(`asset_type      ${assetType}`);
  out.push(`target_model    ${spec.target_model}${apiTag(spec.target_model, avail)}`);
  out.push(`fallback_chain  ${spec.fallback_models.join(" → ") || "—"}`);
  const never = spec.routing_trace?.never_models ?? [];
  if (never.length > 0) out.push(`never_route_to  ${never.join(", ")}`);
  out.push(`modes_available ${spec.modes_available.join(", ") || "—"}`);
  out.push("");

  out.push("enhanced_prompt (dialect-correct for the routed model):");
  out.push("  " + spec.rewritten_prompt.replace(/\n/g, "\n  "));
  out.push("");

  out.push("paste_targets  (if you want to run it in your subscription instead):");
  for (const t of primary_targets) {
    out.push(`  • ${t.name.padEnd(28)} ${t.url}`);
  }
  if (fallback_targets.length > 0) {
    out.push("  fallbacks:");
    for (const t of fallback_targets) {
      out.push(`    · ${t.name.padEnd(26)} ${t.url}`);
    }
  }
  out.push("");

  if (spec.warnings.length > 0) {
    out.push("warnings");
    for (const w of spec.warnings) out.push(`  ! ${w}`);
    out.push("");
  }

  out.push("next step");
  if (spec.modes_available.includes("inline_svg")) {
    out.push(
      "  Ask your MCP host: " +
        `"generate a ${assetType} for ${brief}, inline_svg mode." ` +
        "Zero-key, deterministic."
    );
  }
  if (spec.modes_available.includes("api")) {
    out.push(
      "  Or: run asset_generate_* via MCP with mode=api — the server will call " +
        `${spec.target_model} directly.`
    );
  }
  out.push(
    "  Or paste the enhanced_prompt above into one of the paste_targets, save the image, then " +
      'call asset_ingest_external with { image_path, asset_type: "' +
      assetType +
      '" }.'
  );
  out.push("");

  process.stdout.write(out.join("\n"));
}

function apiTag(modelId: string, avail: ReturnType<typeof detectApiAvailability>): string {
  const m = findModel(modelId);
  if (m?.paste_only) return "  (paste-only)";
  const provider = m?.provider ?? "";
  if (FREE_TIER_PROVIDERS.includes(provider)) {
    return isApiAvailableFor(modelId, avail) ? "  (free tier — api live)" : "  (free tier — inactive)";
  }
  if (PASTE_ONLY_PROVIDERS.includes(provider)) return "  (paste-only)";
  return isApiAvailableFor(modelId, avail) ? "  (api key set)" : "  (api key missing)";
}

async function ask(
  rl: ReturnType<typeof createInterface>,
  q: string,
  def: string,
  yes: boolean
): Promise<string> {
  if (yes) return def;
  const raw = (await rl.question(`${q} [${def}]: `)).trim();
  return raw.length === 0 ? def : raw;
}

async function askYesNo(
  rl: ReturnType<typeof createInterface>,
  q: string,
  def: boolean,
  yes: boolean
): Promise<boolean> {
  if (yes) return def;
  const suffix = def ? "Y/n" : "y/N";
  const raw = (await rl.question(`${q} [${suffix}]: `)).trim().toLowerCase();
  if (raw.length === 0) return def;
  return raw === "y" || raw === "yes";
}

function defaultTransparency(t: AssetType): boolean {
  return ["logo", "app_icon", "favicon", "sticker", "transparent_mark", "icon_pack"].includes(t);
}

function defaultVector(t: AssetType): boolean {
  return ["logo", "favicon", "icon_pack"].includes(t);
}
