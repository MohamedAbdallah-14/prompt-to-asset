# 36 — MCP Servers for Image / Media / Design

**Scope:** External MCP (Model Context Protocol) landscape that `prompt-to-asset` can
interoperate with, compose against, or explicitly avoid duplicating. Organized by
capability cluster, with repo, license, surface (tools/resources/prompts),
transport, and an `prompt-to-asset` interop note for each.

Legend — **Transport**: `stdio` (local subprocess), `HTTP` (streamable HTTP /
JSON-RPC over HTTP), `SSE` (HTTP + Server-Sent Events, now legacy in the spec),
`WS` (WebSocket). **Surface**: T = Tools, R = Resources, P = Prompts.

---

## 1. Official / Reference

### 1.1 `modelcontextprotocol/servers` (reference)
- Repo: <https://github.com/modelcontextprotocol/servers>
- License: MIT
- Active reference servers: `everything`, `fetch`, `filesystem`, `git`,
  `memory`, `sequential-thinking`, `time`. None are image/media specific.
- Transport: stdio (reference).
- **Image-adjacent servers live in `modelcontextprotocol/servers-archived`**:
  `puppeteer`, `everart` (image gen), etc. Archived May 29 2025; read-only.
- Interop with `prompt-to-asset`: use `filesystem` for scoped read/write of an
  asset bundle directory; use `fetch` only as a last-resort pull for reference
  images. Do not depend on archived servers.

### 1.2 MCP Registry
- <https://registry.modelcontextprotocol.io> — canonical discovery index.
- `mcp.so`, `smithery.ai`, `glama.ai`, `pulsemcp.com`, `mcpbundles.com` are
  secondary aggregators; quality varies. Treat as catalogs, not curation.

---

## 2. Design tools

### 2.1 Figma Dev Mode MCP (official)
- Vendor: Figma, bundled with the Figma desktop app (Dev Mode toggle).
- License: Proprietary; gated by Figma plan tier (Dev / Full seat on
  Professional+).
- Local endpoint: `http://127.0.0.1:3845`.
  - HTTP: `…/mcp`
  - SSE: `…/sse` (legacy, still published for older clients).
- Surface (T): write to canvas, generate code from selection, extract design
  context from frames, generate Figma designs from a web page.
- Interop: `prompt-to-asset` can pull brand tokens (colors, type ramp, spacing)
  from a selected frame to seed the Brand Bundle; can push a generated asset
  (logo, OG image, illustration) back onto the canvas. Rate-limited per Figma
  plan.

### 2.2 Framelink `figma-developer-mcp` (community)
- Repo: <https://github.com/GLips/Figma-Context-MCP>, npm `figma-developer-mcp`.
- License: MIT. ~14k stars, ~110k weekly npm downloads (Nov 2026).
- Auth: Figma Personal Access Token (REST API, no desktop app required).
- Transport: stdio (`npx -y figma-developer-mcp --figma-api-key=… --stdio`).
- Surface (T): fetch file/frame/node metadata simplified to layout+style;
  image download; comment read.
- Interop: better than Dev Mode MCP for headless/CI pipelines — useful when
  `prompt-to-asset` needs to read brand primitives from a Figma file without
  requiring the user to have Figma Desktop running.

### 2.3 Blender MCP (`ahujasid/blender-mcp`)
- Repo: <https://github.com/ahujasid/blender-mcp>
- License: MIT.
- Architecture: socket-based Blender addon + Python MCP server; 2-way comms.
- Transport: stdio (client ↔ server), TCP socket (server ↔ Blender addon).
- Surface (T): object/material/scene manipulation, viewport screenshots, Python
  execution in Blender; integrations for Hunyuan3D, Poly Haven, Sketchfab.
- Interop: out of scope for the current `prompt-to-asset` 2D-asset pipeline.
  Relevant only if we add a **3D hero / isometric illustration** path. Park
  behind a feature flag; do not wire into default skills.

---

## 3. Browser automation (screenshot / OG-preview / design-dev sync)

