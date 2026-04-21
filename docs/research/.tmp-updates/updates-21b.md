# Partial update log — Category 21 OSS Deep Dive (angles 11–20 + SYNTHESIS + index)

**Audit date:** 2026-04-21  
**Scope:** Files 11–20, SYNTHESIS.md, index.md  
**Auditor:** Claude agent (second-half scope)

---

## Summary of changes

### 11-oss-favicon-generators.md

| Claim | Was | Now | Source |
|---|---|---|---|
| `@realfavicongenerator/generate-favicon` star count | ~34★, "undiscovered" | ~5k★ (npm search returned 4,986; check-favicon at 1,935), v0.8.0 April 2026, actively maintained | npm/GitHub search April 2026 |
| `@realfavicongenerator/generate-favicon` version | Not stated | v0.8.0 (April 2026) | npm registry |
| `itgalaxy/favicons` version | v7.2.0 (March 2024), "~2 years old" | v7.1.3 (April 9, 2026), actively maintained | npm registry April 2026 |
| `itgalaxy/favicons` maintenance characterisation | "weak point — v7.2.0 ~2 years old" | "actively receiving updates" | npm registry April 2026 |
| `pwa-asset-generator` repo location | `onderceylan/pwa-asset-generator`, 3,006★ | Moved to `elegantapp/pwa-asset-generator`, ~3k★, v8.1.4 (March 2026) | GitHub search April 2026 |
| Cross-cutting observation #1 | "just hasn't been discovered yet (34★)" | "as of April 2026 it has grown to ~5k★ and v0.8.0, so the 'hasn't been discovered' framing is now outdated" | Verified |

**Files changed:** `11-oss-favicon-generators.md`  
**Nature:** Star counts stale; version numbers outdated; repo relocation missed; maintenance characterisation reversed.

---

### 12-oss-og-social-card.md

| Claim | Was | Now | Source |
|---|---|---|---|
| Nuxt OG Image v6 renderer behaviour | "already defaults to Takumi" | "recommends Takumi via `.takumi.vue` filename suffix; v6 removed global `defaults.renderer` config — renderer selection is per-component, not a single default" | Nuxt SEO docs / nuxt-modules/og-image v6 release notes |
| Takumi star count | 1.6k★ | ~1.3–1.6k★ (range confirmed across two sources) | GitHub April 2026 |

**Files changed:** `12-oss-og-social-card.md`  
**Nature:** Nuxt OG Image v6 renderer architecture mischaracterised — "defaults to Takumi globally" is incorrect; the v6 architecture is per-component suffix selection.

---

### 13-oss-sticker-emoji.md

| Claim | Was | Now | Source |
|---|---|---|---|
| DiceBear star count | ~8.3k★ | ~8.2–8.3k★ (confirmed range, last push April 17, 2026) | GitHub search April 2026 |

**Files changed:** `13-oss-sticker-emoji.md`  
**Nature:** Minor — star count range corrected; DiceBear remains actively maintained.

---

### 14-webmcp-impls.md

| Claim | Was | Now | Source |
|---|---|---|---|
| "Formal announcement expected around Google I/O 2026" | Forward-looking as of April 2026 | Still pending; production readiness expected mid-to-late 2026 | Community reporting April 2026 |
| Runtime coverage | Chrome 146 only + Edge tracking | Chrome 146 + **Cloudflare Browser Run** also shipping WebMCP support | Cloudflare docs April 2026 |

**Files changed:** `14-webmcp-impls.md`  
**Nature:** Google I/O claim left as forward-looking (no announcement yet confirmed); Cloudflare Browser Run WebMCP support added as a new runtime surface.

---

### 15-skills-packaging-formats.md

| Claim | Was | Now | Source |
|---|---|---|---|
| AGENTS.md adopters list | "20+ coding agents" generic | Verified list: Amp, Codex, Cursor, Devin, Factory, Gemini CLI, GitHub Copilot, Jules, VS Code, and others | AAIF press release Dec 2025 + AAIF site April 2026 |
| AAIF membership | Not stated | 170+ member organisations (April 2026) | AAIF announcement April 2026 |
| AAIF leadership | Not stated | Mazin Gilbert appointed first permanent Executive Director | AAIF announcement April 2026 |

**Files changed:** `15-skills-packaging-formats.md`  
**Nature:** AAIF growth confirmed and quantified; adopters list made specific.

---

### 16-mascot-character-consistency.md

| Claim | Was | Now | Source |
|---|---|---|---|
| Flux.1 Kontext [dev] commercial licensing | "non-commercial only" | BFL launched self-serve commercial licensing portal June 2025 — commercial licences purchasable in minutes for Flux.1 [dev], Kontext [dev], Tools [dev] | BFL announcement / bfl.ai/licensing |
| Cross-cutting notes license list | "Flux.1-dev / Flux.1 Redux-dev / Flux.1 Kontext-dev ... silent traps" | Updated to distinguish: "non-commercial for unlicensed use; commercial available via BFL portal" | Verified |
| Kontext [pro] per-image pricing | "~$0.04–0.08 / image" | 50 credits = $0.50/image (1 credit = $0.01 per BFL pricing) | bfl.ai/pricing April 2026 |

