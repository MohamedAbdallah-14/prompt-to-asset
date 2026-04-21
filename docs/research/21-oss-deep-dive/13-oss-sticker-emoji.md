---
wave: 1
role: niche-discovery
slug: 13-oss-sticker-emoji
title: "OSS sticker / emoji / avatar generators"
date: 2026-04-19
sources:
  - https://github.com/eyenpi/sticker-generator
  - https://www.philschmid.de/generate-stickers
  - https://github.com/EvanZhouDev/open-genmoji
  - https://huggingface.co/EvanZhouDev/open-genmoji
  - https://github.com/VIKAS9793/charactercraft-pro
  - https://github.com/oftenliu/consistent-character
  - https://github.com/vipinvsist/StickerVerse
  - https://github.com/starkdmi/AvatarStickers
  - https://github.com/xsalazar/emoji-kitchen
  - https://github.com/UCYT5040/Google-Emoji-Kitchen-Research
  - https://github.com/suhas-sunder/EmojiKitchenGame-Open-Source
  - https://github.com/microsoft/fluentui-emoji
  - https://github.com/googlefonts/noto-emoji
  - https://github.com/googlefonts/nanoemoji
  - https://github.com/hfg-gmuend/openmoji
  - https://github.com/LottieFiles/tgskit
  - https://github.com/kamyu1537/tgs2lottie
  - https://github.com/straystreyk/Sticker2LottieBot
  - https://github.com/solovieff/tg-sticker-to-emoji
  - https://github.com/sot-tech/LottieConverter
  - https://github.com/SwaggyMacro/LottieViewConvert
  - https://github.com/WizardLoop/MagicLottie
  - https://github.com/AlenVelocity/wa-sticker-formatter
  - https://github.com/Jobeso/react-native-whatsapp-stickers
  - https://github.com/lolocomotive/stickers
  - https://github.com/dicebear/dicebear
  - https://dicebear.com/
  - https://github.com/fangpenlin/avataaars
  - https://github.com/RobertBroersma/beanheads
  - https://tabler.github.io/avatars
tags: [sticker, emoji, avatar, transparency, dicebear]
---

# OSS sticker / emoji / avatar generators

## Why this niche matters to us

Sticker, emoji, and avatar generators share three requirements with brand
logos and mascots: **transparent PNG correctness**, **tight square/centred
composition in a small canvas**, and — for repeat usage — **character
consistency across variations** (seed-based or reference-image-based). The
category therefore acts as a live lab for exactly the correctness problems
our plugin needs to solve (G1/G2/G6 in the INDEX). It also gives us a
ready-made adjacent product surface — a `generate_sticker_pack` tool — that
the same prompt-enhancement + transparency + resize stack can power with
almost no extra infrastructure.

Three families exist: **(A) AI diffusion-driven sticker tools**, **(B)
static emoji libraries and pipelines**, and **(C) procedural/deterministic
avatar libraries**. The character-consistency trick differs in each family.

## A. AI diffusion-driven sticker/emoji tools

| Repo | URL | License | Gen vs compose | Transparency | Char-consistency |
|---|---|---|---|---|---|
| `eyenpi/sticker-generator` | <https://github.com/eyenpi/sticker-generator> | MIT | Generation (Gemini / Nano Banana Pro) | **Chromakey `#00FF00`** + HSV + morphology cleanup | None — per-prompt |
| `EvanZhouDev/open-genmoji` | <https://github.com/EvanZhouDev/open-genmoji> (~640★) | Repo license unclear; LoRA on Hugging Face | Flux.1-dev + custom **LoRA** + "Prompt Assist" metaprompt | Post-hoc (relies on LoRA's emoji look) | LoRA locks *style*, not identity |
| `oftenliu/consistent-character` | <https://github.com/oftenliu/consistent-character> | MIT | ComfyUI / Replicate pipeline | Post-hoc rembg | **Single-photo → IP-Adapter-style identity lock** |
| `VIKAS9793/charactercraft-pro` | <https://github.com/VIKAS9793/charactercraft-pro> | MIT | Gemini 2.5 Flash image editing | N/A (chat-ui focus) | Identity preservation via multi-turn image editing |
| `vipinvsist/StickerVerse` | <https://github.com/vipinvsist/StickerVerse> | MIT-ish, Colab | `gpt-image-1`, 3-sticker parallel fan-out (2 caricature + 1 Pixar) | `gpt-image-1` native alpha | Reference photo as identity anchor |
| `starkdmi/AvatarStickers` | <https://github.com/starkdmi/AvatarStickers> | GPL-3.0 | iOS/Swift + Core ML face detection; exports Telegram + WhatsApp | App-level | Face-graph captured per user |