### 3.1 Playwright MCP (official, `microsoft/playwright-mcp`)
- Repo: <https://github.com/microsoft/playwright-mcp>
- License: Apache-2.0 (Microsoft).
- Transport: stdio and HTTP (streamable). Node 18+.
- Surface (T): navigate, snapshot (accessibility-tree based), click, type,
  screenshot, network capture, console, tabs, etc. Accessibility-tree first;
  vision-only via explicit screenshot.
- Interop: strongest fit for `prompt-to-asset`'s **OG-image verification**
  (render the page at 1200×630, take screenshot, diff), **favicon rendering
  checks** (dark/light), and **illustration embed QA**. Prefer over Puppeteer
  MCP.

### 3.2 Puppeteer MCP (archived)
- Repo: <https://github.com/modelcontextprotocol/servers-archived/tree/main/src/puppeteer>
- License: MIT. **Archived** May 29 2025.
- Known limitation: screenshots stored only in server memory, not on disk
  (issue #865, closed as `not_planned`). This alone makes it unsuitable for
  our asset-bundle workflow.
- Interop: **do not adopt**. Use Playwright MCP instead.

---

## 4. Image generation (diffusion / foundation)

### 4.1 ComfyUI Cloud MCP (official, `Comfy-Org/comfy-cloud-mcp`)
- Repo: <https://github.com/Comfy-Org/comfy-cloud-mcp>
- Endpoint: `https://cloud.comfy.org/mcp` (remote; limited early access).
- License: see repo (Comfy Org); API-key gated via
  `platform.comfy.org/profile/api-keys`.
- Transport: streamable HTTP (remote).
- Surface (T): search workflow templates, search model catalog (checkpoints,
  LoRAs, VAEs, controlnets), search nodes; submit workflow to cloud GPU,
  upload input image, poll status, retrieve outputs, chain workflows, cancel,
  queue status; list/manage saved workflows.
- Interop: lets `prompt-to-asset` drive complex ComfyUI graphs
  (IP-Adapter + LoRA + ControlNet brand-lock pipelines) **without running a
  local GPU**. Strong candidate for the illustration + transparent-bg paths.

### 4.2 ComfyUI MCP (`joenorton/comfyui-mcp-server`) — local
- Repo: <https://github.com/joenorton/comfyui-mcp-server>
- License: MIT.
- Transport: streamable HTTP over WebSocket to a local ComfyUI instance.
- Surface (T): auto-discover workflows from the local ComfyUI install and
  expose each as a parameterized tool; job polling, cancel, regenerate.
- Interop: local/dev substitute for the Cloud MCP above. Same mental model,
  same JSON-schema workflow params.

### 4.3 MCP ComfyUI Flux (`dhofheinz/mcp-comfyui-flux`)
- Repo: <https://github.com/dhofheinz/mcp-comfyui-flux>
- License: see repo.
- Packaging: Docker (PyTorch 2.5.1, CUDA 12.1, fp8).
- Surface (T): Flux schnell / dev generation, built-in RMBG-2.0 background
  removal, 4× upscaler.
- Interop: opinionated turnkey container — good for CI/e2e, not for our
  primary workflow where we want explicit IP-Adapter/LoRA control.

### 4.4 Replicate MCP — official
- Endpoint: `https://mcp.replicate.com/sse` (hosted) + npm `replicate-mcp`
  (`npx -y replicate-mcp`). Docs: <https://replicate.com/docs/reference/mcp>.
- License: Replicate proprietary service; npm wrapper TBC.
- Transport: SSE (hosted) / stdio (npm).
- Surface (T): search models, create prediction, get prediction, list
  collections, view images.
- Interop: the **cleanest** single tool for multi-model routing — Flux,
  Recraft v3 SVG, RMBG-2.0, CLIP-interrogator, upscalers all behind one auth.
  Strong candidate for `asset-enhancer` router.
- Community predecessor `deepfates/mcp-replicate` is **deprecated** — don't
  adopt.

### 4.5 Replicate Flux MCP (`awkoy/replicate-flux-mcp`)
- Flux Schnell raster + Recraft v3 SVG vector via Replicate; batch gen.
- Less general than the official Replicate MCP; skip.

### 4.6 OpenAI images MCP servers
- Several independent implementations:
  - `199-biotechnologies/mcp-openai-image` (Node, Apache-2.0 typical).
  - `SureScaleAI/openai-gpt-image-mcp` (`openai-gpt-image-mcp-server` on npm).
  - `openai-gpt-image-1-mcp` on PyPI.
- Surface (T): `generate_image`, `edit_image` (inpaint/outpaint/composite),
  `create_variation`; PNG/JPEG/WebP; batch up to N; quality tiers.
- Transport: stdio.
- Interop: required for the `og-image` hero layer and for text-on-image
  compositions where Flux/SD still fail. Pick **one** implementation and
  pin it.

### 4.7 Gemini / Nano Banana Pro image MCP
- `adityabawankule/image-gen-mcp` and similar. Aspect ratio up to 4K,
  negative prompts, up to 14 reference images (edit/compose).
- Interop: relevant once Gemini imagegen capabilities (wordmark rendering,
  multi-ref composition) beat OpenAI/Flux for a given skill. Covered in the
  `gemini-imagegen` skill already; an MCP wrapper would let non-Claude
  clients call it uniformly.

### 4.8 Hosted convenience servers
- `imagemcp.io` — cloud MCP, multi-provider. Closed source; vendor lock-in.
- `pvliesdonk/image-generation-mcp` — multi-provider (OpenAI, SD WebUI,
  placeholder) with keyword-based auto-selection and CDN-ish transforms.
- `Ishan96Dev/mcp-openai-image-generator` — OpenAI-only, batch-capable.

---

## 5. Raster → vector / background / upscaling

### 5.1 VectoSolve MCP (`Vectosolve/vectosolve-mcp`, npm `@vectosolve/mcp`)
- License: proprietary SaaS (paid per call).
- Surface (T): `vectorize` ($0.20), `remove-background` ($0.07),
  `generate-logo` with hex palette (`["#0090ff","#1cb721"]`, $0.25–$0.40),
  `upscale` up to 4× ($0.15).
- Transport: stdio (npm).
- Interop: overlaps directly with our `vectorize`, `transparent-bg`, `logo`,
  upscaler skills. **Use for comparison / paid-tier fallback**, not as the
  default — we already have local potrace/vtracer/Recraft paths.

### 5.2 SVG.new MCP (`svgnew/mcp`)
- Repo: <https://github.com/svgnew/mcp>
- Surface (T): `vectorize`, `remove-background`, `recolor-svg` (free),
  `simplify-svg` (free), `batch-vectorize`.
- Interop: `recolor-svg` and `simplify-svg` are genuinely useful free tools
  we don't currently expose; worth wrapping.

### 5.3 SVGverseAI MCP
- Text-to-vector + PNG/JPG-to-SVG + asset collections. Closed SaaS.
- Skip in favor of our internal `vectorize` pipeline + Recraft.

---

## 6. Post-processing / file ops

### 6.1 ImageMagick MCPs (multiple community)
- `AeyeOps/mcp-imagemagick` and similar (the "imagemagick_mcp_server"
  family). Typical surface (T): `convert`, `resize` (aspect-aware),
  `batch-process`, format conversion.
- Transport: stdio (Bun/Node/Python variants).
- Requires ImageMagick on the host.
- Interop: low-value — our skills already shell out to ImageMagick /
  libvips / sharp locally with more control. An MCP wrapper only helps for
  clients that can't execute shell tools. Deprioritize.

### 6.2 "Imagician" MCP
- Higher-level resize/crop/rotate/watermark tool. Same verdict as 6.1.

---

## 7. Asset catalogs (stock / icons / fonts / animations)

### 7.1 Iconify MCP (`imjac0b/iconify-mcp-server`)
- Repo: <https://github.com/imjac0b/iconify-mcp-server>
- License: MIT (typical for this author; verify).
- Surface (T): search 200k+ icons across 200+ sets, fetch SVG, browse sets,
  filter by collection.
- Transport: stdio (npm).
- Interop: direct fit for the `favicon` and icon-pack flows — lets the agent
  pick an existing Iconify glyph before ever reaching for a diffusion model.
  Read the `icons/ecosystem` research notes and reuse.

### 7.2 Unsplash MCPs
- Multiple impls: `hellokaton/unsplash-mcp-server`,
  `jeffkit/unsplash-mcp-server`, etc.
- Surface (T): photo search (keywords, color, orientation, sort), pagination;
  base64 or JSON response.
- Requires Unsplash access key.
- Interop: strong for the `og-image` hero layer and `illustration` photo
  backplates. Pick one, pin it.

### 7.3 Pexels MCP
- Observed in aggregator listings; no clearly dominant repo surfaced in this
  pass. Treat as "available but not canonical"; build our own thin wrapper
  if needed.

### 7.4 LottieFiles MCP (`junmer/mcp-server-lottiefiles`)
- Surface (T): search Lottie animations, get animation detail, pagination.
- Transport: stdio.
- Interop: useful for empty-state / onboarding illustration when animated
  deliverables are requested. Out of default scope; wire into `illustration`
  skill as an optional source.

### 7.5 Google Fonts MCPs
- `sliday/google-fonts-skill` (`google-fonts-mcp` on PyPI, v1.3): BM25 font
  search over 1,923 curated fonts with personality/mood tags, pairing mode
  (73 vetted pairs), CSS / Tailwind config generation, 8 modular type scales.
- `mcpbundles.com/bundle/google-webfonts`: basic font-list fetcher, hosted.
- Transport: stdio (PyPI) / HTTP (hosted).
- Interop: directly powers the `logo`, `og-image`, and `illustration` skills
  when they need a deterministic font pick keyed to brand voice. Use the
  PyPI Python one for rich pairing, the hosted one only as a fallback.

---

## 8. Color / palette / conversion

### 8.1 Coolors MCP (`x51xxx/coolors-mcp`, npm `@trishchuk/coolors-mcp`)
- License: MIT.
- Surface (T): RGB/HSL/HSV/LAB/XYZ/HCT conversion, Material Design 3 theme
  gen, WCAG contrast checking, image palette extraction, palette generation
  (monochromatic/analogous/complementary/triadic/tetradic), gradient synthesis.
- Transport: stdio.
- Interop: richest palette/theme surface; good for the `logo` and
  `illustration` brand-bundle steps.

### 8.2 `rog0x/mcp-color-tools`
- HEX/RGB/HSL/CMYK + palette + WCAG + mixing + CSS gradients. MIT.

### 8.3 `bennyzen/mcp-color-convert`
- HEX/RGB(A)/HSL(A)/**OkLCH/OkLab**/named + WCAG + lighten/darken/saturate.
- MIT. OkLCH support is the differentiator — preferred for perceptually
  uniform palette edits.

Pick **one** of 8.1 / 8.3 to standardize on; 8.1 has broader coverage,
8.3 has better perceptual color spaces.

---

## 9. Notable gaps (no strong MCP found as of 2026-04)

- **Font rasterization / live preview** (render a string in Font X at size
  Y → PNG): no dominant MCP. Local sharp/skia wrapper is still best.
- **SVG optimization (SVGO)**: no first-class MCP; we use SVGO directly.
- **Pexels** (stable, maintained MCP): weak.
- **Brand-color extraction from logo** (vs. generic image palette): weak;
  our own brand-bundle logic is ahead.
- **LoRA training / fine-tune orchestration**: handled by Replicate MCP,
  no dedicated asset-MCP for it.

---

## 10. How `prompt-to-asset` composes with these

Think of `prompt-to-asset` as an **orchestrator** whose skills call out to
external MCPs for specialized primitives rather than re-implementing them.

Default wiring we should bias toward:

| Skill                | Primary MCP                         | Fallback / alt                           |
|----------------------|--------------------------------------|------------------------------------------|
| `asset-enhancer`     | **Replicate MCP (official)**        | OpenAI images MCP, ComfyUI Cloud MCP     |
| `logo`               | Replicate (Flux + Recraft v3)       | OpenAI (wordmarks)                       |
| `favicon`            | **Iconify MCP** → then Recraft SVG  | SVG.new MCP                              |
| `og-image`           | Satori+resvg local, Playwright MCP  | Unsplash MCP (hero), OpenAI (hero)       |
| `illustration`       | ComfyUI Cloud MCP (IP-Adapter/LoRA) | Replicate, Gemini imagegen MCP           |
| `transparent-bg`     | Local RMBG-2.0 / birefnet           | VectoSolve / Replicate (cloud fallback)  |
| `vectorize`          | Local vtracer/potrace + Recraft     | SVG.new MCP (`simplify-svg` etc.)        |
| Design-sync          | **Figma Dev Mode MCP** (live edits) | Framelink `figma-developer-mcp` (CI)     |
| Render verification  | **Playwright MCP**                  | —                                        |
| Brand palette / type | Coolors MCP + google-fonts-mcp      | mcp-color-convert (OkLCH)                |
| 3D / isometric       | Blender MCP (future)                | —                                        |

Principles:
1. **Don't reimplement what a well-maintained MCP already does.** Wrap it,
   don't rebuild it (ImageMagick, Iconify, Google Fonts, color math).
2. **Prefer official / Registry-listed servers** over aggregator-only ones.
3. **Pin MCP versions** — the space churns monthly; "always latest" will bite.
4. **Transport preference**: stdio for local pipelines (deterministic,
   sandboxable); streamable HTTP for hosted (Replicate, ComfyUI Cloud,
   Figma Dev Mode). Avoid new adoption of SSE-only servers (legacy).
5. **License hygiene**: VectoSolve / SVGverseAI / imagemcp.io are paid SaaS
   — surface them as optional, never as the default path.

---

## Sources

- <https://github.com/modelcontextprotocol/servers> — official reference server index.
- <https://github.com/modelcontextprotocol/servers-archived> — archived Puppeteer, EverArt, etc.
- <https://registry.modelcontextprotocol.io> — canonical MCP registry.
- <https://github.com/ahujasid/blender-mcp> — Blender MCP addon + server.
- <https://developers.figma.com/docs/figma-mcp-server/local-server-installation/> — official Figma Dev Mode MCP.
- <https://github.com/GLips/Figma-Context-MCP> — Framelink figma-developer-mcp.
- <https://github.com/microsoft/playwright-mcp> — official Playwright MCP.
- <https://docs.comfy.org/development/cloud/mcp-server> + <https://github.com/Comfy-Org/comfy-cloud-mcp> — ComfyUI Cloud MCP.
- <https://github.com/joenorton/comfyui-mcp-server> — local ComfyUI MCP.
- <https://github.com/dhofheinz/mcp-comfyui-flux> — Dockerized Flux+ComfyUI MCP.
- <https://replicate.com/docs/reference/mcp> + <https://mcp.replicate.com/> — official Replicate MCP.
- <https://github.com/deepfates/mcp-replicate> — deprecated community Replicate MCP.
- <https://github.com/199-biotechnologies/mcp-openai-image>, <https://pypi.org/project/openai-gpt-image-1-mcp/> — OpenAI images MCPs.
- <https://www.adityabawankule.io/projects/image-gen-mcp> — Gemini / Nano Banana Pro MCP.
- <https://github.com/Vectosolve/vectosolve-mcp> — VectoSolve (vectorize / bg-removal / logo / upscale).
- <https://github.com/svgnew/mcp> — SVG.new MCP.
- <https://github.com/imjac0b/iconify-mcp-server> — Iconify MCP.
- <https://github.com/hellokaton/unsplash-mcp-server> — Unsplash MCP.
- `https://github.com/junmer/mcp-server-lottiefiles` — LottieFiles MCP.
- <https://pypi.org/project/google-fonts-mcp/> + <https://github.com/sliday/google-fonts-skill> — Google Fonts MCP (typography-aware).
- <https://www.mcpbundles.com/bundles/google-webfonts> — hosted Google Fonts MCP.
- <https://github.com/x51xxx/coolors-mcp> — Coolors MCP.
- <https://github.com/rog0x/mcp-color-tools> — MCP color tools.
- <https://github.com/bennyzen/mcp-color-convert> — OkLCH-capable color MCP.
- <https://mcp.so>, <https://smithery.ai>, <https://glama.ai>, <https://www.pulsemcp.com>, <https://www.mcpbundles.com> — aggregator listings.
