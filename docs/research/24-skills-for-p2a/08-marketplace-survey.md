---
title: "Marketplace skills survey for P2A complementing"
category: skills-for-p2a
date: 2026-04-21
---

# Marketplace Skills Survey for P2A

Survey of installed Claude Code marketplace skills and their P2A relevance. Assessed across three categories: **Direct** (solves core P2A problem), **Supporting** (improves workflow), **Indirect** (minor benefit), **None**.

---

## Installed Plugin Directories

- `/Users/mohamedabdallah/.claude/plugins/cache/superpowers-marketplace/superpowers/4.3.1/skills/` — 14 skills
- `/Users/mohamedabdallah/.claude/plugins/cache/claude-plugins-official/` — frontend-design, context7, coderabbit, commit-commands, security-guidance, clangd-lsp, claude-md-management
- `/Users/mohamedabdallah/.claude/plugins/cache/wazir-marketplace/wazir/local-dev/` — 30+ skills
- `/Users/mohamedabdallah/.claude/plugins/cache/caveman/` — caveman, caveman-review, caveman-commit, compress
- `/Users/mohamedabdallah/.claude/plugins/cache/unslop-marketplace/unslop/` — unslop, unslop-file, unslop-review, unslop-commit

---

## Direct Relevance

### 1. `frontend-design` (claude-plugins-official)

**Why Direct:** Teaches aesthetic direction thinking — bold commitment to a single visual direction (brutalist, minimalist, luxury, organic, etc.) before writing any code. P2A's `inline_svg` mode requires Claude to make exactly these design decisions before authoring SVG paths. The skill's anti-generic stance ("avoid Inter, avoid purple gradients") maps directly to P2A's need to avoid "AI slop" marks.

**Specific transfer points:**
- "Bold aesthetic commitment" → choose mark direction before path count decisions
- "Color hierarchy: dominant + sharp accent" → palette application for logos
- "Anti-generic: never converge on clichéd choices" → P2A's inline_svg quality bar
- "Obsessive refinement: every detail matters" → every SVG path must earn its place

**Gap:** frontend-design has zero awareness of scale constraints (16×16 favicon legibility, platform safe zones, WCAG contrast). Does not teach SVG grammar. Needs P2A-specific extension.

**Action:** Reference in CLAUDE.md. Invoke before `asset_enhance_prompt()` for style direction.

---

### 2. `context7` (claude-plugins-official, also MCP server)

**Why Direct:** Fetches live documentation for SVG specs, Canvas APIs, Sharp image processing, @resvg/resvg-js, image model APIs (HuggingFace, Replicate, fal.ai), and any library P2A depends on. P2A's static research docs can't track API changes; context7 can.

**Specific use cases:**
- "What's the current HuggingFace Inference API syntax for diffusion models?"
- "Does Recraft V4 support controls.colors differently from V3?"
- "What SVG filters are supported in @resvg/resvg-js?"
- "What's the current gpt-image-1 API parameter list?"

**Action:** Reference in CLAUDE.md. Call when live docs are needed for any library P2A uses.

---

## Supporting Skills

### 3. `brainstorming` (superpowers)

**Path:** `.../superpowers/4.3.1/skills/brainstorming/`

**Why Supporting:** When a user brief is vague ("make a logo for my AI startup"), brainstorming helps explore 2–3 design directions and get user alignment before calling `asset_enhance_prompt()`. Prevents generating the wrong aesthetic and burning generation credits.

**When to invoke:** User provides a brief with no style/palette/direction information AND the brief is for a primary brand asset (logo, app icon). Skip for secondary assets (favicon derived from logo) or when brief is specific.

**Action:** Reference in CLAUDE.md as optional pre-generation step.

---

### 4. `systematic-debugging` (superpowers)

**Path:** `.../superpowers/4.3.1/skills/systematic-debugging/`

**Why Supporting:** P2A's validation failures require structured diagnosis: gather evidence at each pipeline boundary, classify failure, pick repair primitive, verify. This maps exactly to systematic-debugging's 4-phase structure. Without this discipline, Claude loops on retries without root-cause analysis.

**Action:** Consider importing into P2A's `skills/` directory. Reference in the validation-debug skill spec.

---

### 5. `dispatching-parallel-agents` (superpowers)

**Path:** `.../superpowers/4.3.1/skills/dispatching-parallel-agents/`

**Why Supporting:** If user requests logo + favicon + app icon in one brief, all three are independent and can be dispatched in parallel. This skill teaches how to do that safely (error isolation, result collection, partial success handling).

**Action:** Mention in CLAUDE.md or inline in asset-enhancer's recommended flow for multi-asset requests. Don't formalize — too heavyweight for single-asset use.

---

### 6. `writing-plans` (superpowers)

