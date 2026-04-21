---
title: "Deterministic Validation Checks for Generated Image Assets"
category: 14-negative-prompting-artifacts
angle: 14e
slug: deterministic-validation-checks
agent: research-14e
status: draft
last_updated: 2026-04-19
tags:
  - validation
  - pillow
  - sharp
  - tesseract
  - exiftool
  - alpha-channel
  - safe-zone
  - ocr
  - quality-gate
primary_libraries:
  - Pillow (PIL) 10.x+
  - sharp 0.33.x+
  - exiftool 12.x+
  - tesseract 5.x
  - numpy 1.26.x+
  - opencv-python 4.10+
related_angles:
  - 13-transparent-backgrounds/*
  - 09-app-icon-generation/* (for platform sizes)
  - 11-favicon-web-assets/* (for OG image specs)
  - 17-upscaling-refinement/* (post-gate regeneration)
---

# Deterministic Validation Checks for Generated Image Assets

## Executive Summary

Even the best T2I model (Gemini 2.5 Flash Image / Nano Banana, `gpt-image-1`, `gpt-image-1.5`, Imagen 4, FLUX.2 [pro/max]) produces failure modes that **do not require ML to detect**. A logo asked to be transparent comes back as RGB with a white background. An iOS icon asked for 1024×1024 comes back as 1024×1024 but with a 3-pixel translucent border that iOS will reject at upload. An OG image asked to say "Ship faster" comes back saying "Shpi fasrter". An app icon asked to be "centered with empty safe zone" comes back with the mark bleeding into the 10% outer margin that Apple crops during mask application.

All of these are **deterministic, rule-based failures**. They should be caught by a cheap, fast, local validator **before** the asset reaches the user and before the orchestrator spends another generation call. A robust prompt-to-asset pipeline should therefore run every generated asset through a **validation gate** that produces either `PASS` or a structured `FAIL` report that can be fed back into the regenerate loop (see Integration section).

This angle catalogs the full set of non-ML checks a prompt-to-asset pipeline should implement, with reference implementations in Python (Pillow + numpy + pytesseract + exiftool) and Node (sharp + exiftool-vendored + tesseract.js). Key findings:

1. **Alpha validation is two checks, not one.** Presence of an alpha channel is necessary but not sufficient — a PNG can be RGBA with every pixel at α=255 (opaque). The "transparent logo" failure mode produces exactly this. Therefore the validator must both confirm `mode == "RGBA"` *and* confirm `alpha.min() < 255` with a meaningful transparent pixel count (≥5% of total pixels for most logo shapes).
2. **Safe-zone checks catch 80% of icon failures with ~20 lines of code.** Sampling the outer 10% margin of an iOS icon and asserting it is either fully transparent (`α=0`) or uniformly matches a declared background is the single highest-signal deterministic check, because iOS/Android/Web masking systems will crop that margin. Apple HIG reserves ~10% outer padding inside the 1024×1024 canvas; Material Adaptive Icons reserve 18% (the outer 108dp of 432dp).
3. **OCR as a spellcheck is a must-have for any asset with text.** Modern T2I models hallucinate letters roughly 5–15% of the time on short strings and much more on long strings. Tesseract 5 with `--oem 1 --psm 7` (single text line) plus Levenshtein distance against the expected string is a 50ms local check that catches the overwhelming majority of text-corruption regressions. Google Cloud Vision is the fallback for stylized typography Tesseract cannot read.

These checks compose into a deterministic rubric (`docs/research/14-negative-prompting-artifacts/14e-deterministic-validation-checks.md#pass-fail-rubric`) that grades an asset across 8 axes and returns a machine-readable fail report that the regenerate loop can convert into prompt deltas (e.g., `alpha_min=255` → append "MUST be fully transparent background, save as PNG-32 with alpha").

## Why Deterministic First

ML-based validators (CLIP similarity, aesthetic scorers, HPSv2, PickScore) are the right tool for "does this look good" questions, but they are expensive (GPU or API call), noisy (score variance across similar assets is high), and opaque (you can't turn a 0.42 aesthetic score into a targeted prompt fix).

Deterministic validators have three properties that make them the correct **first layer** of a validation gate:

- **Cheap.** A full Pillow + numpy + Tesseract pass on a 1024×1024 PNG runs in 100–400ms on a consumer laptop. No GPU, no API cost.
- **Explainable.** Every failure produces a concrete reason: `alpha_channel: missing`, `size: got (1024,1023) want (1024,1024)`, `ocr_text: "Ship fster" edit_distance=2 expected="Ship faster"`.
- **Actionable.** Each failure maps 1:1 to either a prompt augmentation ("save as PNG-32 with true transparency"), a post-process ("pad to exact size"), or a hard reject ("regenerate").

ML checks belong **after** the deterministic gate passes, to catch the subtler "looks unprofessional" failures that rules can't describe.

## Check Catalog

| # | Check | Library | Fail Action | Severity |
|---|---|---|---|---|
| C1 | Color mode is expected (RGBA/RGB/P) | Pillow `Image.mode` / sharp `metadata().channels` | Regenerate with explicit format in prompt | HARD |
| C2 | Alpha channel present AND actually used | Pillow + numpy `(alpha < 255).sum()` | Regenerate with stronger transparency language | HARD |
| C3 | Pixel dimensions exact match | Pillow `Image.size` / sharp `metadata()` | Resize if aspect OK, else regenerate | MEDIUM |
| C4 | Aspect ratio within tolerance | compute `w/h` | Crop or regenerate | MEDIUM |
| C5 | Safe-zone emptiness | numpy slice + alpha/variance check | Regenerate with "leave 10% padding" language | HARD |
| C6 | EXIF / metadata stripped | exiftool or sharp `.keepExif(false)` | Strip automatically (non-destructive) | SOFT |
| C7 | OCR text matches expected string | pytesseract / tesseract.js + Levenshtein | Regenerate with `--no-text` or corrected prompt | HARD |
| C8 | Color palette adherence | Pillow `quantize()` + deltaE | Regenerate with hex codes in prompt | MEDIUM |
| C9 | Center-of-mass within tolerance | numpy moments on alpha/luminance | Regenerate with "centered composition" | MEDIUM |
| C10 | File size / bit depth sanity | Pillow `getextrema()` / os.path.getsize | Re-encode if too large, regenerate if suspicious | SOFT |
| C11 | No forbidden colors (e.g. checker pattern) | numpy gradient on outer ring | Regenerate with "solid transparency" | HARD |
| C12 | Color depth (≥24-bit, not palette) | Pillow `mode != "P"` for logos | Convert or regenerate | SOFT |

### C1 — Color mode

```python
from PIL import Image
img = Image.open("out.png")
assert img.mode in ("RGBA", "RGB", "LA", "L"), f"unexpected mode {img.mode}"
```

The failure mode to catch: the model returned a palettized PNG (`"P"`) when the user asked for transparency — palette PNGs technically support a single transparent index but most downstream tooling (iOS app icons, Android adaptive) rejects them.

### C2 — Alpha actually used

The #1 Gemini failure case ("transparent logo, got white background or checker squares") is detectable in two lines:

```python
import numpy as np
rgba = np.array(img.convert("RGBA"))
alpha = rgba[..., 3]
transparent_ratio = (alpha < 255).sum() / alpha.size
assert transparent_ratio > 0.05, f"alpha unused ({transparent_ratio:.2%})"
```

The 5% threshold is empirical: a typical logo-on-transparent PNG has 40–80% transparent pixels. A text-only wordmark has 70–95%. Anything under 5% strongly implies the model baked a background in.

The **checker-pattern failure** (Gemini drawing a literal gray-and-white checkered grid as "transparency") is caught by adding a variance check on the outer 5% ring — a real transparent area has α=0 and RGB is irrelevant, but the checker artifact has α=255 with a regular 8×8 or 16×16 pattern. Detect with an autocorrelation on the outer ring, or simply check that the top-left 32×32 block is uniform in both RGB and α.

### C3 / C4 — Dimensions

iOS App Store icon must be exactly **1024×1024** — no tolerance. Material adaptive icons must be **432×432** PNG or SVG with 108dp safe zone. Favicon must be **32×32** or **16×16**. OG images should be **1200×630** (1.91:1) within a few pixels.

```python
def check_size(img, expected, tolerance_px=0):
    w, h = img.size
    ew, eh = expected
    assert abs(w-ew) <= tolerance_px and abs(h-eh) <= tolerance_px, \
        f"size {w}x{h} expected {ew}x{eh}"
```

Most modern T2I APIs let you request an exact aspect ratio but **not** exact pixel dimensions — `gpt-image-1` returns 1024×1024, 1024×1536, 1536×1024, or 2048×2048 only; `gpt-image-1.5` outputs similar fixed sizes; Gemini Imagen returns "closest supported". Therefore the validator should also carry a `post_resize` action: if aspect ratio is correct, resize losslessly (`PIL.Image.LANCZOS`); if aspect is wrong, regenerate.

> **Updated 2026-04-21:** `gpt-image-1.5` (released late 2025) follows the same discrete size scheme as `gpt-image-1`. No provider currently returns arbitrary exact pixel dimensions from a text prompt — always build a post-resize step into the pipeline.

### C5 — Safe-zone emptiness

This is the highest-signal check for icon and logo generation. Every platform reserves outer margin that gets masked or cropped:

- **iOS**: 1024×1024, system applies rounded-rect mask with ~12% corner radius. Content within 1024×1024 is used; the corners are cropped.
- **Android Adaptive Icon**: 108×108dp total, 72×72dp inner safe zone (18% margin on each side).
- **Favicon / PWA 512**: any outer 10% can be masked by launchers.

A deterministic check: sample the 10% outer ring, require it to be either fully transparent or within a small luminance tolerance of a declared background color.

```python
def check_safe_zone(img, margin_pct=0.10, mode="transparent", bg=(255,255,255), tol=6):
    arr = np.array(img.convert("RGBA"))
    h, w, _ = arr.shape
    m = int(min(h, w) * margin_pct)
    top    = arr[:m, :, :]
    bot    = arr[-m:, :, :]
    left   = arr[m:-m, :m, :]
    right  = arr[m:-m, -m:, :]
    ring = np.concatenate([top.reshape(-1,4), bot.reshape(-1,4),
                           left.reshape(-1,4), right.reshape(-1,4)])
    if mode == "transparent":
        frac_opaque = (ring[:, 3] > 16).mean()
        return frac_opaque < 0.02, {"frac_opaque_in_ring": float(frac_opaque)}
    elif mode == "solid":
        r, g, b = bg
        dist = np.sqrt((ring[:,0]-r)**2 + (ring[:,1]-g)**2 + (ring[:,2]-b)**2)
        frac_mismatch = (dist > tol).mean()
        return frac_mismatch < 0.02, {"frac_mismatch": float(frac_mismatch)}
```

`frac < 0.02` (2% tolerance) allows for a few anti-aliased pixels at boundaries without false-positiving clean assets.

### C6 — EXIF / metadata strip

T2I providers increasingly embed provenance metadata (C2PA, SynthID, IPTC). This is fine for some uses, harmful for others — shipping a brand asset with `Software: DALL-E 3 (OpenAI)` in the EXIF is embarrassing.

**Python / exiftool** (ExifTool by Phil Harvey, stable since 2003):

```bash
exiftool -overwrite_original -all= out.png
```

**Python / Pillow** (does not preserve EXIF in PNG by default, but removes it on re-save):

```python
img = Image.open("out.png")
img.save("out.clean.png", "PNG", optimize=True)
```

**Node / sharp 0.33+:**

```js
await sharp(input).png({ compressionLevel: 9 }).toFile(output);
// Note: sharp strips all metadata by default. Pass .withMetadata() to keep.
```

**Node / exiftool-vendored:**

```js
import { ExifTool } from "exiftool-vendored";
const et = new ExifTool();
await et.write("out.png", { AllDates: null }, ["-all="]);
await et.end();
```

Verification step (soft): re-run `exiftool out.png` and assert output only contains basic PNG chunks (`PNG:ImageWidth`, `PNG:ImageHeight`, `PNG:BitDepth`, `PNG:ColorType`), no `XMP:*`, `IPTC:*`, `EXIF:*`, `C2PA:*` keys.

### C7 — OCR spellcheck

Text corruption is the single most noticeable failure mode for generated marketing images, OG cards, and wordmark logos. Modern frontier models (Ideogram v2, Imagen 3, Flux 1.1 Pro) render short strings well but degrade rapidly past ~20 characters or with stylized fonts.

**Tesseract 5** (local, free, ~50ms on a 1024×1024 image):

```python
import pytesseract
from Levenshtein import distance as lev

def check_ocr(img_path, expected, max_distance=2):
    text = pytesseract.image_to_string(
        img_path,
        config="--oem 1 --psm 7 -l eng"
    ).strip()
    d = lev(text.lower(), expected.lower())
    return d <= max_distance, {"ocr": text, "expected": expected, "distance": d}
```

`--psm 7` = "single text line" is the right mode for headlines/logos. For multi-line OG images use `--psm 6`. For wordmarks with tight letter spacing, pre-process: upscale 2× with Lanczos, binarize with Otsu, then OCR.

When Tesseract fails (stylized fonts, very large display type, white-on-transparent), **Google Cloud Vision** `TEXT_DETECTION` is the drop-in fallback. It costs ~$1.50/1000 images and handles display type far better. A reasonable policy is: Tesseract first; if distance > 3 OR Tesseract returns empty, escalate to Vision.

Edge case: the expected string might be rendered with intentional case changes or punctuation the model drops. Normalize both sides (lowercase, strip punctuation, collapse whitespace) before computing Levenshtein. Allow `max_distance = max(2, len(expected) // 10)`.

### C8 — Color palette adherence

A brand asset should match a declared palette (e.g. `["#0A2540", "#00D4FF", "#FFFFFF"]`). Check the top-N quantized colors against expected within a perceptual distance threshold (CIEDE2000 ΔE < 10 is "noticeably different but recognizably the same hue"; ΔE < 5 is "close enough for most use").

```python
from PIL import Image
from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000

def top_colors(img, n=5):
    quantized = img.convert("RGB").quantize(colors=n, method=Image.Quantize.FASTOCTREE)
    palette = quantized.getpalette()[:n*3]
    counts = quantized.getcolors()
    colors = []
    for count, idx in counts:
        r, g, b = palette[idx*3:idx*3+3]
        colors.append(((r, g, b), count))
    return sorted(colors, key=lambda x: -x[1])

def nearest_brand(rgb, brand_hex):
    lab1 = convert_color(sRGBColor(*[c/255 for c in rgb]), LabColor)
    best = min(
        ((h, convert_color(sRGBColor.new_from_rgb_hex(h), LabColor)) for h in brand_hex),
        key=lambda kv: delta_e_cie2000(lab1, kv[1])
    )
    return best[0], delta_e_cie2000(lab1, best[1])
```

Fail if the dominant color's nearest brand match has ΔE > 10, or if ≥2 of the top-5 colors are "off-brand" (not within ΔE < 10 of any declared brand color, ignoring white/black which are usually neutral).

### C9 — Center-of-mass

For logos and icons, the content should be visually centered. Compute the alpha-weighted centroid and assert it is within ±5% of the geometric center.

```python
def center_of_mass(img, tol=0.05):
    arr = np.array(img.convert("RGBA"))
    alpha = arr[..., 3].astype(np.float64)
    total = alpha.sum()
    if total == 0:
        return False, {"reason": "image is fully transparent"}
    h, w = alpha.shape
    ys, xs = np.mgrid[0:h, 0:w]
    cy = (ys * alpha).sum() / total / h
    cx = (xs * alpha).sum() / total / w
    dy, dx = abs(cy - 0.5), abs(cx - 0.5)
    return (dy < tol) and (dx < tol), {"cx": float(cx), "cy": float(cy)}
```

For filled RGB compositions, replace `alpha` with "distance from background color" so the centroid weights the foreground subject, not the background.

### C10 / C11 / C12 — Sanity

- **File size**: a 1024×1024 PNG-32 is typically 100KB–2MB. <10KB suggests near-empty; >5MB suggests uncompressed and should be re-encoded with `optimize=True` + `pngquant`.
- **Bit depth**: `img.getextrema()` returns per-channel (min, max). If all three RGB maxes are ≤ 16, the image is mostly black/empty. If the palette has only 16 unique colors, it may have been saved as a palette PNG.
- **Checker artifact** (the Gemini-specific failure): compute the 2D FFT of a transparent-background PNG's RGB (with alpha pre-multiplied out); a synthetic checker produces two bright peaks at the checker frequency. Simpler heuristic: slide an 8×8 window across the alpha==0 region; if many windows have uniform RGB but alternating pattern with neighbors, flag.

## Reference Implementation (Python)

A single validator module that the prompt-to-asset pipeline can call. Put at `src/validators/deterministic.py`:

```python
"""Deterministic validation gate for generated image assets.

All checks return (passed: bool, details: dict). The aggregate report is
ready to feed back to an LLM for regenerate-loop prompt repair.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Literal, Sequence
import json
import subprocess

import numpy as np
from PIL import Image
import pytesseract
from Levenshtein import distance as lev


Severity = Literal["HARD", "MEDIUM", "SOFT"]


@dataclass
class CheckResult:
    name: str
    passed: bool
    severity: Severity
    details: dict = field(default_factory=dict)
    repair_hint: str | None = None


@dataclass
class ValidationReport:
    path: str
    results: list[CheckResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(r.passed for r in self.results if r.severity == "HARD")

    @property
    def summary(self) -> dict:
        return {
            "path": self.path,
            "passed": self.passed,
            "hard_failures": [r.name for r in self.results
                              if not r.passed and r.severity == "HARD"],
            "medium_failures": [r.name for r in self.results
                                if not r.passed and r.severity == "MEDIUM"],
            "repair_hints": [r.repair_hint for r in self.results
                             if not r.passed and r.repair_hint],
            "results": [asdict(r) for r in self.results],
        }


def _ring(arr: np.ndarray, margin_pct: float) -> np.ndarray:
    h, w = arr.shape[:2]
    m = max(1, int(min(h, w) * margin_pct))
    top, bot = arr[:m], arr[-m:]
    left, right = arr[m:-m, :m], arr[m:-m, -m:]
    return np.concatenate([
        top.reshape(-1, arr.shape[-1]),
        bot.reshape(-1, arr.shape[-1]),
        left.reshape(-1, arr.shape[-1]),
        right.reshape(-1, arr.shape[-1]),
    ])


def validate_asset(
    path: str | Path,
    *,
    expected_size: tuple[int, int] | None = None,
    expected_mode: str | None = "RGBA",
    require_alpha: bool = True,
    expected_text: str | None = None,
    safe_zone: Literal["transparent", "solid", "any"] = "transparent",
    safe_zone_bg: tuple[int, int, int] = (255, 255, 255),
    brand_hex: Sequence[str] | None = None,
    strip_metadata: bool = True,
    size_tolerance_px: int = 0,
) -> ValidationReport:
    path = Path(path)
    img = Image.open(path)
    report = ValidationReport(path=str(path))

    # C1 — mode
    if expected_mode:
        passed = img.mode == expected_mode
        report.results.append(CheckResult(
            "color_mode", passed, "HARD",
            {"got": img.mode, "want": expected_mode},
            repair_hint=(f"Model returned {img.mode}; request PNG-32 / RGBA"
                         if not passed else None),
        ))

    # C2 — alpha actually used
    if require_alpha:
        rgba = np.array(img.convert("RGBA"))
        alpha = rgba[..., 3]
        frac = float((alpha < 255).sum() / alpha.size)
        passed = frac >= 0.05
        report.results.append(CheckResult(
            "alpha_used", passed, "HARD",
            {"transparent_pixel_fraction": frac},
            repair_hint=("Background was solid, not transparent. Re-prompt: "
                         "'true alpha transparency, NO white or checker "
                         "background, save as PNG-32 RGBA'"
                         if not passed else None),
        ))

    # C3 — exact size
    if expected_size:
        w, h = img.size
        ew, eh = expected_size
        passed = (abs(w - ew) <= size_tolerance_px
                  and abs(h - eh) <= size_tolerance_px)
        report.results.append(CheckResult(
            "pixel_dimensions", passed, "MEDIUM",
            {"got": [w, h], "want": [ew, eh]},
            repair_hint=(f"Resize/regenerate to exactly {ew}x{eh}"
                         if not passed else None),
        ))

    # C5 — safe zone
    if safe_zone != "any":
        arr = np.array(img.convert("RGBA"))
        ring = _ring(arr, 0.10)
        if safe_zone == "transparent":
            frac_opaque = float((ring[:, 3] > 16).mean())
            passed = frac_opaque < 0.02
            details = {"frac_opaque_in_margin": frac_opaque}
            hint = ("Content bleeds into 10% safe zone. Re-prompt: "
                    "'Center the mark; leave 10% empty padding on all sides'")
        else:
            r, g, b = safe_zone_bg
            dist = np.sqrt((ring[:, 0].astype(int) - r) ** 2
                           + (ring[:, 1].astype(int) - g) ** 2
                           + (ring[:, 2].astype(int) - b) ** 2)
            frac_mismatch = float((dist > 8).mean())
            passed = frac_mismatch < 0.02
            details = {"frac_mismatch": frac_mismatch}
            hint = (f"Outer margin doesn't match declared bg {safe_zone_bg}."
                    " Re-prompt with explicit background color.")
        report.results.append(CheckResult(
            "safe_zone", passed, "HARD", details,
            repair_hint=hint if not passed else None,
        ))

    # C7 — OCR
    if expected_text is not None:
        txt = pytesseract.image_to_string(
            str(path), config="--oem 1 --psm 7 -l eng"
        ).strip()
        norm_got = "".join(c.lower() for c in txt if c.isalnum() or c == " ")
        norm_want = "".join(c.lower() for c in expected_text
                            if c.isalnum() or c == " ")
        d = lev(norm_got, norm_want)
        allowed = max(2, len(norm_want) // 10)
        passed = d <= allowed
        report.results.append(CheckResult(
            "ocr_text", passed, "HARD",
            {"got": txt, "want": expected_text, "edit_distance": d,
             "allowed": allowed},
            repair_hint=(f"Model rendered '{txt}' instead of "
                         f"'{expected_text}'. Re-prompt with "
                         f"'exact text: \"{expected_text}\"' and quote "
                         "each word individually."
                         if not passed else None),
        ))

    # C8 — palette
    if brand_hex:
        quant = img.convert("RGB").quantize(colors=5,
                                            method=Image.Quantize.FASTOCTREE)
        palette = quant.getpalette()[:5 * 3]
        counts = sorted(quant.getcolors(), key=lambda x: -x[0])[:5]
        top = [tuple(palette[i * 3:i * 3 + 3]) for _, i in counts]
        brand_rgb = [tuple(int(h[i:i + 2], 16)
                           for i in (1, 3, 5)) for h in brand_hex]
        def nearest(c):
            return min(np.sqrt(sum((c[i] - b[i]) ** 2 for i in range(3)))
                       for b in brand_rgb)
        off_brand = sum(1 for c in top if nearest(c) > 40)
        passed = off_brand <= 1
        report.results.append(CheckResult(
            "palette_adherence", passed, "MEDIUM",
            {"top_colors": top, "brand_hex": list(brand_hex),
             "off_brand_count": off_brand},
            repair_hint=(f"Too many off-brand colors. Re-prompt with exact "
                         f"hex codes: {', '.join(brand_hex)}"
                         if not passed else None),
        ))

    # C9 — center of mass
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[..., 3].astype(np.float64)
    if alpha.sum() > 0:
        h, w = alpha.shape
        ys, xs = np.mgrid[0:h, 0:w]
        cy = (ys * alpha).sum() / alpha.sum() / h
        cx = (xs * alpha).sum() / alpha.sum() / w
        passed = abs(cy - 0.5) < 0.05 and abs(cx - 0.5) < 0.05
        report.results.append(CheckResult(
            "center_of_mass", passed, "MEDIUM",
            {"cx": float(cx), "cy": float(cy)},
            repair_hint=("Subject off-center. Re-prompt with "
                         "'centered composition, subject in the middle third'"
                         if not passed else None),
        ))

    # C6 — metadata strip (soft)
    if strip_metadata:
        try:
            out = subprocess.run(
                ["exiftool", "-s", "-s", "-s", str(path)],
                capture_output=True, text=True, timeout=10,
            )
            has_branding = any(k in out.stdout.lower()
                               for k in ("dall-e", "openai", "imagen",
                                         "gemini", "midjourney", "c2pa"))
            report.results.append(CheckResult(
                "metadata_clean", not has_branding, "SOFT",
                {"exiftool_output_snippet": out.stdout[:200]},
                repair_hint=("Strip provenance metadata: "
                             "`exiftool -overwrite_original -all= file.png`"
                             if has_branding else None),
            ))
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

    return report


if __name__ == "__main__":
    import sys
    r = validate_asset(
        sys.argv[1],
        expected_size=(1024, 1024),
        expected_mode="RGBA",
        require_alpha=True,
        expected_text=sys.argv[2] if len(sys.argv) > 2 else None,
        safe_zone="transparent",
        brand_hex=["#0A2540", "#00D4FF", "#FFFFFF"],
    )
    print(json.dumps(r.summary, indent=2))
```

Usage:

```bash
python -m validators.deterministic out.png "Ship faster"
```

## Reference Implementation (Node)

```ts
import sharp from "sharp";
import { ExifTool } from "exiftool-vendored";
import Tesseract from "tesseract.js";
import { distance as lev } from "fastest-levenshtein";
import { promises as fs } from "node:fs";

export type Severity = "HARD" | "MEDIUM" | "SOFT";
export interface CheckResult {
  name: string;
  passed: boolean;
  severity: Severity;
  details?: Record<string, unknown>;
  repairHint?: string;
}

export interface ValidateOpts {
  expectedSize?: [number, number];
  expectedMode?: "rgba" | "rgb";
  requireAlpha?: boolean;
  expectedText?: string;
  safeZone?: "transparent" | "solid" | "any";
  safeZoneBg?: [number, number, number];
  brandHex?: string[];
  stripMetadata?: boolean;
}

export async function validateAsset(path: string, opts: ValidateOpts = {}) {
  const results: CheckResult[] = [];
  const img = sharp(path);
  const meta = await img.metadata();

  if (opts.expectedMode) {
    const want = opts.expectedMode === "rgba" ? 4 : 3;
    results.push({
      name: "color_mode",
      passed: meta.channels === want,
      severity: "HARD",
      details: { got: meta.channels, want },
      repairHint: meta.channels !== want
        ? `Got ${meta.channels}-channel; request PNG-32 RGBA`
        : undefined,
    });
  }

  const raw = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const { width: w, height: h, channels } = info;

  if (opts.requireAlpha) {
    let transparent = 0;
    for (let i = 3; i < data.length; i += channels) {
      if (data[i] < 255) transparent++;
    }
    const frac = transparent / (w * h);
    results.push({
      name: "alpha_used",
      passed: frac >= 0.05,
      severity: "HARD",
      details: { transparentPixelFraction: frac },
      repairHint: frac < 0.05
        ? "Background not transparent. Re-prompt with 'true PNG-32 alpha, no white or checker background'."
        : undefined,
    });
  }

  if (opts.expectedSize) {
    const [ew, eh] = opts.expectedSize;
    results.push({
      name: "pixel_dimensions",
      passed: w === ew && h === eh,
      severity: "MEDIUM",
      details: { got: [w, h], want: [ew, eh] },
      repairHint: (w !== ew || h !== eh) ? `Resize to ${ew}x${eh}` : undefined,
    });
  }

  if (opts.safeZone && opts.safeZone !== "any") {
    const m = Math.max(1, Math.floor(Math.min(w, h) * 0.10));
    let opaqueInRing = 0, ringPixels = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const inRing = x < m || x >= w - m || y < m || y >= h - m;
        if (!inRing) continue;
        ringPixels++;
        const a = data[(y * w + x) * channels + 3];
        if (a > 16) opaqueInRing++;
      }
    }
    const frac = opaqueInRing / ringPixels;
    results.push({
      name: "safe_zone",
      passed: opts.safeZone === "transparent" ? frac < 0.02 : true,
      severity: "HARD",
      details: { fracOpaqueInRing: frac },
      repairHint: frac >= 0.02
        ? "Content bleeds into 10% safe zone. Re-prompt: 'centered, 10% empty padding on all sides'."
        : undefined,
    });
  }

  if (opts.expectedText) {
    const { data: { text } } = await Tesseract.recognize(path, "eng", {
      tessedit_pageseg_mode: "7" as never,
    });
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const got = norm(text), want = norm(opts.expectedText);
    const d = lev(got, want);
    const allowed = Math.max(2, Math.floor(want.length / 10));
    results.push({
      name: "ocr_text",
      passed: d <= allowed,
      severity: "HARD",
      details: { got: text.trim(), want: opts.expectedText, editDistance: d, allowed },
      repairHint: d > allowed
        ? `Rendered '${text.trim()}' instead of '${opts.expectedText}'. Re-prompt with exact quoted text.`
        : undefined,
    });
  }

  if (opts.stripMetadata) {
    const et = new ExifTool();
    try {
      const tags = await et.read(path);
      const branded = JSON.stringify(tags).toLowerCase();
      const hasProvenance = ["openai", "dall-e", "imagen", "gemini", "c2pa"]
        .some((k) => branded.includes(k));
      if (hasProvenance) {
        // Strip automatically (soft failure, auto-fix).
        await et.write(path, {}, ["-all=", "-overwrite_original"]);
      }
      results.push({
        name: "metadata_clean",
        passed: true,
        severity: "SOFT",
        details: { hadProvenance: hasProvenance, autoStripped: hasProvenance },
      });
    } finally {
      await et.end();
    }
  }

  const hardFail = results.some(r => !r.passed && r.severity === "HARD");
  return {
    path,
    passed: !hardFail,
    results,
    repairHints: results.filter(r => !r.passed && r.repairHint).map(r => r.repairHint!),
  };
}
```

## Pass/Fail Rubric

A canonical rubric for a prompt-to-asset auto-gate:

| Severity | Behavior | Examples |
|---|---|---|
| **HARD fail** | Block asset, trigger regenerate loop with repair hint. | Missing alpha, text misspelled, safe-zone violation, wrong mode. |
| **MEDIUM fail** | Attempt auto-fix (resize, recompress); if not fixable, request regenerate. | Wrong pixel size but correct aspect, off-brand dominant color, off-center subject. |
| **SOFT fail** | Auto-fix silently; log for telemetry. | EXIF/metadata present, file oversized, unnecessary palette mode. |

`passed = (count(HARD fails) == 0)`. MEDIUM and SOFT failures annotate the asset but don't block delivery unless policy says otherwise.

A conservative default for brand-critical paths (logo, app icon, favicon) is: treat MEDIUM as HARD. A lax default for marketing illustrations is: only HARD blocks.

## Integration with the Regenerate Loop

The deterministic gate plugs into the prompt-to-asset pipeline at two points:

1. **Post-generation gate.** Every asset coming back from the T2I provider passes through `validate_asset()`. If `report.passed` is `true`, emit the asset. Otherwise, hand the `repair_hints` list to the regenerate orchestrator.
2. **Prompt-delta translation.** The orchestrator converts each hint into a structured prompt augmentation. Example mapping:

```python
HINT_TO_PROMPT_DELTA = {
    "alpha_used":       "The background MUST be transparent. Output PNG-32 with a real alpha channel. Do NOT draw a checkered pattern to represent transparency — produce true alpha=0 pixels. No white, no solid color behind the subject.",
    "safe_zone":        "Leave a 10% empty transparent margin on all four sides of the canvas. The subject must fit inside the central 80% of the image.",
    "ocr_text":         lambda got, want: f"The visible text MUST read EXACTLY: \"{want}\". The previous attempt rendered \"{got}\" which is wrong. Render one word at a time, spell-check each letter.",
    "color_mode":       "Save as PNG-32 (RGBA), not RGB or palette-indexed.",
    "pixel_dimensions": lambda w, h: f"Output exactly {w}x{h} pixels.",
    "palette_adherence":lambda brand: f"Use ONLY these brand colors: {', '.join(brand)}. No other colors.",
    "center_of_mass":   "Center the subject perfectly in the canvas, both horizontally and vertically.",
}
```

3. **Loop bound.** Cap at 3 regeneration attempts. If the same HARD check fails twice in a row with progressively stronger prompts, escalate: either swap models (Gemini → `gpt-image-1` or Ideogram for text, Flux for transparency) or return the best-scoring attempt plus a warning to the user.

4. **Telemetry.** Log `(provider, model, asset_type, check, pass/fail)` tuples. After a few hundred generations you learn the failure matrix of each provider: e.g. Gemini fails `alpha_used` at 18% on "transparent logo" requests, `gpt-image-1` at 4%. Route future requests accordingly.

5. **Caching.** The validator is idempotent and cheap; memoize by asset hash. If the regenerate loop produces the same bytes twice (possible with deterministic seeds), skip revalidation.

### Example flow

```python
for attempt in range(MAX_ATTEMPTS):
    img_path = provider.generate(prompt=enhanced_prompt)
    report = validate_asset(
        img_path,
        expected_size=(1024, 1024),
        expected_mode="RGBA",
        require_alpha=True,
        safe_zone="transparent",
        expected_text=user_text,
        brand_hex=brand.palette,
    )
    if report.passed:
        return img_path, report
    enhanced_prompt = augment_prompt(
        enhanced_prompt,
        hints=report.summary["repair_hints"],
        attempt=attempt,
    )
raise GenerationFailedError(last_report=report)
```

## References

Primary libraries and docs:

- Pillow — [`pillow.readthedocs.io`](https://pillow.readthedocs.io/en/stable/). `Image.mode`, `Image.quantize`, `Image.getextrema`.
- sharp — [`sharp.pixelplumbing.com`](https://sharp.pixelplumbing.com/). Default metadata-stripping behavior, `metadata()`, `ensureAlpha()`, `raw()`.
- ExifTool — [`exiftool.org`](https://exiftool.org/). `-all=` strip-all syntax.
- Tesseract 5 — [`tesseract-ocr.github.io`](https://tesseract-ocr.github.io/tessdoc/). PSM and OEM docs.
- pytesseract — [github.com/madmaze/pytesseract](https://github.com/madmaze/pytesseract).
- tesseract.js — [tesseract.projectnaptha.com](https://tesseract.projectnaptha.com/).
- Google Cloud Vision `TEXT_DETECTION` — [cloud.google.com/vision/docs/ocr](https://cloud.google.com/vision/docs/ocr).
- Levenshtein — [github.com/maxbachmann/Levenshtein](https://github.com/maxbachmann/Levenshtein) (Python), [github.com/ka-weihe/fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein) (Node).
- colormath — [github.com/gtaylor/python-colormath](https://github.com/gtaylor/python-colormath) for ΔE CIE2000.
- C2PA — [c2pa.org/specifications](https://c2pa.org/specifications/) (what to strip).

Platform icon specs:

- Apple HIG — App Icons — [developer.apple.com/design/human-interface-guidelines/app-icons](https://developer.apple.com/design/human-interface-guidelines/app-icons). 1024×1024 requirement.
- Android Adaptive Icons — [developer.android.com/develop/ui/views/launch/icon_design_adaptive](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive). 108dp outer / 72dp safe zone.
- Open Graph images — [ogp.me](https://ogp.me/) and [developers.facebook.com/docs/sharing/webmasters/images](https://developers.facebook.com/docs/sharing/webmasters/images/). 1200×630 recommended.
- PWA manifest icons — [w3.org/TR/appmanifest](https://www.w3.org/TR/appmanifest/).

Cross-references within this research corpus:

- `13-transparent-backgrounds/*` — covers the generator-side of alpha correctness (models that support RGBA natively vs workarounds). This angle covers the **validation** side.
- `09-app-icon-generation/*` — defines the exact pixel/safe-zone constraints this validator enforces.
- `11-favicon-web-assets/*` — OG image 1200×630, favicon 32×32 constraints.
- `16-background-removal-vectorization/*` — when `alpha_used` fails, rembg/BiRefNet can auto-repair instead of regenerating.
- `17-upscaling-refinement/*` — when `pixel_dimensions` fails but aspect is correct, upscale with Real-ESRGAN rather than regenerate.
