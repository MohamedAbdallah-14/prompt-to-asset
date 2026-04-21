// `p2a models` — inspect the model registry without spinning up MCP.
//
// Subcommands:
//   p2a models list                     → compact table (id, family, RGBA, SVG, text, dialect, cost tier)
//   p2a models list --free              → only free-tier / zero-key models
//   p2a models list --paid              → only paid direct-API models
//   p2a models list --paste-only        → only paste-only surfaces (Midjourney, Firefly, Krea)
//   p2a models inspect <id>             → full capability dump + paste-targets + routing references
//
// Read-only; no network; safe to run anywhere.

import { MODEL_REGISTRY, ROUTING_TABLE } from "../config.js";
import { providerKeyForModel, detectApiAvailability } from "../modes.js";
import { allPasteTargets } from "../paste-targets.js";
import type { ModelInfo } from "../types.js";
import { modelsList, modelsInspect } from "../tools/models.js";

export async function modelsCommand(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;

  if (!sub || sub === "list") {
    await listModels(rest);
    return;
  }

  if (sub === "inspect") {
    const id = rest[0];
    if (!id) {
      process.stderr.write("p2a models inspect: missing <model-id>\n");
      process.exit(2);
    }
    if (rest.includes("--json")) {
      try {
        const result = await modelsInspect({ id });
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      } catch (e) {
        process.stderr.write(`${(e as Error).message}\n`);
        process.exit(1);
      }
      return;
    }
    await inspectModel(id);
    return;
  }

  if (sub === "--help" || sub === "-h") {
    process.stdout.write(HELP);
    return;
  }

  process.stderr.write(`p2a models: unknown subcommand "${sub}"\n\n${HELP}`);
  process.exit(2);
}

const HELP = `p2a models

Usage:
  p2a models list                     List all registered models in a table.
  p2a models list --free              Only zero-key / free-tier models.
  p2a models list --paid              Only paid direct-API models.
  p2a models list --paste-only        Only paste-only surfaces (Midjourney, Firefly, Krea).
  p2a models list --rgba              Only models with native transparent-PNG output.
  p2a models list --svg               Only models with native SVG output.
  p2a models inspect <id>             Full capability dump + paste targets + routing references.

Machine-readable output:
  Pass --json on any list or inspect call to get structured JSON (for LLMs over Bash).

Examples:
  p2a models list
  p2a models list --free
  p2a models list --free --json
  p2a models inspect gpt-image-1
  p2a models inspect pollinations-flux --json
`;