Observations: (1) **Chromakey is a real alternative to matting.** Eyenpi
skips rembg/BRIA because Gemini/Nano Banana can be asked for a pure
`#00FF00` backdrop and HSV removal gives cleaner edges than post-hoc alpha
predictors — a fourth option for our transparency matrix (native RGBA >
LayerDiffuse > chromakey-instructed > post-hoc matting). (2) **LoRA
style-locking > prompt style words.** Open Genmoji encodes the Apple-emoji
look in ~209 MB of weights and one trigger word, more reliable than any
descriptive prompt. (3) **Character-consistency OSS is split** between
IP-Adapter/ComfyUI (`consistent-character`) and multi-turn Gemini image
editing (`charactercraft-pro`); both are worth studying before we ship
`generate_mascot_series`.

## B. Static emoji libraries and pipelines

| Project | URL | License | Format | Notes |
|---|---|---|---|---|
| `googlefonts/noto-emoji` | <https://github.com/googlefonts/noto-emoji> | OFL / Apache-2.0 | SVG → COLRv1 + CBDT via `nanoemoji` | Full build reference: SVG source → picosvg → resvg → font |
| `googlefonts/nanoemoji` | <https://github.com/googlefonts/nanoemoji> | Apache-2.0 | Color-font toolchain | The *build machinery* for emoji fonts |
| `microsoft/fluentui-emoji` | <https://github.com/microsoft/fluentui-emoji> | MIT | SVG / PNG / 3D / high-contrast | `SVGO` optimisation in CI; nanoemoji combo-emoji experiment (PR #113) |
| `hfg-gmuend/openmoji` | <https://github.com/hfg-gmuend/openmoji> (~4.4k★) | **CC-BY-SA-4.0** | SVG + PNG 72/618 | Viral-license caveat for embedding |

Emoji Kitchen (Gboard sticker mashups) has three OSS wrappers around
Google's internal CDN — `xsalazar/emoji-kitchen` (~1.6k★, MIT, 100k+ mashups,
live at `emojikitchen.dev`), `UCYT5040/Google-Emoji-Kitchen-Research`
(reverse-engineering notes + "Emoji Chef" UI), and
`suhas-sunder/EmojiKitchenGame-Open-Source`. All three **compose** by
fetching known-good image URLs; none generate. The valid-combinations
metadata JSON in `xsalazar/emoji-kitchen` is directly reusable if we want
an "emoji-mashup" flavour of our `compose_sticker` tool.

## C. Procedural/deterministic avatar libraries

| Library | URL | License | Mechanism | Char-consistency |
|---|---|---|---|---|
| **DiceBear** | <https://github.com/dicebear/dicebear> (~8.2–8.3k★, as of 2026-04) | MIT code, per-style art licences (mostly CC-BY-4.0) | **Composition** of predefined SVG parts; XorShift32 PRNG | **Seed → identical SVG across languages** — JS, PHP, Vue all produce byte-identical output |
| Avataaars | <https://github.com/fangpenlin/avataaars> | MIT (Pablo Stanley + Fang-Pen Lin) | React component picks from part-sets | Not deterministic by default; callers pass props explicitly |
| Bean Heads (ex-Big Heads) | <https://github.com/RobertBroersma/beanheads> (~1.5k★) | MIT | TypeScript/React, part composition | Same as Avataaars — deterministic if props fixed |
| Tabler Avatars | <https://tabler.github.io/avatars> | MIT | 124 static PNG illustrations | N/A (pre-made) |

DiceBear is the canonical reference for deterministic character identity in
OSS: **30+ styles** (`avataaars`, `bottts`, `lorelei`, `micah`,
`notionists`, `pixel-art`, `personas`, `fun-emoji`, `thumbs`, `shapes`,
`initials`, `identicon`, `rings`, `glass`, `icons`, `adventurer`, etc.),
all SVG, all driven by a 32-bit seeded PRNG, and available via JS lib, HTTP
API, CLI, Figma plugin, and playground. The part licences are per-style
(`personas` is CC-BY-4.0 from Draftbit, etc.) — we must **surface the
licence in any output** if we bundle the library.

## D. Telegram / WhatsApp delivery pipelines

These are format converters, not generators — they turn a prompt-generated
sticker into a platform-compliant pack:

