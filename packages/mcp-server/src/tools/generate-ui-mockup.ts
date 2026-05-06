import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { enhancePrompt } from "./enhance-prompt.js";
import { generate } from "../providers/index.js";
import { tier0 } from "../pipeline/validate.js";
import { computeCacheKey } from "../cache.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { resolveMode, buildExternalPromptPlan, chooseApiTargetOrFallback } from "./mode-runtime.js";
import type { GenerateUiMockupInputT, UiMockupSurface } from "../schemas.js";
import type { AssetGenerationResult } from "../types.js";

/**
 * Tool: asset_generate_ui_mockup
 *
 * Generates designer-grade UI inspiration mockups (pricing pages, dashboards,
 * settings, onboarding, marketing landings, mobile screens, forms, modals).
 * Produces the same paste-ready prompt the `ui-mockup-prompt` skill emits,
 * with a surface-job slot constraining aesthetic-by-job. Two modes:
 *
 *   - external_prompt_only: returns the dialect-correct prompt + paste targets
 *     ranked free-first. No key required.
 *   - api: routes to gpt-image-2 (default), Nano Banana Pro / Flash, Flux 2,
 *     or Ideogram 3 Turbo (text-light). Requires one of OPENAI_API_KEY,
 *     GEMINI_API_KEY, BFL_API_KEY/FAL_API_KEY, or IDEOGRAM_API_KEY.
 *
 * inline_svg is not offered — UI surfaces are too complex for the ≤40-path
 * budget. The user's existing logo / favicon / app_icon skills cover the
 * inline-SVG sub-surfaces.
 *
 * Surface-pattern enforcement: the prompt includes a [Surface job] slot
 * encoding the must-have UX moves per surface — comparison matrix on
 * pricing, F-pattern on dashboards, ONE primary CTA on onboarding, grouped
 * sections on settings. This is the SSOT-port of the surface catalog at
 * skills/ui-mockup-prompt/references/surface-patterns.md.
 *
 * Anti-slop hardening: no indigo (#6366f1 family), no two-stop trust
 * gradient on hero, no Inter/Roboto/system-ui display, no rounded card +
 * left-stripe accent, no invented metrics, no lorem ipsum. The skill's
 * full anti-slop catalog lives at
 * skills/ui-mockup-prompt/references/anti-slop-detail.md.
 */
