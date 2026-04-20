---
wave: 2
role: roadmap
slug: 34-new-skills-roadmap
title: "New Skills Roadmap — prompt-to-asset"
date: 2026-04-20
---

# New Skills Roadmap — prompt-to-asset

This roadmap covers five new skills to build, in priority order. Each skill is absent from the current `skills/` tree and fills a gap identified in the installable-skills survey.

## Priority 1 — Build Now

### 1. `nano-banana` (Gemini Flash Image, free tier)

**Problem it solves.** A user with no API keys cannot use prompt-to-asset's `api` mode for any generation. The `inline_svg` mode covers logos and icons, and `external_prompt_only` covers everything else, but neither produces a raster image on disk without a browser tab. The `nano-banana` skill fills this gap: it generates a raster image immediately using only a free Google AI Studio key.

**Trigger phrases.** "quick image", "concept draft", "free image", "sketch this", "rough illustration", "draft version"

**API.** Gemini 2.5 Flash Image via Google AI Studio (`gemini-2.5-flash-image`, GA as of Oct 2025). SDK: `@google/genai` npm package or `google-genai` Python.

**Key requirement.** `GEMINI_API_KEY` only. Obtainable without a credit card from Google AI Studio. Free tier: ~1,500 images/day (1,290 output tokens each; free quota resets daily).

**Routing position.** Sits below `gpt-image-1`, Ideogram 3, and Recraft V3 in the quality hierarchy but above `external_prompt_only` in UX friction. Presented first when no paid API keys are configured.

**Output format.** 1024×1024 PNG (RGB, no alpha). Must be labeled "concept draft" in `meta.json` — not production-ready for transparent or vector asset types.

**What it does not do.** Transparent output (Gemini renders fake checkerboard as RGB), native SVG, platform packaging. If the user asks for a logo or app icon, the skill should respond with: "This is a concept draft only. For production output with transparency and platform bundles, use `api` mode with `OPENAI_API_KEY` or `FAL_KEY`."

**Implementation sketch.**

```typescript
// skills/nano-banana/scripts/run.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await client.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [{ role: "user", parts: [{ text: process.env.PROMPT }] }],
  generationConfig: { responseModalities: [Modality.IMAGE] },
});

const imagePart = response.candidates[0].content.parts.find(
  (p) => p.inlineData
);
if (!imagePart?.inlineData) throw new Error("No image in response");

const outDir = process.env.OUTPUT_DIR ?? "output/nano-banana";
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "draft.png");
writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, "base64"));
console.log(JSON.stringify({ path: outPath, model: "gemini-2.5-flash-image", warning: "concept-draft-no-alpha" }));
```

**SKILL.md frontmatter.**

```yaml
name: nano-banana
description: >
  Generate a quick concept image using Gemini Flash Image (Google AI Studio free tier).
  No credit card required — only GEMINI_API_KEY. Output is a 1024×1024 RGB PNG draft;
  not suitable as a final asset for logos, icons, or transparent marks.
trigger_phrases:
  - quick image
  - concept draft
  - free image
  - sketch this
  - rough illustration
  - draft version
allowed-tools: [Bash, Write]
argument-hint: "<brief description of the image>"
when_to_use: >
  Use when the user has no paid API keys and wants a visual concept immediately.
  Do NOT use for final logo, app icon, favicon, or transparent mark output.
```

**Estimated build time.** 2–3 hours. The `kingbootoshi/nano-banana-2-skill` is the direct reference — it is a working implementation. The prompt-to-asset version adds: dialect rewriting via `asset_enhance_prompt`, proper output directory structure, `meta.json` with provenance and the "concept-draft" warning, and suppression of the skill when `asset_type` is one of `logo`, `favicon`, `transparent_mark`, or `app_icon`.

---

### 2. `flux` (Flux.1 Pro / Kontext via fal.ai)

**Problem it solves.** Photo-realistic hero images, product photos, and lifestyle scenes are outside the capability of `gpt-image-1` (over-polished, prompt-rewritten) and Ideogram 3 (illustration-biased). Flux.1 Pro on fal.ai is the current state-of-the-art for high-fidelity photorealism among API-accessible models. Flux Kontext adds reference-image conditioning — pass a brand asset and the model places it in a real-world scene.