- **`LottieFiles/tgskit`** (MIT, TS) — canonical TGS ↔ Lottie toolkit from
  LottieFiles themselves. <https://github.com/LottieFiles/tgskit>
- **`kamyu1537/tgs2lottie`** (MIT, TS, CLI + npm) — .tgs → Lottie JSON.
- **`sot-tech/LottieConverter`** (C++ CLI) — Lottie → PNG/GIF.
- **`SwaggyMacro/LottieViewConvert`** — desktop Lottie/TGS → GIF/WebP/APNG/
  MP4/MKV/AVIF/WebM; bulk + Discord/Telegram integration.
- **`WizardLoop/MagicLottie`** — offline browser Lottie/TGS editor.
- **`AlenVelocity/wa-sticker-formatter`** (MIT, TS) — images/GIFs/videos →
  WhatsApp WebP with pack/author metadata.
- **`Jobeso/react-native-whatsapp-stickers`** — RN bridge to register a
  pack with WhatsApp on iOS + Android.
- **`lolocomotive/stickers`** (GPL-3.0, Flutter) — Android-side editor and
  pack manager.

Together these cover the **static PNG → WhatsApp WebP**, **animated GIF →
TGS/Lottie**, and **pack-metadata-json → platform registration** seams.
None of them ships an LLM front end.

## Integration recommendations

**Bundle as "sticker" tools in our MCP.** The right first-party stickers
surface has four composable tools, all backed by our existing stack:

1. `generate_sticker` — takes a prompt + optional reference image + style
   preset (`kawaii | 3d | pixel | watercolor | minimal | retro` à la
   eyenpi), plus a `background_strategy` enum of
   `native_rgba | layerdiffuse | chromakey | matting`. Default routes to
   `gpt-image-1` `background: "transparent"` or Flux + LayerDiffuse;
   chromakey is the explicit Gemini/Nano-Banana path; matting (BRIA
   RMBG 2.0) is the fallback. Chromakey is a **new option** contributed by
   this niche — add it to the transparency decision matrix in 20b.
2. `compose_emoji_mashup` — composes two emoji from `openmoji` / `noto-emoji`
   / `fluentui-emoji` (plus `xsalazar/emoji-kitchen`'s valid-combo JSON),
   returning an SVG or PNG. Deterministic, no T2I call.
3. `pack_telegram_stickers` / `pack_whatsapp_stickers` — runs our
   generation output through `tgskit` / `wa-sticker-formatter` to produce a
   `.tgs` or pack-ready `.webp` + `contents.json`. This is the
   platform-spec analogue of `npm-icon-gen` for messengers.
4. `generate_avatar` — thin wrapper over **DiceBear**: `{ seed, style,
   format, options }` → SVG/PNG. Deterministic, CPU-only, zero API cost —
   ideal free-tier fallback and a natural default for "user avatar" intents
   routed by our prompt classifier (Controversy 3 in the INDEX: compose
   before generating). Surface the per-style licence in the response.

**Inspiration for our mascot-consistency approach.** Three patterns
transplant cleanly:

- **DiceBear's seed → SVG determinism** is the gold standard for "same
  character, different pose/colour." For a *generative* mascot we cannot
  hit byte-equality, but we can expose `{ mascot_id, seed }` and persist
  the *reference images* plus IP-Adapter embeddings so every subsequent
  call reproduces identity. Store seed + reference-image hash + LoRA id
  in the brand bundle (`mascot:` block in `brand.md`).
- **Open Genmoji's LoRA style-locking** is how we should ship a
  "brand house style" once a user has picked five favourite outputs: train
  a per-brand LoRA on those plus the Flux-Schnell Apache-2.0 base, expose
  it as `style_ref: brand://<id>` in `enhance_prompt`, and avoid fragile
  prompt-only style descriptions.
- **`oftenliu/consistent-character` and `charactercraft-pro`** are the two
  live templates for multi-pose character series: IP-Adapter + ControlNet
  in ComfyUI vs. multi-turn Gemini image editing. Ship both as internal
  strategies behind a single `generate_mascot_series` tool and A/B-route by
  cost/latency — exactly the multi-model-by-capability routing we already
  advocate in the INDEX (Recommendation 2).

The punchline: a stickers surface is a low-cost extension of everything
already in our stack, DiceBear gives us a free deterministic avatar tool on
day one, and the character-consistency patterns in this niche (seed + LoRA
+ IP-Adapter + multi-turn edit) are exactly the primitives we need when
mascots land.
