# 30e — Asset Set Coherence Tracking

## The Problem Statement

A stateless MCP server generates logo.png, then the user requests app_icon.png, then favicon.ico. Each call is a fresh API invocation. Nothing forces the icon to look like the logo; nothing prevents the favicon from using a different color. The user gets three visually unrelated assets — technically correct, aesthetically broken.

Coherence across an asset set requires the server to know what it already generated. That is a state problem.

---

## What Determines Visual Coherence

**Controllable at generation time (no storage needed):**
- Same hex palette → pass palette in every prompt
- Same style descriptor → pass style token ("flat minimal, 2px stroke, rounded corners") in every prompt
- Same text rendering → always use the same post-processing font, never embed text in raster

**Requires tracking (state needed):**
- Same diffusion seed → need to record which seed produced the approved logo
- Same model checkpoint / LoRA → need to record which provider + model version was used
- Same style reference image → need to store the path of the approved master asset
- Same IP-Adapter or style transfer parameters → need to record which reference image was used as style anchor

For API-mode generation (Recraft V3, Flux with IP-Adapter, FLUX.2 which supports up to 10 reference images per call), passing the approved logo as a `style_reference` image forces coherence at the model level — not at the prompt level. This is the most reliable mechanism.

---

## Coherence via Content-Addressed Asset Store

The project already has a prompt-hash cache. The next step is an asset manifest per project:

```json
{
  "project_id": "acme-rebrand",
  "brand_bundle": {
    "palette": ["#2D2D2D", "#F5A623", "#FFFFFF"],
    "font_family": "Raleway Bold",
    "style_descriptor": "flat geometric, single weight stroke, no gradients"
  },
  "generated_assets": [
    {
      "asset_type": "logo",
      "path": "~/.prompt-to-asset/bundles/abc123/master.svg",
      "provider": "inline_svg",
      "mode": "inline_svg",
      "accepted": true,
      "ts": 1745100000,
      "style_seed": null,
      "ref_image_path": null
    },
    {
      "asset_type": "app_icon",
      "path": "~/.prompt-to-asset/bundles/def456/master.png",
      "provider": "recraft",
      "mode": "api",
      "accepted": true,
      "ts": 1745101000,
      "style_seed": "recraft_style_id_xyz",
      "ref_image_path": "~/.prompt-to-asset/bundles/abc123/master.svg"
    }
  ]
}
```

Stored in SQLite. The server reads this manifest at the start of each `asset_generate_*` call for the same project and automatically passes `ref_image_path` (the accepted logo) and `style_seed` to the generation pipeline.

---

## Provider-Specific Coherence Mechanisms

**Recraft V3:** Has a native concept of "styles" — generate a style, save the `style_id`, pass it to subsequent calls. All images generated with the same `style_id` share visual characteristics. This is the strongest coherence guarantee available from any API model.

**Ideogram 3 / gpt-image-1:** No persistent style concept. Best approach: pass the approved logo as an `image` reference and instruct the model to maintain its style. Consistency is probabilistic; seeds help within a single session but don't carry across API calls.

**inline_svg mode:** Coherence is prompt-level. Store the SVG parameters (stroke-width, corner-radius, color hex values) from the approved logo and inject them verbatim into the brief for subsequent assets. The LLM authoring the SVG will respect explicit numeric constraints more reliably than style descriptors.

**Stable Diffusion / ComfyUI:** Use Reference Only nodes or IP-Adapter to condition on the approved logo image. Seeds are reproducible within the same checkpoint version.

> **Updated 2026-04-21:** Recraft's `style_id` API remains the strongest cross-call coherence primitive — it is provider-level, not prompt-level, and guarantees visual consistency regardless of how different the prompt is. Store `style_seed` as the Recraft `style_id` in the coherence schema above; for other providers `style_seed` falls back to a diffusion seed integer (session-scoped only) or a reference image path. The `ref_image_path` / IP-Adapter path via FLUX.2 (10 reference images per call) is the best cross-session fallback for non-Recraft providers — it is the correct value for the `ref_asset_id` foreign key in the coherence schema.

---

## Dual-Layer Deduplication for Cache Efficiency

The content-addressed prompt-hash cache handles exact duplicates (same prompt, same parameters). The next layer is semantic deduplication: detecting when two slightly different prompts would produce the same asset type with equivalent quality.

Redis (for hosted) or SQLite FTS5 (for local) can serve as the semantic cache backing store. The dual approach: exact hash match first (zero embedding overhead), vector similarity second (catches near-duplicates). This is the pattern described in Bifrost's caching plugin and analyzed in the Redis prompt-caching vs semantic-caching comparison.

**Practical limit:** Semantic caching for images is harder than for text — two prompts that hash-differ might produce identical-looking outputs, but detecting this requires embedding the generated image, not the prompt. For now, semantic deduplication on the prompt side only.

---

## Coherence Tracking Schema

```sql
CREATE TABLE project_assets (
  id TEXT PRIMARY KEY,         -- content hash of the asset file
  project_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,    -- logo, app_icon, favicon, og_image, etc.
  path TEXT NOT NULL,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  style_seed TEXT,             -- recraft style_id or SD seed
  ref_asset_id TEXT,           -- FK to id of the asset used as style reference
  accepted INTEGER DEFAULT 0,
  validated INTEGER DEFAULT 0,
  ts INTEGER NOT NULL
);

CREATE INDEX idx_project_accepted ON project_assets(project_id, accepted, ts DESC);
```

At generation time: query for the most recent accepted asset in this project → use its `path` as `ref_image_path`, its `style_seed` as the style anchor. The user gets coherent sets without specifying anything beyond the project name.

## Sources

- [Style Consistency in AI Image Generation](https://zenvanriel.com/ai-engineer-blog/style-consistency-in-ai-image-generation/)
- [Recraft AI Icon Generation](https://www.recraft.ai/generate/icons)
- [Flux Reference Image Consistency](https://www.bentoml.com/blog/a-guide-to-open-source-image-generation-models)
- [Prompt Caching vs Semantic Caching](https://redis.io/blog/prompt-caching-vs-semantic-caching/)
- [Semantic Caching Vector DB Patterns](https://www.dataquest.io/blog/semantic-caching-and-memory-patterns-for-vector-databases/)
- [Westlake Awesome Style Transfer with Diffusion Models](https://github.com/Westlake-AGI-Lab/Awesome-Style-Transfer-with-Diffusion-Models)