**Trigger phrases.** "photo-realistic", "hero image", "product photo", "lifestyle shot", "editorial photo", "brand photography", "scene with the logo"

**API.** fal.ai. Primary endpoint: `fal-ai/flux-pro`. For reference-image conditioning: `fal-ai/flux-kontext-pro`. For fast draft: `fal-ai/flux-schnell`.

**Key requirement.** `FAL_KEY`. Requires account and credit card. $1 trial credit on signup (~5–20 images depending on size).

**Routing position.** Primary for `illustration` and `hero` asset types when `FAL_KEY` is present. Secondary for `og_image` (behind `gpt-image-1` for text rendering). Not used for `logo`, `favicon`, `transparent_mark` (Flux has no native RGBA output), or `app_icon` masters.

**Output format.** 1024×1024 to 2048×2048 PNG or WebP depending on `image_size` param. RGB only. Background removal via `fal-ai/birefnet` required if transparent output is needed.

**Important Flux constraints (from category 06-stable-diffusion-flux research).**
- `negative_prompt` is not accepted by the fal.ai Flux endpoints — it throws a 422. The universally-portable "negative" is a positive anchor in the main prompt: write "pure white background" not "no background".
- Flux speaks narrative prose. Tag-soup SDXL prompts degrade quality. The `asset_enhance_prompt` dialect rewriter must produce a prose paragraph for Flux.
- Flux.1 Pro does not accept `style_id` or brand reference parameters natively. Brand conditioning requires Flux Kontext (pass reference image) or a fine-tuned LoRA on fal.ai.
- `fal-ai/flux-kontext-pro` accepts up to 8 reference images as `reference_images[]`. This is the correct endpoint for "place this logo in a lifestyle scene."

**SKILL.md frontmatter.**

```yaml
name: flux
description: >
  Generate photo-realistic hero images, product photos, and lifestyle scenes using Flux.1 Pro
  via fal.ai. Requires FAL_KEY. For reference-image conditioning (place a logo in a scene),
  uses Flux Kontext. Not suitable for transparent backgrounds — use the transparent-bg skill
  after generation if needed.
trigger_phrases:
  - photo-realistic
  - hero image
  - product photo
  - lifestyle shot
  - editorial photo
  - brand photography
  - scene with the logo
allowed-tools: [Bash, mcp__prompt_to_asset__asset_enhance_prompt, mcp__prompt_to_asset__asset_remove_background]
argument-hint: "<description of the image scene>"
when_to_use: >
  Use for illustration, hero, og_image, and splash_screen asset types when FAL_KEY is
  present and the user wants photorealistic output. Do not use for logo, favicon,
  transparent_mark, or app_icon without following up with asset_remove_background.
```

**Estimated build time.** 3–4 hours. Reference: `fal-ai-community/skills/flux-pro` SKILL.md. The prompt-to-asset version adds: dialect rewriting, automatic BiRefNet matte when `transparent: true`, aspect-ratio selection from the asset type spec, and `meta.json` with model provenance.

---

## Priority 2 — Build Next

### 3. `video-gen` (Kling / Sora / Veo via fal.ai)

**Problem it solves.** Splash screen animations, app preview videos, and social media motion content are increasingly expected deliverables from the same brief that produces static assets. Today, prompt-to-asset's `asset_generate_splash_screen` produces static images only. Adding a `video-gen` skill enables "animate the splash" and "make a 10-second app preview" flows.

**Trigger phrases.** "animate", "motion", "video clip", "app preview", "splash animation", "looping background", "animated logo", "promo video"

**API.** fal.ai. Endpoints by use case:

