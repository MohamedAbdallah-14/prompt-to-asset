# 27d — Automated Quality Metrics for CI

## Philosophy: Tier-Based, Cost-Proportional

The goal is to catch as many regressions as possible at the cheapest tier so expensive LLM-judge checks only run when needed. Every metric below has a concrete implementation path; none requires manual review.

---

## Tier 0: Deterministic Checks (Free, Instant)

These run on every generated asset before any ML metric. Implemented in pure Python/Pillow/NumPy. Fail fast.

### 1. Dimension Exact Match
```python
from PIL import Image
img = Image.open(path)
assert img.size == (1024, 1024), f"Expected 1024x1024, got {img.size}"
```

### 2. Alpha Channel Presence
```python
assert img.mode in ("RGBA", "LA"), "No alpha channel found"
alpha = img.split()[-1]
assert alpha.getextrema()[0] < 255, "Alpha channel is fully opaque (no transparency)"
```

### 3. FFT Checkerboard Rejection
Grey-and-white checkerboard (the "transparent PNG rendered as RGB" failure) has a strong 8×8 frequency signature in the DFT. Detect it:
```python
import numpy as np
from PIL import Image

def has_checkerboard_artifact(path: str, threshold: float = 0.15) -> bool:
    img = np.array(Image.open(path).convert("L"), dtype=float)
    fft = np.abs(np.fft.fft2(img))
    fft_shift = np.fft.fftshift(fft)
    h, w = fft_shift.shape
    # Nyquist peaks at corners indicate 8px periodic pattern
    corner_energy = fft_shift[0, 0] + fft_shift[0, -1] + fft_shift[-1, 0] + fft_shift[-1, -1]
    total_energy = fft_shift.sum()
    return (corner_energy / total_energy) > threshold
```
Reference technique: OpenCV FFT blur detection, adapted. See: https://pyimagesearch.com/2020/06/15/opencv-fast-fourier-transform-fft-for-blur-detection-in-images-and-video-streams/

### 4. Subject Tight-Bbox Safe-Zone Check
For app icons: subject must fill ≥80% of maskable area (Android) or stay within 824px center of 1024px (iOS).
```python
from PIL import Image
import numpy as np

def subject_bbox_fraction(path: str) -> float:
    img = Image.open(path).convert("RGBA")
    alpha = np.array(img)[:, :, 3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    bbox_area = (rmax - rmin) * (cmax - cmin)
    return bbox_area / (alpha.shape[0] * alpha.shape[1])
```

### 5. OCR Levenshtein (when wordmark expected)
```python
import pytesseract
from Levenshtein import distance

def ocr_check(path: str, expected: str, max_distance: int = 1) -> bool:
    text = pytesseract.image_to_string(path).strip()
    return distance(text.lower(), expected.lower()) <= max_distance
```
Requires `eng.traineddata` (already present at project root: `/Users/mohamedabdallah/Work/Projects/prompt-to-asset/eng.traineddata`).

---

## Tier 1: Embedding-Based Checks (~$0.001/image or free with local model)

### CLIPScore (smoke test)
```bash
pip install t2v-metrics
```
```python
import t2v_metrics
clip = t2v_metrics.CLIPScore(model='openai-clip-vit-large-patch14')
score = clip(images=["logo.png"], texts=["minimalist compass icon"])
assert score.item() > 0.20, "CLIP score too low — likely off-target generation"
```

### VQAScore (fidelity gate)
```python
vqa = t2v_metrics.VQAScore(model='clip-flant5-xl')  # 16 GB GPU
score = vqa(images=["logo.png"], texts=["minimalist compass icon, no text, transparent background"])
assert score.item() > 0.50, f"VQAScore {score.item():.2f} below threshold"
```
No GPU path: use `model='gpt-4o'` in t2v_metrics — costs ~$0.02 per image.

---

## Tier 2: LLM-as-Judge Checks (nightly, ~$0.02–0.05/image)

### DeepEval TextToImageMetric
```python
from deepeval.metrics import TextToImageMetric
from deepeval.test_case import LLMTestCase, MLLMImage

metric = TextToImageMetric(threshold=0.70, include_reason=True)
case = LLMTestCase(
    input="minimalist compass logo, flat vector, no text, transparent background",
    actual_output=str(MLLMImage(url="logo.png", local=True))
)
result = metric.measure(case)
# result.score: float, result.reason: str
```

### ImageReward Delta (regression signal)
```python
import ImageReward as RM
model = RM.load("ImageReward-v1.0")
delta = model.score(brief, [new_output]) - model.score(brief, [golden_ref])
assert delta > -0.3, f"ImageReward regressed by {delta:.2f} vs. golden reference"
```

---

## CI Integration

### GitHub Actions structure
```yaml
jobs:
  eval-tier-0-1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install t2v-metrics deepeval image-reward pytesseract pillow python-Levenshtein
      - run: python scripts/eval_tier0.py   # deterministic
      - run: python scripts/eval_tier1.py   # CLIP + VQA

  eval-tier-2:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'   # nightly only
    steps:
      - run: python scripts/eval_tier2.py  # LLM-as-judge
```

### Threshold calibration
Do not ship defaults. Run the tier-1 and tier-2 checks against 20 human-approved golden images and 20 known-bad outputs (wrong subject, checkerboard, blurry). Set the threshold at `(worst_good + best_bad) / 2`. Recalibrate whenever you change the golden dataset major version.

---

## Platform-Specific Checks Summary

| Platform | Required checks |
|---|---|
| iOS App Icon | 1024×1024, alpha NOT required (opaque), subject in 824px center |
| Android Adaptive | 108×108 or 1024×1024, subject in 72dp safe zone (66% of canvas) |
| PWA Maskable | subject fills ≥80% of canvas |
| Favicon | 16×16 legibility (SSIM or human spot), 32×32, 48×48 |
| OG Image | 1200×630 exact, no alpha |
| Transparent Logo | RGBA, no checkerboard FFT, alpha extrema <255 |
