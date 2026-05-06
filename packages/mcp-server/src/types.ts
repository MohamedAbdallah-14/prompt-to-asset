export type AssetType =
  | "logo"
  | "app_icon"
  | "favicon"
  | "og_image"
  | "splash_screen"
  | "illustration"
  | "icon_pack"
  | "hero"
  | "sticker"
  | "transparent_mark"
  | "ui_mockup";

export type Dialect = "prose" | "tag-salad" | "prose+quoted" | "prose+flags" | "prose+instruction";

export type ModelFamily =
  | "gpt-image"
  | "dalle"
  | "imagen"
  | "gemini"
  | "sd"
  | "sd-derivative"
  | "flux"
  | "mj"
  | "ideogram"
  | "recraft"
  | "firefly"
  | "krea"
  | "pollinations"
  | "stable-horde"
  | "huggingface"
  | "cloudflare"
  | "replicate";

export interface ModelInfo {
  id: string;
  provider: string;
  family: ModelFamily;
  native_rgba: boolean | "partial";
  native_svg: boolean;
  text_ceiling_chars: number;
  negative_prompt_support:
    | "native"
    | "supported"
    | "ignored"
    | "error"
    | "--no flag"
    | "vertex_only";
  ref_image_support: boolean | string;
  dialect: Dialect;
  strengths: string[];
  weaknesses: string[];
  never_use_for: string[];
  max_size?: string;
  /** Text-encoder class — informs dialect branching + token-budget enforcement. */
  text_encoder?: string;
  /** Hard token budget of the text encoder (CLIP=77, T5-XXL≈512, SD3=256). */
  token_budget?: number;
  /** Canonical classifier-free-guidance default for this model family. */
  cfg_default?: number;
  /** Max reference images the model accepts (e.g. Flux.2: 8, Gemini: 3). */
  max_reference_images?: number;
  /** Mode tag — "text-to-image", "multimodal", "edit_only". */
  mode?: string;
  /** API class — "REST", "enterprise-ims-oauth", or null when paste-only. */
  api?: string | null;
  /** When true, no automated API surface exists; external_prompt_only is the path. */
  paste_only?: boolean;
  /** When true, the provider is zero-key or has a free tier with no credit card. */
  free_tier?: boolean;
  /** Community aliases (e.g. gemini-3-flash-image → "nano-banana"). */
  aka?: string[];
  /** The exact string the upstream API expects, when it differs from `id`. */
  canonical_api_id?: string;
  /** License identifier where relevant (Apache-2.0, Flux-Dev-Non-Commercial, …). */
  license?: string;
  /** ISO date string if the model is being deprecated. */
  deprecated?: string;
  /**
   * One-line cost hint surfaced by `p2a models list` / `inspect`. Examples:
   * "$0.04/img", "~11 neurons (free: 10k/day)", "free: 10/wk (watermark)",
   * "paste-only — no per-call cost". Human-readable, not parsed.
   */
  cost_hint?: string;
}

export interface BrandBundle {
  palette: string[];
  style_refs?: string[];
  lora?: string;
  sref_code?: string;
  style_id?: string;
  do_not?: string[];
  logo_mark?: string;
  typography?: { primary?: string; secondary?: string };
}

/**
 * A structured clarifying question the host LLM should surface (via
 * AskUserQuestion in Claude Code, Cursor's own prompt, etc.) BEFORE
 * proceeding, when the brief leaves an ambiguity that materially affects
 * output quality.
 *
 * Populated by asset_enhance_prompt for two situations today:
 *   - wordmark >3 words against a text-rendering model (Ideogram / gpt-image-1
 *     are only reliable ≤3 words — "Halcyon Weather" fails silently at size 4+)
 *   - brief too generic (no product noun, no visual anchor) — drives garbage in
 *     every model equally; one clarifying question raises quality by ~30%.
 *
 * Machine keys for `id` are stable so a caller can persist answers across calls.
 */
export interface ClarifyingQuestion {
  /** Stable machine id so callers can key-in an answer in a follow-up call. */
  id: string;
  /** Short chip label (≤12 chars) for AskUserQuestion-style UIs. */
  header: string;
  /** Full question text. */
  question: string;
  /** 2–4 mutually exclusive options. */
  options: Array<{ label: string; description: string }>;
  /** When true, the tool should refuse to proceed without an answer. */
  required: boolean;
  /** One-line reason the question is being asked — surfaced to the user. */
  why: string;
}

export interface AssetSpec {
  asset_type: AssetType;
  brief: string;
  rewritten_prompt: string;
  target_model: string;
  fallback_models: string[];
  params: Record<string, unknown>;
  postprocess: string[];
  safe_zone: { width: number; height: number } | null;
  dimensions: { width: number; height: number };
  transparency_required: boolean;
  vector_required: boolean;
  text_content: string | null;
  /**
   * Which of the three execution modes the caller can use RIGHT NOW for this
   * asset + env. Populated by asset_enhance_prompt so the hosting LLM knows
   * what to offer the user. See src/modes.ts.
   */
  modes_available: Array<"inline_svg" | "external_prompt_only" | "api">;
  /** Non-empty only when inline_svg is in modes_available. */
  svg_brief?: import("./svg-briefs.js").SvgBrief;
  /** Non-empty only when external_prompt_only is in modes_available. */
  paste_targets?: import("./paste-targets.js").PasteTarget[];
  fallback_paste_targets?: import("./paste-targets.js").PasteTarget[];
  /**
   * The routing rule id that fired + repo-relative pointers to the research
   * files that back it. Surfaces the "why" so callers / humans can audit.
   */
  routing_trace?: {
    rule_id: string;
    reason: string;
    research_sources: string[];
    /**
     * Models the router refuses for this asset + flag set (e.g. Imagen for
     * transparent output). Surfaced so the caller can explain WHY a model
     * was excluded, not only what was picked.
     */
    never_models: string[];
    /** Aggregated fallback chain in order of preference. */
    fallback_chain: string[];
  };
  warnings: string[];
  /**
   * Non-empty when the brief leaves a materially ambiguous decision the
   * router could resolve automatically but the answer depends on the user
   * (e.g. "shorten the wordmark to 3 words?"). The host LLM should render
   * these via AskUserQuestion (Claude Code) or the equivalent, collect
   * answers, and re-call enhance_prompt with a refined brief.
   */
  clarifying_questions?: ClarifyingQuestion[];
}