export async function generateUiMockup(
  input: GenerateUiMockupInputT
): Promise<AssetGenerationResult> {
  const surface = input.surface_type ?? classifySurface(input.brief);
  const surfaceJob = surfaceJobLine(surface);

  // Compose an enriched brief the rewriter sees: original user brief plus
  // the [Surface job] requirement and any [Aesthetic] direction. The
  // rewriter then generates the dialect-correct prompt for the routed
  // model. The skill remains the SSOT for full surface-pattern depth;
  // this server-side path encodes the structural deltas inline.
  const enrichedBrief = composeEnrichedBrief(input, surface, surfaceJob);

  const spec = await enhancePrompt({
    brief: enrichedBrief,
    asset_type: "ui_mockup",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  const { mode } = resolveMode(input.mode, "ui_mockup", spec.target_model, spec.fallback_models);

  if (mode === "inline_svg") {
    throw new Error(
      "mode=inline_svg is not supported for asset_generate_ui_mockup — UI surfaces exceed the 40-path budget. Use external_prompt_only or api."
    );
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("ui_mockup", input.brief, spec);
  }

  // api mode
  const chosen = chooseApiTargetOrFallback("ui_mockup", input.brief, spec, {
    images: input.count
  });
  if (chosen.kind === "external") return chosen.plan;
  const apiModel = chosen.model;

  const { width, height } = aspectToPixels(input.aspect_ratio);
  const outDir = input.output_dir ?? resolve(CONFIG.outputDir, `ui-mockup-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  const variants: Array<{
    path: string;
    format: string;
    width?: number;
    height?: number;
    bytes?: number;
  }> = [];
  const warnings: string[] = [...spec.warnings, ...chosen.warnings];

  // Surface-specific guidance the calling agent should still validate
  // before declaring the result done. Mirrors the skill's per-surface
  // validation reminders.
  const surfaceValidation = surfaceValidationChecks(surface);
  if (surfaceValidation.length > 0) {
    warnings.push(...surfaceValidation.map((c) => `validate: ${c}`));
  }

  let modelUsed = apiModel;
  let firstSeed = 0;
  let prompt_hash = "";
  let params_hash = "";

  for (let i = 0; i < input.count; i++) {
    const seed = (typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0) + i * 1000003;
    const ck = computeCacheKey({
      model: apiModel,
      seed,
      prompt: spec.rewritten_prompt,
      params: spec.params
    });
    if (i === 0) {
      firstSeed = seed;
      prompt_hash = ck.prompt_hash;
      params_hash = ck.params_hash;
    }

    const refs = input.reference_images ?? input.brand_bundle?.style_refs;

    const gen = await generate(apiModel, {
      prompt: spec.rewritten_prompt,
      width,
      height,
      seed,
      ...(refs && refs.length > 0 && { reference_images: refs }),
      ...(input.brand_bundle?.style_id && { style_id: input.brand_bundle.style_id }),
      ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette }),
      output_format: "png"
    });
    modelUsed = gen.model;

    const p = resolve(outDir, `ui-mockup-${String(i + 1).padStart(2, "0")}.png`);
    writeFileSync(p, gen.image);
    variants.push({ path: p, format: "png", width, height, bytes: gen.image.length });
  }

  const validation = await tier0({
    image: Buffer.alloc(1),
    asset_type: "ui_mockup",
    expected_width: width,
    expected_height: height,
    transparency_required: false,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "ui_mockup",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: { model: modelUsed, seed: firstSeed, prompt_hash, params_hash },
    validations: validation,
    warnings
  };
}

/**
 * Classify a UI brief into a surface type. Cheap rule-based pass — same
 * pattern as classify.ts at the asset-type level. The surface-patterns
 * catalog has 9+ entries; we cover the cases the surface_type schema
 * recognizes.
 */
export function classifySurface(brief: string): UiMockupSurface {
  const b = brief.toLowerCase();
  if (/\bpricing\b|plans?\b|tier|monthly\s*\/\s*yearly|billing\s*period/.test(b))
    return "pricing_page";
  if (/\bdashboard|kpi|analytics|metrics|chart|overview\s*screen/.test(b)) return "dashboard";
  if (/\bsettings|preferences|profile\s*edit|account\s*settings/.test(b)) return "settings";
  if (/\bonboarding|first[-\s]use|empty\s*state|welcome\s*screen|first[-\s]time\s*user/.test(b))
    return "onboarding";
  if (/\bmarketing\s*page|landing\s*page|hero\s*section\b/.test(b)) return "marketing_landing";
  if (
    /\bsignup\s*(?:page|screen|form)|\blogin\s*(?:page|screen|form)|\bcheckout|lead\s*capture/.test(
      b
    )
  )
    return "form";
  if (/\bdetail\s*view|product\s*detail|profile\s*view|item\s*page/.test(b)) return "detail_view";
  if (/\bsearch\s*results|search\s*page|results\s*list/.test(b)) return "search_results";
  if (/\bmodal|sheet|drawer|dialog\b/.test(b)) return "modal";
  if (/\bmobile\s*home|home\s*screen|mobile\s*app\s*home/.test(b)) return "mobile_home";
  if (/\bcomponent|button\s*group|card\b|nav\s*bar|tab\s*bar/.test(b)) return "single_component";
  // No specific surface detected — default to pricing_page is wrong; use
  // marketing_landing as the lowest-risk default since it's the least
  // structurally constrained surface.
  return "marketing_landing";
}

/**
 * One-line surface-job statement for the [Surface job] slot. Compressed
 * from skills/ui-mockup-prompt/references/surface-patterns.md so the
 * router-side path emits the same shape as the skill-side path.
 */
export function surfaceJobLine(surface: UiMockupSurface): string {
  switch (surface) {
    case "pricing_page":
      return "Pricing page — visitor compares N plans and picks one. Comparison matrix (feature-per-row, ✓/—/value per column), recommended tier visually emphasized via tint OR scale OR border (NOT just an eyebrow ribbon), value-prop section ABOVE the tier grid, CTA consistency (all self-serve OR explicit Custom + Talk-to-sales for top tier), top nav present (wordmark + nav items + Sign in + primary CTA), FAQ teased from tier section.";
    case "dashboard":
      return "Dashboard — operator scans current state, spots anomalies, drills in. F-pattern reading order. KPI strip first (≤6 metrics, label + big number + delta arrow), primary chart second (full width), secondary lists third (tables, recent activity). Global filters above content (date range, segment, refresh). Last-updated timestamp visible. Drill-down chevron on every list row. Sidebar nav left.";
    case "settings":
      return "Settings — user changes one thing safely. Sections grouped by domain with eyebrow labels (Account / Notifications / Billing / Privacy / Danger zone). Labels above inputs (NOT placeholder-as-label). Required marker on label. Dangerous actions visually quarantined. Save behavior unambiguous (sticky bottom Save on dirty state, OR autosave indicator, OR per-section Save — pick ONE). Toggle states show both ON and OFF in the rendered output.";
    case "onboarding":
      return "Onboarding empty state — new user has zero context. EXACTLY ONE primary CTA (no competing Skip + Continue + Add later at same visual weight). One-line value sentence + headline + centered illustration / icon + primary CTA pattern. Skip affordance, if allowed, is a small text link below the primary button — secondary, demoted. Progress indicator if multi-step (dots OR thin top bar). No tab bar on the very first screen.";
    case "marketing_landing":
      return "Marketing landing page — visitor decides in 5 seconds whether to keep scrolling. Top nav with wordmark + 4-5 nav items + Sign in + primary CTA. Hero with bold headline + sub + ONE primary CTA (secondary CTA optional but demoted). Social proof immediately after hero (logo strip OR named customer quote — NOT generic 5-star reviews). Three-act structure: problem → solution → proof. CTA repeated at bottom. Footer with 4-column link categories + social + copyright.";
    case "form":
      return "Form — user completes a transaction. Every field is friction. Labels above inputs (NEVER placeholder-as-label). Required marker on the label, not the placeholder. Inline error below field with cause + recovery (e.g. 'Email must include @ and a domain', NOT 'Invalid input'). Sections for >7 fields with eyebrow labels. Submit button labeled by action (NOT 'Submit'). Trust signals near sensitive fields.";
    case "detail_view":
      return "Detail view — user reads deep on one thing. Hierarchy of info matters. Hero block (primary image + title + key metadata + primary action) above the fold. Most-important info first, supporting info second, tertiary info collapsed. Single primary action. Breadcrumb back to list. Related / next item at the bottom.";
    case "search_results":
      return "Search results — user scans for one thing in <5 results or refines. Search bar prominent at top, query echoed back. Filters / facets on the left or as chips. Result row: primary text (title) + secondary text (excerpt) + metadata (date, type, price) — consistent across rows. Result count visible. Empty state for no results echoes the query and suggests alternatives.";
    case "modal":
      return "Modal / sheet — user performs one focused task without losing underlying-surface context. Header (title + close). Body with focused content (don't overload). Footer with paired actions: Cancel (secondary, left) + primary action (right) labeled by verb ('Save changes', 'Delete project', 'Confirm'). Backdrop dimmed but underlying surface visible. Escape closes (web), tap-outside closes (mobile sheet).";
    case "mobile_home":
      return "Mobile app home — user opens, gets to primary task in 1 tap. Top of screen: status / context (date, greeting, current count) — NOT a marketing nav. Primary action visually dominant (large button, centered illustration + CTA, OR most-recent-activity card). Bottom tab bar with 4-5 tabs max, active tab in accent. NO hamburger menu, NO marketing-style hero on app home.";
    case "single_component":
      return "Single component (button, card, nav, input, etc.) — focused on one element, not a full page. Render at scale (NOT a thumbnail). Show multiple states if relevant (default + hover + focus + active + disabled). Demonstrate composition rules (size, padding, radius, contrast). Label every state visibly with small caption text under the rendered example.";
  }
}

/**
 * Per-surface validation checks the calling agent should still verify
 * post-generation. Surface-aware analogue to the universal OCR/ΔE/aspect
 * checks tier0 already runs.
 */
export function surfaceValidationChecks(surface: UiMockupSurface): string[] {
  switch (surface) {
    case "pricing_page":
      return [
        "comparison matrix is used (feature-per-row, ✓/—/value per column) — not three parallel bullet lists",
        "recommended tier visually emphasized beyond just an eyebrow ribbon",
        "value-prop section appears ABOVE the tier grid in page flow",
        "CTA consistency: all self-serve OR explicit split (top tier 'Talk to sales' + 'Custom' price)"
      ];
    case "dashboard":
      return [
        "KPI strip → primary chart → secondary lists in vertical order",
        "≤6 KPIs in the strip",
        "last-updated timestamp visible",
        "drill-down affordance on every list row"
      ];
    case "settings":
      return [
        "sections grouped with eyebrow labels",
        "labels above inputs (not placeholder-as-label)",
        "save behavior unambiguous (one of: sticky save, autosave indicator, per-section save)",
        "if dangerous actions exist, they are quarantined visually"
      ];
    case "onboarding":
      return [
        "exactly ONE primary CTA at full visual weight",
        "first-use empty state pattern: illustration + headline + value sentence + CTA",
        "skip link, if present, is demoted text under the primary button"
      ];
    case "marketing_landing":
      return [
        "top nav present (wordmark + nav items + Sign in + CTA)",
        "ONE primary CTA in the hero",
        "social proof immediately after hero",
        "CTA repeated at bottom of page"
      ];
    case "form":
      return [
        "labels above inputs",
        "submit button labeled by action (not 'Submit')",
        "inline error pattern: red text + icon below field with cause + recovery"
      ];
    case "detail_view":
      return [
        "single primary action",
        "breadcrumb back to list",
        "info hierarchy: most-important first, supporting second, tertiary collapsed"
      ];
    case "search_results":
      return ["query echoed back", "result count visible", "consistent row shape across results"];
    case "modal":
      return [
        "paired action footer (Cancel + verb-labeled primary)",
        "title says what the modal does (not generic 'Edit')",
        "underlying surface still partially visible"
      ];
    case "mobile_home":
      return [
        "bottom tab bar with 4-5 tabs",
        "no hamburger menu",
        "primary action visually dominant"
      ];
    case "single_component":
      return [
        "rendered at usable scale (not thumbnail)",
        "multiple states shown if relevant",
        "each state visibly labelled"
      ];
  }
}

function composeEnrichedBrief(
  input: GenerateUiMockupInputT,
  surface: UiMockupSurface,
  surfaceJob: string
): string {
  const lines: string[] = [];
  lines.push(input.brief);
  lines.push("");
  lines.push(`[Surface job — ${surface}]`);
  lines.push(surfaceJob);
  if (input.aesthetic_direction) {
    lines.push("");
    lines.push(`[Aesthetic direction]`);
    lines.push(input.aesthetic_direction);
  }
  lines.push("");
  lines.push(
    "[Anti-slop guards] Avoid Tailwind indigo (#6366f1, #4f46e5, #4338ca, #3730a3, #8b5cf6, #7c3aed, #a855f7). No two-stop trust gradient (purple→blue, blue→cyan, indigo→pink). No emoji as feature icons. No Inter/Roboto/Arial/system-ui as the headline typeface. No rounded card + colored left-border accent stripe. No invented metrics ('10× faster', '99.9% uptime'). No lorem ipsum or 'feature one/two/three'. Use real product-grade content."
  );
  lines.push(
    "[Output framing] Render as a real shipped product screenshot, not concept art. All visible text legible. Aspect: " +
      input.aspect_ratio +
      "."
  );
  return lines.join("\n");
}

function aspectToPixels(ar: string): { width: number; height: number } {
  switch (ar) {
    case "16:9":
      return { width: 1920, height: 1080 };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "4:3":
      return { width: 1600, height: 1200 };
    case "3:2":
      return { width: 1500, height: 1000 };
    case "1:1":
      return { width: 1024, height: 1024 };
    case "21:9":
      return { width: 2520, height: 1080 };
    default:
      return { width: 1920, height: 1080 };
  }
}
