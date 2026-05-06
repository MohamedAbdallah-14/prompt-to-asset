# SDXL + ControlNet (MLSD) + IP-Adapter — wireframe-locked UI

The only stack where the three roles (structure / style / content) map to **three distinct adapters** with weight knobs. Local / self-hosted via ComfyUI or A1111. Use when you need precise wireframe lock and have brand screenshots for style.

**Caveat:** SDXL can NOT render UI text legibly (HF model card admits this). Composite real type post-render — this is non-negotiable for any label, button, or chart axis.

**Stack:**
- **ControlNet MLSD** — detects only straight lines. Best for screen layouts with grid structure, table rules, panel borders. ("Practitioners use it for UI" — folklore, not in official docs.)
- **ControlNet Lineart / AnyLine** — for hand-drawn wireframes
- **IP-Adapter (SDXL)** — style transfer from a screenshot of the target app
- **Reference-only preprocessor** — alternative to IP-Adapter; transfers "overall resemblance to the reference image" with a Style Fidelity slider

---

## Recipe — wireframe + style + logo (3 adapters)

ComfyUI graph layout (no JSON shipped here — assemble in your ComfyUI):

```
[ Empty Latent ]
       │
       ▼
[ KSampler (SDXL Base or Juggernaut XL) ]
       │
       ├── Positive Prompt: "realistic SaaS dashboard UI screenshot, modern light mode,
       │                     Inter-style typography, clean cards with subtle shadows,
       │                     KPI metrics row above an area chart above a transactions table,
       │                     emerald and slate palette, 1440x900 desktop, real shipped product"
       │
       ├── Negative Prompt: "lorem ipsum, garbled text, blurry, sketch, watermark,
       │                     concept art, design mockup label, checkerboard, low quality"
       │
       ├── ControlNet MLSD (weight 0.8–1.0)
       │   └── Input: wireframe.png (greyscale layout, black lines on white)
       │
       ├── IP-Adapter SDXL (weight 0.4–0.6 for style, 0.7+ for tight match)
       │   └── Input: brand-screenshot.png (target app for visual signature)
       │
       └── Optional second IP-Adapter (weight 0.6)
           └── Input: brand-logo.png
       │
       ▼
[ VAE Decode ] → image
       │
       ▼
[ Composite in Photoshop / SVG ] → real text + icons + chart data
```

**Weight tuning:**
- ControlNet weight 0.8–1.0 → strict wireframe lock (recommended for UI structure)
- ControlNet weight 0.4–0.7 → softer guidance, more model creativity (use for hero shots not dashboards)
- IP-Adapter weight 0.4–0.6 → style influence
- IP-Adapter weight 0.7+ → tight style match (can over-fit and produce mushy detail)

## Wireframe input format

For MLSD:
- Greyscale or 1-bit black/white
- Black lines (panel boundaries, table rules, sidebar dividers, grid lines) on white background
- Clean, no anti-aliasing artifacts (run through `cv2.threshold` if hand-drawn)
- 1024×1024 or 1024×768 for SDXL native

For Lineart / AnyLine:
- Hand-drawn or sketched wireframe
- Anti-aliased, can have variable line weights
- Still 1024-class resolution

## Practitioner workflows to reference

Assembled in the wild but not shipped as UI presets:

- [InstaSD — SDXL style transfer with IPAdapter and ControlNet](https://www.instasd.com/post/sdxl-style-transfer-with-ipadapter-and-controlnet) — generic, adapt for UI
- [OpenArt — ControlNet++ Union SDXL with IPAdapter](https://openart.ai/workflows/aiguildhub/controlnet-union-sdxl-with-ipadapter-for-style-transfer/To0Oa8AI2zRW2d7CnVSH)
- [Civitai — All-in-one workflow v3 (CN + IPA + ADetailer)](https://civitai.com/models/1235984/comfyui-workflow-all-in-one-text-to-image-workflow-controlnet-ip-adapter-adetailer-ella)

These are not UI-specific. Vendor the patterns and adapt the prompt.

## Composite real text post-render

Mandatory step. SDXL's text output is unreliable past 1–2 short words. Pipeline:

1. Generate the surrounding scene (cards, dividers, chart shapes, sidebar layout)
2. Export to SVG or layered PSD
3. Composite real text via Satori (React → SVG), Skia, or Figma
4. Real chart data via Recharts / Vega-Lite, then export to PNG and overlay
5. Real icons from Lucide / Phosphor / Heroicons

The output of SDXL is the *background plate*. Real UI text never comes from the diffusion model.

## When this stack beats hosted APIs

- You need strict wireframe lock with weight control (no hosted API exposes ControlNet weight directly)
- Self-hosted compliance / no data leaving infra
- Iteration cost matters — local SDXL is essentially free per generation
- You have a strong brand-screenshot library for IP-Adapter style transfer

## When to skip and use a hosted API instead

- You don't have ComfyUI / A1111 running
- You need legible in-image text without compositing
- Iteration speed > control (ComfyUI graph setup is 30+ minutes)
- You want a single API call to handle everything

For those: gpt-image-2 with `/edits` and 16 refs is closer to one-shot.

## Whitespace this fills

Per the OSS research stream: **no public ControlNet → wireframe → SDXL/Flux → UI workflow has been packaged for UI.** This recipe is the closest to a documented version. Building it as a ComfyUI workflow JSON + a UI-specific LoRA fine-tuned on RICO/wave-ui-25k is a real OSS contribution opportunity.

## Also possible: Flux IP-Adapter

If you prefer Flux base over SDXL, swap:
- IP-Adapter SDXL → IP-Adapter Flux ([XLabs-AI/flux-ip-adapter](https://huggingface.co/XLabs-AI/flux-ip-adapter) or [InstantX/FLUX.1-dev-IP-Adapter](https://huggingface.co/InstantX/FLUX.1-dev-IP-Adapter))
- Flux ControlNet support is thinner than SDXL — verify the preprocessor you need is published before committing

Flux 2 has multi-ref via API directly; if you're paying for a Flux 2 endpoint, prefer the API workflow over self-hosted ControlNet stacking.