export interface RoutingRule {
  id: string;
  when: Record<string, unknown>;
  primary: {
    model?: string;
    strategy?: string;
    params?: Record<string, unknown>;
    postprocess?: string[];
  };
  fallback: Array<{
    model?: string;
    strategy?: string;
    params?: Record<string, unknown>;
    postprocess?: string[];
  }>;
  never: string[];
  postprocess: string[];
  /**
   * Optional pointers to research files that back this rule. Each entry is a
   * repo-relative path (e.g. "docs/research/04-gemini-imagen-prompting/4c-transparent-background-checkerboard.md").
   * Router surfaces these in RouteDecision.research_sources so asset_enhance_prompt
   * can tell the caller WHY the decision was made, not just WHAT.
   */
  research_sources?: string[];
}

/**
 * Structured validation failure codes. These map 1:1 to the repair table in
 * `skills/asset-validation-debug/SKILL.md`; keep both in sync. Consumers route
 * on these codes to pick a repair primitive (matte / inpaint / regenerate /
 * route change / composite).
 *
 * Source: docs/research/03-evaluation-metrics/ + docs/research/14-negative-prompting-artifacts/
 */
export type FailureCode =
  // Tier-0 deterministic
  | "T0_CHECKERBOARD"
  | "T0_ALPHA_MISSING"
  | "T0_DIMENSIONS"
  | "T0_SAFE_ZONE"
  | "T0_FILE_SIZE"
  // Tier-1 alignment + perceptual
  | "T1_PALETTE_DRIFT"
  | "T1_TEXT_MISSPELL"
  | "T1_LOW_CONTRAST"
  | "T1_VQASCORE"
  // Tier-2 VLM-as-judge
  | "T2_BRAND_DRIFT"
  | "T2_COMPOSITION";

export interface ValidationFailure {
  code: FailureCode;
  tier: 0 | 1 | 2;
  detail: string;
  data?: Record<string, number | string | boolean>;
}

export interface ValidationResult {
  pass: boolean;
  tier0: Record<string, boolean | string | number>;
  tier1?: Record<string, number | boolean | string>;
  tier2?: Record<string, boolean | string | number>;
  warnings: string[];
  /**
   * Structured failure codes consumed by `asset-validation-debug`. Empty when
   * `pass === true`. Each entry carries enough context (`detail`, optional
   * `data`) for the repair step to pick a primitive without re-running the
   * check.
   */
  failures: ValidationFailure[];
}

export interface AssetBundle {
  mode: "api";
  asset_type: AssetType;
  brief: string;
  brand_bundle_hash: string | null;
  variants: Array<{
    path: string;
    format: string;
    width?: number;
    height?: number;
    rgba?: boolean;
    paths?: number;
    bytes?: number;
  }>;
  provenance: {
    model: string;
    seed: number;
    prompt_hash: string;
    params_hash: string;
  };
  validations: ValidationResult;
  warnings: string[];
}

/**
 * Plan returned by a generator when mode=inline_svg. The hosting LLM
 * (Claude via the MCP client) is expected to read svg_brief and emit
 * the <svg>...</svg> inline in its reply. The server does NOT emit SVG
 * itself in this mode.
 */
export interface InlineSvgPlan {
  mode: "inline_svg";
  asset_type: AssetType;
  brief: string;
  svg_brief: import("./svg-briefs.js").SvgBrief;
  instructions_to_host_llm: string;
  params: Record<string, unknown>;
  dimensions: { width: number; height: number };
  warnings: string[];
}

/**
 * Plan returned by a generator when mode=external_prompt_only. The caller
 * pastes enhanced_prompt into one of the paste_targets, downloads the
 * image, and calls asset_ingest_external with the file path.
 */
export interface ExternalPromptPlan {
  mode: "external_prompt_only";
  asset_type: AssetType;
  brief: string;
  target_model: string;
  fallback_models: string[];
  enhanced_prompt: string;
  negative_prompt?: string;
  paste_targets: import("./paste-targets.js").PasteTarget[];
  fallback_paste_targets: import("./paste-targets.js").PasteTarget[];
  ingest_hint: {
    tool: "asset_ingest_external";
    args: {
      image_path: string;
      asset_type: AssetType;
      expected_text?: string;
    };
    explanation: string;
  };
  params: Record<string, unknown>;
  dimensions: { width: number; height: number };
  warnings: string[];
}

export type AssetGenerationResult = AssetBundle | InlineSvgPlan | ExternalPromptPlan;
