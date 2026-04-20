# 3D Assets, Mockups & Rendering Tools

Research digest for `prompt-to-asset` 3D capabilities: logo mockups, product shots,
presentation reels, 3D icon packs, and the open-source toolchain to render them.

**Research value: high** — the CC0 3D ecosystem (Poly Haven + Quaternius + Kenney +
ambientCG + 3dicons) is deep enough to drive a commercially safe mockup pipeline
today, and Blender + gltf-pipeline + three.js cover the "render a logo as a 3D plate"
path end-to-end.

---

## 1. Asset Library Matrix

| Source | License | What's there | Commercial use | API / automation |
|---|---|---|---|---|
| **Kenney.nl** | CC0 (public domain) | 2D + **3D low-poly kits** (platformer, minigolf, racing, UI, tools) in OBJ/FBX/GLTF | ✅ unrestricted, no attribution | No official API; static downloads, mirrored on itch.io |
| **Poly Haven** | CC0 | HDRIs (up to 16K), PBR textures (8K+), photoreal models | ✅ unrestricted | ✅ **public REST API** at `api.polyhaven.com` (requires unique `User-Agent`; commercial scraping needs sponsorship/custom license) |
| **Quaternius** | CC0 | Hundreds of low-poly models ("Ultimate" packs: Nature, RPG, Modular Dungeon, Cars, Sci-Fi, etc.) in FBX/OBJ/BLEND | ✅ unrestricted | No API; ZIP packs via quaternius.com + itch.io |
| **Sketchfab** | Mixed (CC0, CC-BY, CC-BY-NC, CC-BY-SA, CC-BY-ND, Standard) | ~millions of user models | Only CC0 / CC-BY / CC-BY-SA are safe for commercial use (CC-BY requires attribution; CC-BY-SA viral) | ✅ **Download API** (REST) with `license` filter; returns glTF/GLB/USDZ. Requires end-user OAuth login unless Sketchfab grants app-level creds. Must display license + link back. |
| **ambientCG** | CC0 | PBR materials, HDRIs, some 3D models | ✅ unrestricted | ✅ **API v3** at `docs.ambientcg.com/api/v3/assets/` with filters; `downloads` field returns direct links. Single-operator reliability — cache locally. |
| **Fab (Epic)** | CC-BY or "Fab Standard License" | Megascans (some free tiers), free-every-two-weeks drops, UE-leaning but usable in any tool | ✅ commercial use under Standard License; CC-BY items need attribution | No public programmatic API for free-tier scraping; Fab content is per-asset-licensed and cannot be redistributed standalone |
| **CGTrader** free tier | "Royalty Free" (CGTrader's own) — **not** CC0 | Mixed quality free models | ✅ for use inside rendered output / games, but **cannot be re-extractable** from the shipped artifact; cannot be resold in original digital form | No free public API; TOS forbids AI training without permission |
| **Free3D** | ⚠️ **Per-uploader, varies** | Mixed catalog; many models are "free for personal use only" | ❌ must check each asset individually; no indemnification from the platform | No API; risky for a bulk/automated pipeline |
| **3dicons.co** | CC0 | 100+ isometric 3D icons, 1440+ renders, 4 color styles, 3 camera angles, PNGs + Blender source + Figma | ✅ unrestricted | Static bundles (Gumroad/GitHub `realvjy/3dicons`) |
| **OpenGameArt** CC0 section | CC0 | Long tail of CC0 3D bits (isometric tiles, icon packs, etc.) | ✅ when tag is CC0-1.0 | No API; scrape by tag filter |

### Quick ranking for `prompt-to-asset`

1. **Safe, bulk, automatable → Poly Haven, ambientCG, Quaternius, Kenney, 3dicons.** These are the backbone.
2. **Curate-only, per-asset → Sketchfab (CC0 / CC-BY filter), Fab free tier.** Good for one-off hero assets; attach license metadata to each ingested file.
3. **Avoid for automated ingestion → Free3D, CGTrader free tier.** License-per-uploader / non-CC models create IP risk at scale.

---

## 2. Use Cases Mapped to Sources

- **3D-rendered logo mockups** (logo on a card/plate, on a coffee mug, on a phone, on a sign)
  - Mockup geometry: Kenney kits, Quaternius props, free Sketchfab CC0 models.
  - Studio backdrop: Poly Haven HDRIs drive the lighting, reflections, and environment.
  - Surface detail: ambientCG PBR materials for card stock, brushed metal, fabric, wood.
- **Product shots** (app icon on device, sticker sheet in a scene, branded merch)
  - Device models: Kenney "Tools Pack", Sketchfab CC0 phone/laptop models, Fab free-tier devices.
  - Merch: Quaternius generic props + ambientCG textures for re-skinning.
- **Presentation reels / hero loops**
  - Drive them through Blender's camera animation + Poly Haven HDRI turntable,
    exporting an MP4 or a Lottie-equivalent three.js loop.
- **3D icon packs (in-app)**
  - Pre-render **3dicons.co** (CC0) as PNG sprites for immediate use, and keep the
    Blender source for bespoke recolors per user brand.

---

## 3. Rendering Toolchain (All OSS)

### 3.1 Blender (GPL, CLI scriptable) — the heavy renderer

Blender runs headless with `-b` / `--background` and executes Python via `-P` /
`--python` or inline `--python-expr`. Order of args matters: opening a `.blend`
file can overwrite earlier flags, so pass the file first and the script after.

```bash
blender template.blend -b \
  --python render_logo.py \
  -- --logo /tmp/logo.svg --out /tmp/mockup.png --w 2048 --h 2048
```

Inside `render_logo.py`:

- Import the user's SVG (`bpy.ops.import_curve.svg`) and solidify/extrude it.
- Apply a PBR material (roughness/metallic from the user palette).
- Load an HDRI from Poly Haven as the World environment.
- Set `bpy.context.scene.render.engine = 'CYCLES'` (or `'BLENDER_EEVEE_NEXT'` for
  10–50× faster previews).
- `bpy.ops.render.render(write_still=True)`.

Benefits: full PBR, DOF, motion blur, animation reels. Cost: cold-start +
first-frame latency (seconds to tens of seconds). Good for "hero" exports; too
heavy for per-keystroke previews.

Wrapper option: **`blenderless`** (PyPI) simplifies thumbnail + turntable batch
renders if a lighter abstraction is wanted.

### 3.2 three.js / drei / Threlte — the live renderer

For in-browser previews where "good enough, instant" beats "photoreal, slow":

- `SVGLoader.parse()` → `SVGLoader.createShapes(path)` → `THREE.ExtrudeGeometry`
  gives an extruded logo plate from the user's SVG directly in the browser.
  Gotcha: SVG Y-axis is inverted vs three.js; flip the geometry on import.
- `@react-three/drei` ships `<Text3D>`, `<Environment>` (loads Poly Haven HDRIs
  directly by name), `<ContactShadows>`, `<MeshReflectorMaterial>`, and
  `<RenderTexture>` — enough to build a studio mockup in ~50 lines.
- **Threlte** (`@threlte/core` + `@threlte/extras`) mirrors drei for Svelte/
  SvelteKit; same capabilities if the app is not React.
- Screenshot capture: render at target resolution in an offscreen canvas, then
  `renderer.domElement.toDataURL('image/png')` (or `toBlob` for streaming).
  Use `preserveDrawingBuffer: true` on the `WebGLRenderer` or render into a
  `WebGLRenderTarget` and `readRenderTargetPixels`.

### 3.3 gltf-pipeline / glTF-Transform — the optimizer

Any model ingested from Poly Haven / Sketchfab / Quaternius should be
normalized before shipping to the browser:

```bash
npm i -g gltf-pipeline
gltf-pipeline -i model.gltf -o model.glb -d         # draco compression
```

- `gltf-pipeline` (Cesium): GLB⇄glTF, Draco, embed/separate buffers.
- `@gltf-transform/cli` (donmccurdy): richer — Draco **and** Meshopt, KTX2/basis
  texture compression, deduplication, quantization, weld/simplify. This is the
  modern tool; prefer it over raw `gltf-pipeline` for new work.

Expect 5–15× size reduction on typical Sketchfab downloads when combining Draco
+ Meshopt + KTX2.

### 3.4 Recommended architecture for `prompt-to-asset`

```
user logo (SVG/PNG)
        │
        ├──► browser preview path ──► three.js + drei Environment(HDRI) + ExtrudeGeometry ──► <canvas> → toDataURL
        │                                                                                      (instant, ~60fps)
        │
        └──► hero render path ─────► Blender headless + scripted scene
                                       + Poly Haven HDRI + ambientCG material + Kenney/Quaternius prop
                                       ──► PNG / MP4                       (seconds, photoreal)
```

Cache the curated asset bundle (HDRIs + materials + a handful of scenes) locally
— each CC0 source's CDN is not promised to be reliable for production
(ambientCG explicitly disclaims this), and you also want deterministic renders.

---

## 4. License Hygiene Checklist

1. **Ship license metadata with every ingested asset.** Keep a JSON sidecar:
   `{ source, url, license, author, sketchfab_uid? }`. CC-BY assets need the
   credit surfaced somewhere the user can see (about/credits page).
2. **Block CC-BY-NC and CC-BY-ND** at ingestion time if the product has any
   commercial surface. Block CC-BY-SA unless you're OK with the viral clause
   covering derivative 3D scenes.
3. **Sketchfab Download API** requires end-user auth by default. Either
   pre-download a curated CC0/CC-BY subset into our own bucket, or implement
   an OAuth flow — do not scrape.
4. **Poly Haven API** is free for non-commercial and academic use; commercial
   bulk use needs sponsorship/custom terms. Mirror a curated subset and stop
   hitting their API per-render in production.
5. **Free3D + CGTrader free tier**: skip for automated ingestion. If a designer
   hand-picks one asset, record the per-model license and embed it so the
   model can't be re-extracted from the final artifact (CGTrader TOS).

---

## 5. Concrete Starter Bundle (suggested)

- ~20 HDRIs from Poly Haven: 5× studio, 5× outdoor, 5× indoor, 5× abstract/stylized.
- ~40 PBR materials from ambientCG: paper, cardboard, metal, plastic, fabric, wood, glass, concrete.
- Kenney "Platformer Kit" + "Tools Pack" + "Prototype Kit" → generic 3D props.
- Quaternius "Ultimate Modular Pack" + "Ultimate Nature Pack" → staging + scenery.
- 3dicons.co full set → pre-rendered 3D icon library (PNG + BLEND source).
- Blender scene templates: "product-on-plate", "logo-extrude", "phone-mockup",
  "sticker-sheet", "turntable-loop".

Total footprint after gltf-transform + KTX2: estimate low single-digit GB.

---

## Sources

- [Kenney.nl assets](https://www.kenney.nl/assets) — CC0 2D + 3D packs.
- [Poly Haven API](https://polyhaven.com/our-api) — CC0 HDRIs/textures/models, REST API, commercial usage terms.
- [Quaternius packs](https://quaternius.com/packs/) — CC0 low-poly ultimate packs.
- [Sketchfab Download API](https://sketchfab.com/developers/download-api) and [license filter blog](https://sketchfab.com/blogs/community/refine-downloadable-model-searches-with-new-license-filters/).
- [ambientCG API v3 docs](https://docs.ambientcg.com/api/v3/assets/) and [ambientcg-downloader](https://github.com/alvarognnzz/ambientcg-downloader).
- [Fab licensing docs](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab) and [free content page](https://www.unrealengine.com/en-US/fabfreecontent).
- [CGTrader Royalty Free License](https://help.cgtrader.com/hc/en-us/articles/360015124437-Royalty-Free-License).
- [Free3D license guide](https://www.licenseorg.com/guide/3d-assets/free3d) — per-uploader variance.
- [3dicons.co](https://old.3dicons.co/) and [realvjy/3dicons on GitHub](https://github.com/realvjy/3dicons).
- [Blender CLI reference (RenderDay)](https://renderday.com/blog/mastering-the-blender-cli) and [Blender Stack Exchange: headless Python](https://blender.stackexchange.com/questions/1365/how-can-i-run-blender-from-command-line-or-a-python-script-without-opening-a-gui).
- [CesiumGS/gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) and [glTF Transform CLI](https://gltf-transform.dev/cli.html).
- [Three.js ExtrudeGeometry docs](https://threejs.org/docs/pages/ExtrudeGeometry.html) and [SVGLoader walkthrough](https://muffinman.io/blog/three-js-extrude-svg-path/).
- [drei docs](https://drei.docs.pmnd.rs/) (RenderTexture, Environment, Text3D).
- [Threlte docs](https://threlte.xyz/docs/learn/getting-started/your-first-scene) — Svelte equivalent of drei.