**Why Supporting:** For complex pipelines ("generate complete icon system for iOS + Android + PWA + desktop"), writing-plans structures the sequence of MCP tool calls into a testable plan. Not essential — asset-enhancer's recommended flow already handles sequencing — but useful for user communication.

**Action:** Skip formalizing. Mention as optional for complex brand kit projects.

---

### 7. `clarifier` (wazir)

**Why Supporting:** Runs a structured clarification pipeline (research brief → ask questions → produce hardened spec) before any generation. Useful when brief is underspecified. Heavier than brainstorming — better for B2B brand work where getting the brief wrong is expensive.

**Action:** Monitor. Import if P2A expands to brand system design workflows.

---

### 8. `gemini-cli` (wazir)

**Why Supporting (limited):** Teaches programmatic Gemini model invocation. Useful if P2A needs to call Gemini for prompt expansion or SVG description before routing to an image model. P2A has its own Gemini routing via `GEMINI_API_KEY` though, so this is mostly redundant.

**Action:** Skip. P2A's own routing already covers Gemini.

---

## Indirect Skills

### 9. `unslop` (unslop-marketplace)

**Why Indirect:** Image generation prompts written by Claude sometimes carry "AI-isms" (overused adjectives, generic descriptors). Running prompts through unslop before submission might produce more specific, distinctive outputs — but the effect is marginal and untested for T2I prompts specifically.

**Action:** Skip. P2A's prompt rewriter (`src/rewriter.ts`) already adapts prompts to model dialect. Adding unslop adds a step without clear benefit.

---

### 10. `caveman` (caveman-marketplace)

**Why Indirect:** Compresses verbose text. Might help condense a 300-word brand brief to 80 words before calling `asset_enhance_prompt()`. But caveman drops articles and hedging, which P2A's prompt rewriter actually needs to reconstruct anyway.

**Action:** Skip. Counter-productive for P2A's use case.

---

## Not Relevant

- `superpowers`: using-git-worktrees, test-driven-development, receiving-code-review, executing-plans, finishing-a-development-branch, requesting-code-review — development workflow, not asset generation
- `coderabbit`, `security-guidance`, `clangd-lsp` — code review / security / C++ tooling
- `commit-commands`, `claude-md-management` — git/docs workflow

---

## Ranked Recommendation Matrix

| Skill | Source | Relevance | Action | Priority |
|---|---|---|---|---|
| **frontend-design** | claude-plugins-official | Direct | Add to CLAUDE.md; invoke for aesthetic direction before generation | **High** |
| **context7** | claude-plugins-official | Direct | Add to CLAUDE.md; call for live lib docs | **High** |
| **brainstorming** | superpowers | Supporting | Add to CLAUDE.md as optional pre-generation step | **Medium** |
| **systematic-debugging** | superpowers | Supporting | Consider importing into P2A's skills/ directory | **Medium** |
| **dispatching-parallel-agents** | superpowers | Supporting | Mention for multi-asset requests | **Low** |
| **clarifier** | wazir | Supporting | Monitor; import if brand-system expansion | **Low** |
| **writing-plans** | superpowers | Supporting | Skip formalizing | **Skip** |
| **gemini-cli** | wazir | Supporting | Skip; P2A routing covers this | **Skip** |
| **unslop** | unslop | Indirect | Skip | **Skip** |
| **caveman** | caveman | Indirect | Skip | **Skip** |

---

## Skills P2A Should Build from Scratch

No existing marketplace skill covers these:

1. **`svg-authoring`** — SVG grammar, path-count heuristics, style taxonomy, failure patterns for `inline_svg` mode. frontend-design is the closest but lacks scale constraints and SVG specifics.

2. **`t2i-prompt-dialect`** — Per-model prompt rewriting rules, negative prompt translation, brand injection per provider. asset-enhancer has fragments; no dedicated standalone skill exists anywhere in the marketplace.

3. **`asset-validation-debug`** — Failure taxonomy, repair primitives, retry budget, diagnosis tree. systematic-debugging covers general debugging; nothing covers P2A's specific failure modes.

4. **`brand-consistency`** — Multi-asset style coherence, LoRA training workflow, convergence criteria. frontend-design covers single-component aesthetics; nothing covers asset-set consistency.

---

## Recommended CLAUDE.md Addition

```markdown
## Complementary Skills

**aesthetic direction** — Before generating a primary brand asset (logo, app icon), invoke the
`frontend-design` skill to commit to a bold, specific aesthetic direction (brutalist, organic, 
luxury, etc.). Feed that direction into `asset_enhance_prompt()` as part of the brief.

**live documentation** — For current SVG specs, Canvas API, image model API parameters, or 
any library P2A depends on, call `context7` instead of relying on P2A's built-in research.

**brief clarification** — For vague briefs on primary brand assets, invoke `brainstorming` 
to explore 2–3 design directions and get user approval before routing to a generator.
```
