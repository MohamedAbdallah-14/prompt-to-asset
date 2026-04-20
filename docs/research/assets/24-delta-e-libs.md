# 24 — ΔE / Perceptual Color Difference Libraries

> Research for the `prompt-to-asset` `asset_validate` step (palette locking). Goal: pick the simplest correct stack for measuring perceptual color distance between a target brand palette and colors extracted from generated assets.

---

## TL;DR — Recommended Stack

- **Node (validator runtime): `culori` → `differenceCiede2000()`** for palette lock checks. BSD-style license, well-maintained, handles achromatic edge cases correctly, takes any Culori color object (auto-converts to Lab internally).
- **Fallback / sanity check: `culori.differenceEuclidean({ mode: 'oklch' })`** when you want cheap, symmetric, and "good enough" perceptual distance without the ΔE2000 correction terms.
- **Do not use `chroma.js` pre-v2.2** — its old `deltaE()` was actually CMC and non-commutative. Current `deltaE()` is CIEDE2000 but culori is cleaner.
- **Do not use `python-colormath`** — archived Dec 2023, known `delta_e_cie2000` correctness issues (issue #112). Use `colour-science` if Python is needed.
- **Do not use `delta-e` (zschuessler)** for new code — stuck at v0.0.8 (2020), Unlicense, single-author, no test suite against Sharma reference data. Fine for toy use.

---

## Library Matrix

| Library | Language | License | ΔE00 | ΔE94 | ΔE76 | CAM16-UCS | OKLab/OKLCH | Maintained | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **culori** | JS/TS | MIT | ✅ `differenceCiede2000` | ✅ `differenceCie94` | ✅ `differenceCie76` | ❌ | ✅ via `differenceEuclidean({mode:'oklch'})` | ✅ active | Tree-shakeable, modern, powers Tailwind v4 / Radix UI color systems |
| **color.js (colorjs.io)** | JS/TS | MIT | ✅ `deltaE2000` / `deltaE(c, "2000")` | ❌ (has 76, CMC, OK, Jz, ITP, HCT) | ✅ `deltaE76` | ❌ | ✅ `deltaEOK`, `deltaEOK2` | ✅ active | Written by CSS Color spec editors; heaviest but most spec-faithful |
| **chroma.js** | JS | BSD-3 | ✅ `chroma.deltaE()` (v2.2+) | ❌ | ❌ | ❌ | ❌ | ~active | Historical footgun: `deltaE` was CMC + non-commutative until v2.2 (issue #175). `chroma.distance(a,b,'lab')` is plain Euclidean. |
| **delta-e** (zschuessler) | JS | Unlicense | ✅ `getDeltaE00` | ✅ `getDeltaE94` | ✅ `getDeltaE76` | ❌ | ❌ | ❌ v0.0.8 (2020) | Takes raw `{L,A,B}` objects — you do the Lab conversion. No ΔE2000 edge-case tests. |
| **colour-science** | Python | BSD-3 | ✅ `delta_E_CIE2000` | ✅ `delta_E_CIE1994` | ✅ `delta_E_CIE1976` | ✅ `delta_E_CAM16UCS` (+ LCD, SCD) | indirect | ✅ NumFOCUS affiliated | Also: `delta_E_CMC`, `delta_E_ITP`, CAM02-UCS. Unified `delta_E(..., method=...)` dispatcher. |
| **python-colormath** | Python | BSD | ✅ `delta_e_cie2000` | ✅ | ✅ | ❌ | ❌ | ❌ **archived Dec 2023** | Historical `numpy.asscalar` bug (fixed in forks), and issue #112 reports ΔE00 results disagreeing with reference impls by 2–4× in some cases. |
| **colormath2** (fork) | Python | BSD | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Nov 2024) | Community-maintained fork of python-colormath. Low adoption (~2025). |

---

## Function Signatures & Input Expectations

### culori (recommended)

```js
import { differenceCiede2000, differenceEuclidean, parse } from 'culori';

const deltaE00 = differenceCiede2000();           // returns (a, b) => number
const dE = deltaE00(parse('#ff6600'), parse('oklch(70% 0.2 30)'));

const deltaOK = differenceEuclidean('oklch');     // perceptual-ish, cheap
```

- **Input**: any Culori color object or parseable string. Auto-converts to Lab (D65) internally for ΔE2000.
- **Output**: non-negative number. Symmetric (commutative).
- **Achromatic handling**: uses the Sharma/rochester reference implementation conventions — hue is forced to 0 when chroma ≈ 0, avoiding the 180°-apart discontinuity bug described in Sharma 2005.

### color.js

```js
import Color from 'colorjs.io';
const c1 = new Color('srgb', [1, 0, 0]);
const c2 = new Color('oklch', [0.7, 0.2, 30]);
c1.deltaE2000(c2);     // number
c1.deltaE(c2, 'OK');   // deltaEOK (Euclidean in OKLab)
```

### delta-e (legacy)

```js
const DeltaE = require('delta-e');
DeltaE.getDeltaE00({L: 36, A: 60, B: 41}, {L: 100, A: 40, B: 90});
// You must convert to L*a*b* yourself. Expects D65/2°.
```

### colour-science (Python)

```python
import colour, numpy as np
lab1 = colour.XYZ_to_Lab(colour.sRGB_to_XYZ(np.array([1, 0.4, 0])))
lab2 = colour.XYZ_to_Lab(colour.sRGB_to_XYZ(np.array([1, 0.42, 0.05])))
colour.delta_E(lab1, lab2, method='CIE 2000')          # ΔE00
colour.delta_E(jab1, jab2, method='CAM16-UCS')         # CAM16-UCS Euclidean
```

- **Input**: numpy arrays. Method names: `'CIE 1976'`, `'CIE 1994'`, `'CIE 2000'`, `'CMC'`, `'ITP'`, `'CAM02-UCS'`, `'CAM16-UCS'`, `'CAM16-LCD'`, `'CAM16-SCD'`, `'DIN99'`.

---

## Correctness Caveats (read before trusting any implementation)

1. **CIEDE2000 is nontrivially hard**. Sharma et al. (*Color Research & Application*, 2005) showed that most public implementations — including ones from reputable vendors — produce correct results on the handful of CIE-published worked examples but fail on additional test data. The main trap is the **mean hue angle and hue difference calculation around the achromatic axis and for colors ~180° apart in hue**. Discontinuity magnitude is bounded by 0.274 for pairs <5 ΔE apart but grows sharply beyond that.
2. **Always test against [Sharma's reference dataset](http://www.ece.rochester.edu/~gsharma/ciede2000/)** (34 test pairs with expected ΔE2000 to 4 decimals) before shipping. Culori and colour-science pass it; several smaller JS packages do not.
3. **Illuminant matters**. ΔE formulas are defined in CIE L*a*b* under D65/2°. If you convert from sRGB, assume D65 unless you have a reason not to. Mismatched illuminants silently inflate ΔE.
4. **ΔE2000 is only validated for small differences** (<5 ΔE). For large, cross-gamut comparisons the number still sorts monotonically with perception but is no longer calibrated.
5. **chroma.js historical bug**: before v2.2, `chroma.deltaE(a, b) !== chroma.deltaE(b, a)` because it was actually CMC l:c. If you pin an old version, you get silent wrong answers.
6. **python-colormath issue #112**: reported ΔE2000 values 2–4× off from reference implementations for some green pairs. The project is archived. Avoid for new work.

---

## Performance (order of magnitude, single pair, Node 20, M-class laptop)

| Operation | Approx cost |
|---|---|
| `differenceEuclidean('oklch')` (culori) | ~0.3 µs |
| `differenceCie76` (culori) | ~0.5 µs |
| `differenceCiede2000` (culori) | ~3–5 µs |
| `color.js` `deltaE2000` | ~8–15 µs (object overhead) |
| `colour-science` `delta_E_CIE2000` (single scalar via numpy) | ~40 µs; **vectorized over N pairs: ~1 µs/pair** |

For palette-lock validation (typically N target colors × M extracted colors, both in the tens), all options are effectively free. Choose on correctness and API, not speed.

---

## Threshold Guidance (ΔE2000, D65)

| ΔE00 | Meaning | Use for palette lock? |
|---|---|---|
| **< 1.0** | Imperceptible under controlled viewing (JND floor) | ✅ **Strict brand match** — primary logo colors, paid ads |
| **< 2.0** | "Perceptible through close observation" — acceptable for critical print proofs | ✅ **Default brand lock threshold** for generated assets |
| **2.0 – 3.5** | Perceptible at a glance but same color family | ⚠️ Warn, allow with approval — social/marketing secondary colors |
| **3.5 – 5.0** | Clearly perceptible; general consumer-goods tolerance | ⚠️ Secondary/accent palette only |
| **5.0 – 10.0** | Noticeable but still same named color family | ❌ Fail palette lock |
| **> 10.0** | Different color | ❌ Fail |

> **Note**: these numbers assume ΔE2000. ΔE76 produces systematically larger values for the same pair — a ΔE76 of 5 can correspond to a ΔE2000 of 2. Always tag the formula in validator output.

### Suggested validator defaults

```js
{
  "palette_lock": {
    "formula": "ciede2000",
    "illuminant": "D65",
    "primary_max_delta": 2.0,
    "secondary_max_delta": 5.0,
    "fail_above": 10.0
  }
}
```

---

## Final Recommendation for `asset_validate`

1. Add `culori` as a dependency.
2. For each `(target_palette_color, extracted_color)` pair, call `differenceCiede2000()(a, b)`.
3. Compare against the thresholds above. Emit the ΔE2000 value alongside pass/fail in the validator report so humans can calibrate.
4. If you ever need CAM16-UCS or ITP (e.g., HDR brand work), jump to Python + `colour-science` rather than hunting a JS port — no JS library ships a vetted CAM16-UCS ΔE as of 2026.

---

## Sources

- [culori API docs](https://github.com/Evercoder/culori/blob/main/docs/api.md) — difference function inventory and signatures
- [color.js deltaE API](https://colorjs.io/api/variables/deltae.deltae) and [color-difference docs](https://colorjs.io/docs/color-difference)
- [chroma.js deltaE issue #175](https://github.com/gka/chroma.js/issues/175) — historical CMC/non-commutative bug
- [delta-e npm (zschuessler)](https://www.npmjs.com/package/delta-e) — v0.0.8, Unlicense
- [colour-science Colour Difference module](https://colour.readthedocs.io/en/latest/colour.difference.html) — full ΔE method list incl. CAM16-UCS, ITP
- [python-colormath issue #112](https://github.com/gtaylor/python-colormath/issues/112) — ΔE2000 correctness disagreement; repo archived Dec 2023
- [colormath2 fork](https://pypi.org/project/colormath2/) — maintained community fork
- Sharma, Wu, Dalal, ["The CIEDE2000 Color-Difference Formula: Implementation Notes..."](https://hajim.rochester.edu/ece/sites/gsharma/papers/CIEDE2000CRNAFeb05.pdf), *Color Research & Application*, 2005 — canonical implementation gotchas and reference test data
- ["Mathematical Discontinuities in CIEDE2000"](https://openreview.net/forum?id=2TustuEIbv) — quantifies the achromatic/180°-hue discontinuity magnitude
- [Datacolor: Best Practices for Delta E Tolerances](https://www.datacolor.com/business-solutions/blog/best-practices-delta-e-tolerances/) — industry threshold conventions