| Use case | Endpoint | Notes |
|---|---|---|
| Image-to-video (animate static asset) | `fal-ai/kling-video/v1.6/pro/image-to-video` | Best for animating a generated logo/hero image |
| Text-to-video | `fal-ai/kling-video/v1.6/pro/text-to-video` | Good for abstract backgrounds, intros |
| Sora via fal | `fal-ai/sora` | Higher quality, slower, more expensive |
| Veo 2 via fal | `fal-ai/veo2` | Google's model; best motion quality for product demos |
| AnimateDiff (loop) | `fal-ai/animatediff-v2v` | Specialized for seamless loops |

**Key requirement.** `FAL_KEY`.

**Output format.** MP4 (H.264, 1080p for Sora/Veo, 720p for Kling). Duration 5–10 seconds.

**Integration with existing skills.** The `video-gen` skill should accept an optional `--from-image <path>` flag. When present, it uses the image-to-video endpoint (Kling image-to-video or Veo2 with reference frame). This enables the flow: `logo` → PNG master → `video-gen --from-image logo/master.png` → animated MP4.

**Reference.** `calesthio/OpenMontage` (2.7k stars) demonstrates the multi-step pattern: generate images, sequence them, produce video. The fal.ai Kling and Veo skills in `fal-ai-community/skills` show the raw fal.ai call. The prompt-to-asset version adds: asset type classification (splash vs. hero vs. social), aspect-ratio selection per platform (9:16 splash, 16:9 hero, 1:1 social), and duration selection.

**Estimated build time.** 4–6 hours. The fal.ai client call is straightforward; the complexity is in the aspect-ratio/platform matrix and in the image-to-video conditioning flow.

---

### 4. `audio-gen` (ElevenLabs / fal-audio for app sounds)

**Problem it solves.** Brand audio assets — notification sounds, UI feedback tones, app intro jingles, voice-over narration for video previews — are a legitimate deliverable in the same brief as visual assets ("make my app feel cohesive"). No existing prompt-to-asset skill covers audio, and no skill in any surveyed collection targets software UI audio specifically.

**Trigger phrases.** "notification sound", "app sound", "UI sound effect", "brand audio", "jingle", "voice over", "narration", "alert tone", "success chime"

**API.** Two paths:

| Use case | API | Endpoint | Notes |
|---|---|---|---|
| Voice narration / brand voice | ElevenLabs via fal.ai | `fal-ai/elevenlabs/tts` | High-quality TTS; voice cloning available |
| Sound effects / UI audio | Stability AI Stable Audio via fal | `fal-ai/stable-audio` | Short-form sound design; good for UI tones |
| Music / jingles | Meta MusicGen via fal | `fal-ai/musicgen` | 30-second instrumental clips |

**Key requirement.** `FAL_KEY` for all three (ElevenLabs is proxied through fal.ai). Direct `ELEVENLABS_API_KEY` is also supported as a fallback.

**Output format.** MP3 (192 kbps). Duration: UI sounds 0.5–3s, narration/jingle up to 30s.

**Scope constraint.** This skill deliberately excludes full music composition (too broad) and voice cloning (privacy concerns). The scope is: short-form software UI audio that ships alongside the visual assets in an `AssetBundle`. The `meta.json` for an audio generation records the text prompt, model, voice ID (if TTS), and duration.

**Estimated build time.** 3–4 hours.

---

## Priority 3 — Research Phase

### 5. `3d-gen` (TripoSR / Wonder3D via fal.ai)

**Problem it solves.** visionOS app icons require three-layer parallax PNG sources (foreground/subject, mid-ground/detail, background). Apple's Icon Composer accepts these as separate 1024×1024 PNG layers. Currently, prompt-to-asset's `app-icon` skill produces a flat 1024² master and does not generate visionOS layered sources. Additionally, product 3D renders for app store screenshots (rotating product, 3D packaging) are a common request.

**Trigger phrases.** "3D icon", "visionOS icon", "spatial icon", "3D app icon", "product 3D", "3D render", "rotating logo", "3D asset"

**API.** fal.ai.

| Use case | Endpoint | Output |
|---|---|---|
| Single image → 3D mesh | `fal-ai/triposr` | GLB + rendered views |
| Single image → multi-view | `fal-ai/wonder3d` | 6 orthographic views (PNG) + GLB |
| Text → 3D | `fal-ai/shap-e` | GLB (lower quality; good for abstract icons) |

