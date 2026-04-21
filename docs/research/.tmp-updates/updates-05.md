# Research Update Log — Category 05 (OpenAI DALL·E / gpt-image)
**Audit date:** 2026-04-21
**Auditor:** automated research updater

---

## Summary

Nine files audited. All were broadly accurate and well-sourced as of their last-updated date (2026-04-19). Three factual errors corrected; two significant gaps added; one imminence flag upgraded.

---

## Corrections Made

### 1. gpt-image-1.5 max output size — `5e-production-integrations.md` (CORRECTED)

**Error:** Pricing table listed max long edge for `gpt-image-1.5` as **2048 px**.

**Fact:** Official OpenAI API docs confirm gpt-image-1.5 supports the same three sizes as gpt-image-1: `1024×1024`, `1536×1024`, `1024×1536`. Max long edge is **1536 px**, not 2048.

**Source:** `developers.openai.com/api/docs/models/gpt-image-1.5` (fetched 2026-04-21)

**File changed:** `5e-production-integrations.md` — pricing table row for gpt-image-1.5 corrected; update note added.

---

### 2. gpt-image-1.5 high-quality pricing — `5c-logo-icon-generation.md` and `SYNTHESIS.md` (CORRECTED)

**Error:** Both files stated gpt-image-1.5 at 1024² high = **~$0.19**. This is the gpt-image-1 price; gpt-image-1.5 is ~20% cheaper.

**Fact:** gpt-image-1.5 1024² prices: low $0.009, medium $0.034, **high $0.133**. The $0.19 figure (more precisely $0.167 + prompt tokens) belongs to `gpt-image-1`, not `gpt-image-1.5`.

**Source:** OpenAI pricing page (fetched via `developers.openai.com/api/docs/guides/image-generation` 2026-04-21); `aifreeapi.com/en/posts/gpt-image-1-5-pricing`

**Files changed:**
- `5c-logo-icon-generation.md` — comparison table row updated from ~$0.19 to ~$0.133; update note added below table.
- `SYNTHESIS.md` — point 12 reworded to clearly attribute $0.167/~$0.19 to gpt-image-1 and $0.133 to gpt-image-1.5; update note added.

---

### 3. Public-figure moderation policy — `5d-failure-modes-text-and-moderation.md` and `5a-dalle3-prompt-guide-and-rewriter.md` (UPDATED)

**Error:** Both files stated public-figure/celebrity names are categorically stripped/rejected — presenting this as an immutable hard block for all OpenAI image models.

**Fact:** OpenAI relaxed content moderation policies in early 2026 (TechCrunch Mar 2025, policy updates Mar–Apr 2026). Named politicians and public figures are now broadly allowed in non-harmful image generation contexts via `gpt-image-1`/`gpt-image-1.5`. The blanket refusal remains for Disney/Marvel/Star Wars/Pixar IP and for likeness-abuse cases. Living-artist style refusals are unchanged. The old behavior is still accurate for DALL·E 3 (different moderation stack).

**Source:** TechCrunch "OpenAI peels back ChatGPT's safeguards around image creation" (Mar 2025); OpenAI moderation policy page (Apr 2026); OpenAI community threads.

**Files changed:**
- `5d-failure-modes-text-and-moderation.md` — File-level update note added at top; Failure #5 table row updated from "High by name" to "Reduced in 2026 — now moderate"; new bullet added to Concrete false-positive patterns section explaining the policy shift.
- `5a-dalle3-prompt-guide-and-rewriter.md` — Point 5 under Moderation section updated with 2026-04-21 caveat noting gpt-image-1/1.5 are now more permissive.

---

## Gaps Identified (No Source Found to Assert Corrections — Documented as Gaps)

### 4. gpt-image-2 status — SYNTHESIS.md and `5c-logo-icon-generation.md` (GAP DOCUMENTED)

**Status:** As of 2026-04-21, `gpt-image-2` has not been officially released to the OpenAI API. It is in gray testing in LM Arena (codenames: maskingtape-alpha, gaffertape-alpha, packingtape-alpha) and a staggered ChatGPT rollout began around April 19, 2026. No official API release announcement, no pricing, no model ID in the official docs.

**Claimed capabilities (from third-party reports only, unverified against official docs):** ~99% text rendering accuracy; 4096×4096 px output; 2× generation speed vs gpt-image-1.5.

**Action taken:** Gap added to SYNTHESIS.md §Gaps. Update note added to 5c-logo-icon-generation.md comparison table note. No changes to routing-table.json — model not yet official.

**Monitor:** `developers.openai.com/api/docs/changelog`

---

### 5. DALL·E 3 sunset imminence — `5a-dalle3-prompt-guide-and-rewriter.md` (FRAMING UPGRADED)

**Error:** Recommendation #9 framed the 2026-05-12 sunset as a future planning item ("Plan the May 2026 sunset now"). As of audit date (2026-04-21), this is **21 days away** — migrations must already be complete.

**Action taken:** Recommendation #9 rewritten to reflect imminence; update note added calling out the 21-day countdown explicitly.

---

## Files Not Changed (Verified Accurate)

| File | Status |
|------|--------|
| `5a-dalle3-recaptioning.md` | Accurate. Recaptioning mechanics for DALL·E 3 and gpt-image-1 correctly described. gpt-image-1.5 note in §5 is sound. |
| `5b-gpt-image-1-api.md` | Accurate. All parameters, token tables, rate limits confirmed correct. Pricing ($0.167 for gpt-image-1 high) is gpt-image-1, correctly attributed. |
| `5b-gpt-image-1-api-and-transparency.md` | Accurate. Transparency failure modes T1–T7 still valid. Economic comparison table correctly uses gpt-image-1.5 at $0.133 (consistent with fix applied elsewhere). |
| `5c-openai-cookbook-asset-workflows.md` | Accurate. All cookbook recipes and integration patterns current. |
| `5d-system-style-behavior.md` | Accurate. Responses API vs Image API instruction surface correctly described. |
| `5e-production-integrations.md` | One correction applied (gpt-image-1.5 max size); all other content accurate. |
| `index.md` | Accurate. Correctly lists gpt-image-1.5 as GA 2025-12-16, DALL-E 2/3 sunset 2026-05-12. |
| `SYNTHESIS.md` | Two updates applied (pricing, gaps). Rest of content verified accurate. |

---

## Key Facts Confirmed Accurate (No Change Needed)

- DALL·E 2 and DALL·E 3 sunset: **2026-05-12** — confirmed.
- gpt-image-1 GA date: 2025-04-23 — confirmed.
- gpt-image-1.5 GA date: 2025-12-16 — confirmed.
- Organization verification still required for gpt-image-1: confirmed active as of Apr 2026.
- `background="transparent"` only works reliably on `/v1/images/generations`, not `/v1/images/edits`: still accurate per community thread reports.
- gpt-image-1.5 not available on free tier / DALL·E 3 not available on free tier: confirmed.
- Rate limits (Tier 1 = 5 IPM, Tier 5 = 250 IPM): confirmed.
- C2PA mandatory on all gpt-image outputs: confirmed.
- Batch API 50% discount with 24h SLA: confirmed.
- `moderation="low"` parameter only on gpt-image-1*, not DALL·E 3: confirmed.
- gpt-image-1 three output sizes (1024², 1536×1024, 1024×1536): confirmed.
- gpt-image-1.5 max size same as gpt-image-1 (1536 px long edge): confirmed (corrected the erroneous 2048 claim in 5e).