async function listModels(flags: string[]): Promise<void> {
  const asJson = flags.includes("--json");
  if (asJson) {
    const result = await modelsList({
      ...(flags.includes("--free") && { free: true }),
      ...(flags.includes("--paid") && { paid: true }),
      ...(flags.includes("--paste-only") && { paste_only: true }),
      ...(flags.includes("--rgba") && { rgba: true }),
      ...(flags.includes("--svg") && { svg: true })
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  const avail = detectApiAvailability();
  let models = MODEL_REGISTRY.models;

  if (flags.includes("--free")) models = models.filter((m) => m.free_tier);
  if (flags.includes("--paid")) models = models.filter((m) => !m.free_tier && !m.paste_only);
  if (flags.includes("--paste-only")) models = models.filter((m) => m.paste_only);
  if (flags.includes("--rgba")) models = models.filter((m) => m.native_rgba === true);
  if (flags.includes("--svg")) models = models.filter((m) => m.native_svg === true);

  if (models.length === 0) {
    process.stdout.write("no models match the filter.\n");
    return;
  }

  const rows = models.map((m) => {
    const pkey = providerKeyForModel(m.id);
    const keySet = pkey ? avail[pkey] : false;
    const tier = m.paste_only ? "paste-only" : m.free_tier ? "free" : "paid";
    const status = m.paste_only ? "paste" : keySet ? "ready" : "unset";
    return {
      id: m.id,
      family: String(m.family),
      rgba: prettyBool(m.native_rgba),
      svg: m.native_svg ? "✓" : "—",
      text: String(m.text_ceiling_chars).padStart(3, " "),
      dialect: String(m.dialect),
      tier,
      status,
      cost: m.cost_hint ?? "—"
    };
  });

  const headers = [
    "id",
    "family",
    "rgba",
    "svg",
    "text",
    "dialect",
    "tier",
    "status",
    "cost"
  ] as const;
  const widths = Object.fromEntries(
    headers.map((h) => [h, Math.max(h.length, ...rows.map((r) => r[h].length))])
  ) as Record<(typeof headers)[number], number>;

  const pad = (s: string, w: number) => s.padEnd(w, " ");
  const sep = headers.map((h) => "-".repeat(widths[h])).join("  ");

  process.stdout.write(headers.map((h) => pad(h, widths[h])).join("  ") + "\n");
  process.stdout.write(sep + "\n");
  for (const r of rows) {
    process.stdout.write(headers.map((h) => pad(r[h], widths[h])).join("  ") + "\n");
  }
  process.stdout.write(
    `\n${rows.length} model${rows.length === 1 ? "" : "s"}. ` +
      `tier=free → zero-key / free tier; paid → requires API key; paste-only → external_prompt_only.\n`
  );
}

function prettyBool(b: boolean | "partial"): string {
  if (b === true) return "✓";
  if (b === "partial") return "~";
  return "—";
}

async function inspectModel(id: string): Promise<void> {
  const m = MODEL_REGISTRY.models.find((x) => x.id === id || x.aka?.includes(id));
  if (!m) {
    process.stderr.write(`p2a models inspect: "${id}" not found in data/model-registry.json.\n`);
    process.stderr.write(`Try: p2a models list\n`);
    process.exit(1);
  }
  const avail = detectApiAvailability();
  const pkey = providerKeyForModel(m.id);
  const pasteTargets = allPasteTargets()[m.id] ?? [];
  const routingRules = ROUTING_TABLE.rules.filter(
    (r) =>
      r.primary.model === m.id ||
      r.fallback.some((f) => f.model === m.id) ||
      r.never?.includes(m.id)
  );

  const kv = (k: string, v: string | number | boolean | string[] | undefined | null) =>
    process.stdout.write(
      `  ${k.padEnd(26)} ${Array.isArray(v) ? (v.length ? v.join(", ") : "—") : (v ?? "—")}\n`
    );

  process.stdout.write(`model: ${m.id}\n`);
  if (m.aka?.length) process.stdout.write(`aka:   ${m.aka.join(", ")}\n`);
  process.stdout.write("\nIdentity\n");
  kv("provider", m.provider);
  kv("family", String(m.family));
  kv("dialect", String(m.dialect));
  kv("mode", m.mode ?? "text-to-image");
  kv("api", m.api ?? "paste-only");
  if (m.license) kv("license", m.license);
  if (m.deprecated) kv("deprecated", m.deprecated);
  if (m.cost_hint) kv("cost", m.cost_hint);

  process.stdout.write("\nCapability\n");
  kv("native_rgba", prettyBool(m.native_rgba));
  kv("native_svg", String(m.native_svg));
  kv("text_ceiling_chars", m.text_ceiling_chars);
  kv("token_budget", m.token_budget ?? "—");
  kv("cfg_default", m.cfg_default ?? "—");
  kv("negative_prompt_support", m.negative_prompt_support);
  kv("ref_image_support", String(m.ref_image_support));
  kv("max_reference_images", m.max_reference_images ?? "—");
  if (m.max_size) kv("max_size", m.max_size);

  process.stdout.write("\nStatus in this env\n");
  kv("provider_key_env", pkey ? envForKey(pkey) : "paste-only");
  kv("api_key_set", pkey ? String(avail[pkey]) : "—");
  kv("paste_only", String(Boolean(m.paste_only)));
  kv("free_tier", String(Boolean(m.free_tier)));

  if (m.strengths.length) {
    process.stdout.write("\nStrengths\n");
    for (const s of m.strengths) process.stdout.write(`  + ${s}\n`);
  }
  if (m.weaknesses.length) {
    process.stdout.write("\nWeaknesses\n");
    for (const s of m.weaknesses) process.stdout.write(`  − ${s}\n`);
  }
  if (m.never_use_for.length) {
    process.stdout.write("\nNever use for\n");
    for (const s of m.never_use_for) process.stdout.write(`  × ${s}\n`);
  }

  if (pasteTargets.length) {
    process.stdout.write("\nPaste targets (external_prompt_only mode)\n");
    for (const t of pasteTargets) {
      process.stdout.write(`  • ${t.name}  ${t.url}\n    ${t.notes}\n`);
    }
  }

  if (routingRules.length) {
    process.stdout.write("\nRouting rules referencing this model\n");
    for (const r of routingRules) {
      const pos: string[] = [];
      if (r.primary.model === m.id) pos.push("PRIMARY");
      if (r.fallback.some((f) => f.model === m.id)) pos.push("fallback");
      if (r.never?.includes(m.id)) pos.push("NEVER");
      process.stdout.write(`  - ${r.id}  (${pos.join(", ")})\n`);
    }
  }

  process.stdout.write("\n");
  void inspectShouldNote(m);
}

function inspectShouldNote(m: ModelInfo): void {
  if (m.negative_prompt_support === "error") {
    process.stdout.write(
      "Note: this model rejects `negative_prompt` (it errors). The rewriter encodes do-not\n" +
        "constraints as positive anchors in the main prompt instead. See docs/research/06-stable-diffusion-flux.\n\n"
    );
  }
  if (m.free_tier) {
    process.stdout.write(
      "Free-tier model. Great starting point; read the `catch` field carefully for rate limits.\n\n"
    );
  }
  if (m.paste_only) {
    process.stdout.write(
      "Paste-only model. No programmatic API; call asset_enhance_prompt with mode=external_prompt_only\n" +
        "to get the rewritten prompt and the paste target(s) above.\n\n"
    );
  }
}

function envForKey(k: ReturnType<typeof providerKeyForModel>): string {
  switch (k) {
    case "openai":
      return "OPENAI_API_KEY";
    case "google":
      return "GEMINI_API_KEY";
    case "ideogram":
      return "IDEOGRAM_API_KEY";
    case "recraft":
      return "RECRAFT_API_KEY";
    case "flux":
      return "BFL_API_KEY";
    case "stability":
      return "STABILITY_API_KEY";
    case "leonardo":
      return "LEONARDO_API_KEY";
    case "fal":
      return "FAL_API_KEY";
    case "huggingface":
      return "HF_TOKEN";
    case "pollinations":
      return "POLLINATIONS_TOKEN (optional)";
    case "horde":
      return "HORDE_API_KEY (optional)";
    default:
      return "—";
  }
}