**Why Wonder3D for visionOS.** Wonder3D takes one reference PNG and produces six orthographic renders (front, back, left, right, top, bottom) plus a GLB. The front/side/back views can be composited into the three visionOS parallax layers with correct depth separation. This is a better pipeline than asking a 2D diffusion model to "draw a foreground-only version" because the geometry is consistent across all layers.

**Key requirement.** `FAL_KEY`.

**Output format.** GLB for 3D mesh. PNG (1024²) per view for visionOS layers. The visionOS `AppIconSet/` bundle format (from category 09-app-icon-generation research) has three content.json layers: `Front`, `Middle`, `Back`. Wonder3D's front render → Front layer; a semi-transparent midground extraction → Middle; the background color fill → Back.

**Research questions before building.**
1. Wonder3D's multi-view render quality is trained on object photos, not logo marks. Does it work well on flat logo marks or does it hallucinate 3D geometry that breaks the icon aesthetic? A quick test with 5–10 existing logo marks is needed before committing to this pipeline.
2. Apple's Icon Composer visionOS layer compositing spec — does it accept PNG with alpha per layer, or does each layer need to be fully opaque with a depth mask? The category 09 research covers this but should be re-confirmed against the latest visionOS SDK.
3. Is `fal-ai/triposr` quality sufficient for App Store screenshots, or does a more expensive model (e.g., Point-E, Shap-E Imagen variant, or a dedicated 3D rendering service) produce better results for small-icon scales?

**Estimated build time.** 6–10 hours including the Wonder3D → visionOS layer pipeline, which requires image compositing code not present in any existing skill. Mark as research/prototype.

---

## Cross-Cutting Implementation Notes

### Shared skill structure

All five new skills should follow the same directory layout as the existing skills:

```
skills/<name>/
├── SKILL.md              # frontmatter + routing instructions
└── scripts/
    └── run.ts            # thin fal.ai / Gemini API wrapper
```

The scripts should be TypeScript for consistency with the existing codebase (see `package.json` at repo root).

### Shared fal.ai client initialization

Create a shared `packages/fal-client/` package that initializes the fal.ai client with `FAL_KEY`, handles the queue/subscribe pattern, and normalizes errors. All fal.ai-backed skills import from this package rather than each individually calling `fal.config({ credentials: process.env.FAL_KEY })`.

```typescript
// packages/fal-client/index.ts
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export { fal };
export async function falSubscribe<T>(
  endpoint: string,
  input: Record<string, unknown>
): Promise<T> {
  const result = await fal.subscribe(endpoint, {
    input,
    logs: process.env.FAL_VERBOSE === "1",
    onQueueUpdate: (u) => {
      if (u.status === "IN_PROGRESS")
        process.stderr.write(`[fal] ${u.logs?.at(-1)?.message ?? ""}\n`);
    },
  });
  return result.data as T;
}
```

### Capability detection

Each new skill's `SKILL.md` should include a `when_to_use` block that explicitly lists the required env var. The `asset_capabilities()` MCP tool already surfaces which keys are configured; new skills should read from that response rather than checking `process.env` directly in their body copy.

### Validation stub

Every new skill should include a validation step that calls `asset_validate({ image, asset_type })` on its output before reporting the file path to the user. For `nano-banana`, validation is a checkerboard-pattern probe only (confirming the image is not fake-transparent). For `flux`, validation includes safe-zone check and palette ΔE2000 if brand colors were specified. For `video-gen` and `audio-gen`, validation is a file-integrity check (not zero bytes, correct MIME type, duration in expected range).

### Priority summary

| Skill | Priority | Est. hours | Blocking dependency |
|---|---|---|---|
| nano-banana | 1 | 2–3h | None — start immediately |
| flux | 1 | 3–4h | `packages/fal-client` shared init |
| video-gen | 2 | 4–6h | `flux` (image-to-video path reuses flux output) |
| audio-gen | 2 | 3–4h | `packages/fal-client` shared init |
| 3d-gen | 3 | 6–10h | Wonder3D → visionOS pipeline research |