**Files changed:** `16-mascot-character-consistency.md`  
**Nature:** Significant — BFL's self-serve commercial licensing portal (June 2025) changes the commercial viability of Flux.1 Kontext [dev]. The original "non-commercial" characterisation was accurate at time of writing but is now incomplete without noting the commercial licence path.

---

### 18-serverless-comfyui-patterns.md

| Claim | Was | Now | Source |
|---|---|---|---|
| ComfyDeploy star count | ~446★ | ~1.3k★ (April 2026) | GitHub search April 2026 |
| ComfyDeploy re-open-sourcing date | "2025" (vague) | September 2025 (confirmed) | ComfyDeploy blog |
| `bentoml/comfy-pack` star count | 215★ | ~164★ (corrected — GitHub star counts fluctuate) | GitHub search April 2026 |
| `bentoml/comfy-pack` version | "v0.4.4 Nov 2025" | Last PyPI release v0.4.0a5 (May 2025, pre-release); active maintenance status unclear | PyPI April 2026 |

**Files changed:** `18-serverless-comfyui-patterns.md`  
**Nature:** ComfyDeploy star count significantly understated. `comfy-pack` star count was overstated; version/status needs watching.

---

### 19-tri-surface-starters.md

| Claim | Was | Now | Source |
|---|---|---|---|
| `vercel-labs/skills` star count | "~14,620★" | ~14.7k★ (April 2026) | GitHub search April 2026 |
| `vercel-labs/skills` version context | Not stated | v1.1.1 released, added `npx skills find` interactive discovery | Vercel changelog |

**Files changed:** `19-tri-surface-starters.md`  
**Nature:** Minor — star count ticked up; v1.1.1 feature addition noted.

---

### SYNTHESIS.md

Changes propagated from individual angle corrections:

1. **Insight #10** — RFG "34★ undiscovered" → "~5k★ well-established v0.8.0"; noted `itgalaxy/favicons` v7.1.3 active; `pwa-asset-generator` repo relocation to `elegantapp/`.
2. **Insight #11** — Nuxt OG Image v6 "defaults to Takumi" → "recommends Takumi via per-component filename suffix" (no global default).
3. **Insight #14** — AAIF 170+ members (April 2026) added.
4. **Insight #16 (Rec #16)** — ComfyDeploy star count corrected to ~1.3k★; `comfy-pack` ~164★ noted.
5. **P1 cross-cutting pattern** — BFL self-serve commercial portal added; Flux.1 [dev] / Kontext [dev] noted as commercially licensable with purchase.
6. **Recommendation #19** — No-fly list updated: Flux.1 [dev] / Kontext [dev] removed from blanket no-fly for orgs with BFL licence; Flux.1 Redux-dev status flagged as unconfirmed.
7. **Pattern P8 star count** — `vercel-labs/skills` ~14.7k★ (was "14.6k★").

---

## Claims verified as still accurate (no change needed)

- DiceBear ~8.3k★ MIT — confirmed (slightly down to ~8.2k but within rounding)
- StarVector CVPR 2025, 8B model available on HuggingFace — confirmed, RLRF NeurIPS 2025 follow-up also confirmed
- AGENTS.md 60k+ repos — confirmed (AAIF press release)
- Linux Foundation / AAIF formation date December 9, 2025 — confirmed
- Modal `@modal.enter(snap=True)` <3s cold starts on 90% of requests — confirmed by multiple 2026 sources
- Replicate `LoraLoaderFromURL` feature — confirmed present in cog-comfyui
- Together FLUX.2 up to 8 reference images via API (FLUX.2 [flex] up to 10) — confirmed
- Open Peeps / Open Doodles / Humaaans CC0 — confirmed, no licence changes
- Iconify `icon-sets` 275k+ icons — confirmed
- `astro-favicons` v3.1.3 — confirmed (latest on npm as of April 2026)
- WebMCP W3C CG draft, Chrome 146 flag-gated — confirmed
- `MiguelsPizza/WebMCP` as the incubator that seeded W3C CG — confirmed
- `run-llama/mcp-nextjs` OAuth 2.1 + Prisma + Postgres — confirmed as architecture

---

## Items not verified (flagged for manual review)

- Flux.1 Redux-dev commercial licence availability via BFL portal — the self-serve portal covers Flux.1 [dev], Kontext [dev], Tools [dev] but Redux-dev was not explicitly confirmed in sources. Verify at `bfl.ai/licensing`.
- `bentoml/comfy-pack` maintenance cadence — last found PyPI release is pre-release (May 2025). The project may have shifted to BentoCloud-native deployment. Monitor.
- `jakejarvis/favsmith` v0.1.0 March 2026 — star count still 0 (nascent); activity not reverified.
- `SivaramPg/pwa-icons` v1.1.3 Jan 2026 — not reverified; likely still accurate.
- `harlan-zw/nuxt-og-image` v6 full release date — referenced via issue tracker; production release status not confirmed.
