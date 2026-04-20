---
wave: 3
role: combination-planner
slug: 01-mvp-2-weeks
optimization_criterion: "Ship a working tri-surface MVP in 14 days"
date: 2026-04-19
---

# Stack: MVP-in-2-Weeks

## TL;DR (5 bullets max)

- **Fork `run-llama/mcp-nextjs`** (MIT, OAuth 2.1 + Prisma + PKCE wired), upgrade to `mcp-handler@^1.1.0` + `withMcpAuth`, move routes to `app/api/[transport]/route.ts`, layer product UI on top — surfaces #1 (web) and #2 (hosted MCP) ship in week 1 (per `22-repo-deep-dives/19-vercel-mcp-stack.md`).
- **Vercel AI SDK v5 `experimental_generateImage` with two providers only** — `@ai-sdk/openai` (`gpt-image-1` for native RGBA + text) and `@ai-sdk/google-vertex` (`imagen-4.0-generate-001` for flat logos) — capability-routed, no self-hosting (per `22-repo-deep-dives/20-vercel-ai-sdk-image.md`).
- **Rewriter is LLM-as-a-service, not self-hosted.** Port `shinpr/mcp-image`'s Subject–Context–Style system prompt + slot-flag `MUST`-block pattern, generalize to asset-type slots, call Claude 4 Sonnet — defer Hunyuan-7B/32B and Promptist (13–67GB + GPU is not a 14-day scope per `22-repo-deep-dives/01-hunyuan-prompt-to-asset.md`).
- **Platform-spec bundle = three MIT Node libraries behind one MCP tool**: `pwa-asset-generator` (Apple splash + favicon HTML), `@capacitor/assets` (iOS `AppIcon.appiconset` + Android adaptive), `icon-gen` (`.ico`/`.icns`). `@vercel/og` (Satori) for OG cards. Skip Takumi, LayerDiffuse, ComfyUI, rembg, vtracer.
- **Tri-surface #3 is a single `npx prompt-to-asset init` script** that writes `.cursor/mcp.json`, `claude mcp add` instructions, and `skills/prompt-to-asset/SKILL.md` into detected IDEs — modeled on `databricks-solutions/ai-dev-kit` per `21-oss-deep-dive/09-cross-ide-installers.md`. No `.mcpb`, no Smithery, no VSIX in v1.

## Layer choices

### 1. Prompt enhancement layer — **Claude 4 Sonnet via `@ai-sdk/anthropic` with a ported shinpr Subject–Context–Style system prompt**

A hosted LLM + well-crafted system prompt is the only rewriter path fitting 14 days. `shinpr/mcp-image`'s dev.to post measured **+94 %** quality uplift on Nano Banana with exactly this scaffold (per `22-repo-deep-dives/04-shinpr-mcp-image.md` §3); MIT-licensed so we lift the `SYSTEM_PROMPT` constant directly. Generalize the three boolean flags into six asset-type slots (`asset_type`, `transparency_required`, `text_content`, `target_model_family`, `brand_palette`, `platform_constraints`), each injecting a mandatory `MUST`-block. Alternatives considered: Hunyuan-PromptEnhancer (7B/32B, needs A10/A100, EU/UK/KR license exclusion on the 7B); Promptist (125M, CPU-safe, hard-coded LAION-aesthetic bias is actively wrong for logos); SuperPrompt-v1 (77M, too weak for slot-fidelity intent decomposition).

### 2. Model routing / SDK layer — **Vercel AI SDK v5 `experimental_generateImage` (`ai@^5.0.167`) with `@ai-sdk/openai` + `@ai-sdk/google-vertex`**

`openai.image('gpt-image-1')` covers native RGBA (`providerOptions.openai.background: 'transparent'`), up to 16 reference images, best-in-class text rendering; `vertex.image('imagen-4.0-generate-001')` covers flat vector-style logos with aspect-ratio + negative prompts. `ImageModelV2` means `@ai-sdk/fal` / `@ai-sdk/togetherai` / `@ai-sdk/replicate` drop in at v1.1 without touching call sites. Alternatives considered: OpenRouter (base64-only + lossy provider options = fallback, not primary); direct fal/Together SDKs (realtime WebSocket and 8-ref-image are killer v1.1 features, not MVP); LangChain/LlamaIndex (OpenAI-only image support, wrong foundation per `INDEX.md` ¶9).

### 3. Execution layer — **Hosted APIs only (OpenAI Images + Vertex Imagen REST), no self-hosted ComfyUI**

ComfyUI + LayerDiffuse is the correct long-run answer (`22-repo-deep-dives/17-comfyui-layerdiffuse.md`) but needs baked containers, GPU serverless, node-drift management, and workflow-JSON dispatch (`21-oss-deep-dive/18-serverless-comfyui-patterns.md`) — multi-week. `gpt-image-1`'s `background: 'transparent'` gives native alpha at $0.04/image and 5–8 s latency, sufficient until v1.1. Alternatives considered: `replicate/cog-comfyui` with `workflow_json` input, Modal ComfyApp (both right long-run, wrong week); forking ComfyUI (GPL contamination).

### 4. Post-processing layer — **`@imgly/background-removal-node` matting fallback only; default to native alpha from `gpt-image-1`**

`danielgatis/rembg` (22k★) is Python-only and forces a second runtime. `@imgly/background-removal-node` runs pure-Node via ONNX — the cleanest swap-in when `gpt-image-1` produces a white-boxed output (the Gemini "weird boxes" failure mode per `INDEX.md` finding 12). Vectorization (`vtracer`) deferred; MVP ships PNG + WebP only. Alternatives considered: rembg / BRIA RMBG 2.0 (wrong runtime); vtracer (not in 14 days); LayerDiffuse (see layer 3).

### 5. Platform-spec / resizer layer — **`pwa-asset-generator` + `@capacitor/assets` + `icon-gen` behind one MCP tool `resize_icon_set`**

The layer with strongest OSS coverage and zero invention required (`21-oss-deep-dive/10-oss-appicon-replacements.md`, `11-oss-favicon-generators.md`). `pwa-asset-generator` (MIT, 3k★, 17.6k weekly npm, per `22-repo-deep-dives/10-pwa-asset-generator.md`) owns PWA + Apple splash + favicon HTML + mstile; `@capacitor/assets` (MIT, ~263k weekly npm, per `22-repo-deep-dives/11-capacitor-assets.md`) owns iOS `AppIcon.appiconset` + Android adaptive; `icon-gen` (MIT, ~26.5k weekly npm, per `22-repo-deep-dives/12-npm-icon-gen.md`) owns `.ico` + `.icns` binary writing (~40 KB of RLE24 code we must not rewrite). All three via Node APIs in-process, one shared `sharp` instance — `22-repo-deep-dives/11-capacitor-assets.md` documents the undiscovered programmatic surface. Alternatives considered: `itgalaxy/favicons` (overlaps PAG, adds weight); `RealFaviconGenerator/generate-favicon` (add v1.1 as a CI diff-testing oracle).

### 6. Validation / evaluation layer — **Alpha-coverage + palette-adherence + size-bound checks via `sharp`; skip text-legibility and CLIPScore**

The full AlignEvaluator-grade loop (`INDEX.md` cross-cutting pattern #4) is the moat but multi-week. MVP ships three sharp-based checks in ~100 LOC: (a) alpha-coverage 10 %–95 % (catches solid-fill and zero-alpha regressions); (b) dominant-color distance ≤ ΔE 20 from brand palette; (c) min-dimension ≥ 1024 px. Surface in `validate_asset` response; on failure include a `regenerate_hint` the agent can feed back into `enhance_prompt`. Alternatives considered: CLIPScore / PickScore / T2I-CompBench (`21-oss-deep-dive/06-t2i-eval-harnesses.md`) = right v1.1; OCR via `tesseract.js` = right idea, wrong scope.

### 7. Brand bundle layer — **Accept `brand.md` (thebrandmd format) as input; defer `dembrandt` URL-ingest and Figma read-through**

Formats are defined but no tool *consumes* them (`INDEX.md` ¶15) — our stated moat. MVP: parse `brand.md` (plain markdown with headed Colors/Typography/Voice/Do-Not sections) with `gray-matter`, pipe palette hex + typography + voice tokens into the rewriter's system prompt. ~150 LOC; delivers "next asset inherits brand automatically" after first generation. Dembrandt, AdCP `brand.json`, Figma MCP read-through → v1.1. Alternatives considered: custom schema (rejected — thebrandmd exists); require structured JSON (UX friction kills first-use).

### 8. Agent surface layer (MCP, Skills, CLI, WebMCP) — **Hosted Streamable HTTP MCP at `/api/[transport]` + one Claude Code SKILL.md + `npx prompt-to-asset init` stamper**

No OSS repo ships the tri-surface (`21-oss-deep-dive/19-tri-surface-starters.md`); we assemble it. Hosted MCP is structural via `mcp-handler` + `withMcpAuth`, same `lib/tools/` imported by the UI (`22-repo-deep-dives/19-vercel-mcp-stack.md` parity pattern). Ship one canonical `skills/prompt-to-asset/SKILL.md` body — consumed unchanged by Claude Code, Cursor (`.cursor/skills/`), Windsurf (`.windsurf/skills/`) per `21-oss-deep-dive/15-skills-packaging-formats.md` — plus a Node `init` that detects `~/.claude/`, `~/.cursor/`, `.vscode/` and writes MCP config for each. Stdio deferred (`npx -y mcp-remote <url>` bridges for free). WebMCP / `.mcpb` bundle / Smithery / VSIX all deferred. Alternatives considered: `anthropics/mcpb` (v1.1 alongside Claude Desktop Directory submission); Smithery (v1.1 after uptime evidence).

### 9. UI layer — **Next.js 15 App Router + Tailwind 4 + shadcn/ui + Auth.js (Google OAuth), split-panel inspired by `Nutlope/logocreator`**

Users already understand `logocreator`'s split-panel + six-preset shape; copy it in spirit only (repo has *no* LICENSE file per `22-repo-deep-dives/03-nutlope-logocreator.md`, so code copy is legally dangerous). Replace Clerk with Auth.js (already wired); keep BYOK + rate-limit conceptually; fix Nutlope's bugs (the "Tech" preset's `photorealistic, cinematic` is actively wrong for vector logos). Add: prompt-preview pane, validation badge row, `resize_icon_set` → ZIP button. Alternatives considered: `vercel-labs/open-agents` (overkill coding-agent framework); `appicon-forge` UI (wrong product — composition-from-Iconify).

### 10. Distribution / registry layer — **GitHub public repo + Vercel Deploy button + single hosted URL `https://mcp.prompt-to-asset.app/mcp`**

The two things users actually do with an MCP in 2026: (a) click Deploy-to-Vercel for their own instance with BYOK; (b) paste our hosted URL into their IDE config. MVP ships both (same model as `vercel-labs/mcp-for-next.js`). Smithery needs registry round-trip; v0-platform-mcp needs a Vercel partner app; both v1.1 after uptime evidence. Alternatives considered: `mcpmux/homebrew-tap` gateway (hosted URL redundant); `.mcpb` in Claude Desktop Directory (v1.1).

## Dependency list (package.json + pyproject.toml skeleton)

```json
{
  "name": "prompt-to-asset",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "db:push": "prisma db push",
    "test:mcp": "node scripts/test-mcp-client.mjs",
    "init": "node scripts/init.mjs"
  },
  "dependencies": {
    "next": "^15.3.0", "react": "^19.0.0", "react-dom": "^19.0.0",
    "mcp-handler": "^1.1.0", "@modelcontextprotocol/sdk": "1.26.0", "zod": "^3.25.0",
    "ai": "^5.0.167", "@ai-sdk/anthropic": "^2.0.0", "@ai-sdk/openai": "^2.0.0",
    "@ai-sdk/google-vertex": "^2.0.0",
    "next-auth": "^5.0.0-beta.28", "@auth/prisma-adapter": "^2.9.1",
    "@prisma/client": "^6.10.0", "redis": "^4.7.0",
    "@vercel/blob": "^0.26.0", "@vercel/og": "^0.6.0", "satori": "^0.12.0",
    "sharp": "^0.34.0", "icon-gen": "^5.0.0",
    "pwa-asset-generator": "^8.1.4", "@capacitor/assets": "^3.0.5",
    "@imgly/background-removal-node": "^1.4.0",
    "@radix-ui/react-dialog": "^1.1.0", "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-select": "^2.1.0", "class-variance-authority": "^0.7.0",
    "tailwind-merge": "^2.5.0", "lucide-react": "^0.454.0", "framer-motion": "^11.11.0",
    "@upstash/ratelimit": "^2.0.0", "@upstash/redis": "^1.34.0",
    "dedent": "^1.5.0", "jszip": "^3.10.0", "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "prisma": "^6.10.0", "typescript": "^5.6.0", "tailwindcss": "^4.1.0",
    "@types/node": "^22.0.0", "@playwright/test": "^1.48.0"
  }
}
```

No `pyproject.toml` — MVP is pure Node/TypeScript. Python re-enters at v1.1 with ComfyUI workers, Hunyuan self-hosting, or rembg fallback. Chromium installs via `pwa-asset-generator`'s post-install (~150 MB) baked into the Vercel build output.

## 14-day build order

**Day 1 — Scaffolding.** Clone `run-llama/mcp-nextjs`. Rename `@vercel/mcp-adapter` → `mcp-handler@^1.1.0`; bump `@modelcontextprotocol/sdk` to `1.26.0`; move `src/app/mcp/[transport]/` → `app/api/[transport]/` so `basePath: "/api"` works; replace hand-rolled Bearer check with `withMcpAuth(...)`. Verify via MCP Inspector + Claude Desktop through `mcp-remote`. **Gate:** Inspector connects, echo tool returns.

**Day 2 — Schema + shared handler skeleton.** Extend `prisma/schema.prisma` with `Brand`, `Asset`, `Generation` models. Migrate. Create `lib/tools/` with empty `enhance_prompt.ts`, `generate_logo.ts`, `resize_icon_set.ts`, `validate_asset.ts`, `list_history.ts` + Zod schemas. Wire `registerTools(server)` to register all of them. **Gate:** `npm run test:mcp` lists all five tools.

**Day 3 — `enhance_prompt` tool.** Port `shinpr/mcp-image`'s Subject–Context–Style system prompt verbatim (MIT; attributed in `SKILL.md`). Wrap in `buildFeatureContext({ asset_type, transparency_required, text_content, brand_bundle, target_model_family })`. Call `generateText({ model: anthropic('claude-4-sonnet-20260301'), system, prompt, temperature: 0.7, maxTokens: 1000 })`. Return `{ enhanced_prompt, rationale, selected_slots[], recommended_model }`. **Gate:** "make me a logo for a coffee shop" returns 150–400 words with S–C–S structure, no "photorealistic" poison, `gpt-image-1` recommended when `transparency_required`.

**Day 4 — `generate_logo` + `generate_og_card` + multi-model dispatch.** Implement `selectProvider(intent, caps, registry)` from `22-repo-deep-dives/20-vercel-ai-sdk-image.md`. Wire `openai.image('gpt-image-1')` (with `providerOptions.openai.background: 'transparent'` when `transparency_required`) + `vertex.image('imagen-4.0-generate-001')` (set `enhancePrompt: false` because *we* own that). Upload to Vercel Blob; return `{ blobUrl, width, height, mediaType, modelId, revisedPrompt, cost }`. `generate_og_card` = single `@vercel/og` JSX template over the brand bundle. **Gate:** both models return 1024² PNGs; transparency flag produces verifiable alpha.

**Day 5 — `resize_icon_set` fan-out.** Thin wrapper around `pwa-asset-generator`'s `generateImages()` + `@capacitor/assets`'s `IosAssetGenerator` / `AndroidAssetGenerator` / `PwaAssetGenerator` + `icon-gen`. All via buffer-in/buffer-out adapter (write to `os.tmpdir()`, call, read back, clean up — per `22-repo-deep-dives/12-npm-icon-gen.md`). Compose into in-memory ZIP with JSZip. **Gate:** feed the day-4 logo back, get a ZIP with iOS `AppIcon.appiconset/`, Android `mipmap-*/`, PWA WebP + `manifest.webmanifest`, `favicon.ico`, `favicon.icns`, `apple-touch-icon.png`, `og.png`.

**Day 6 — `validate_asset` + `brand_bundle_parse`.** Three sharp-based validators in `lib/validators/{alpha,palette,size}.ts`. `brand_bundle_parse` uses `gray-matter` on `brand.md`; extracts `colors[]`, `typography`, `voice`, `do_not[]`; persists to `Brand`. Surface hex colors back into `enhance_prompt`'s feature-context as `brand_palette`. **Gate:** regen of the same logo with brand attached produces ΔE < 20 palette bias 4/5 runs.

**Day 7 — Web UI #1: generator page.** Clone `Nutlope/logocreator`'s split-panel layout (shape only). shadcn components: six style preset cards (strip Nutlope's bad "Tech" prompt — rewrite from `21-oss-deep-dive/01-logo-brand-loras.md` guidance), Company Name, brand.md drag-drop, generate. Right panel: skeleton → image → Download PNG / Download ZIP / Regenerate. Collapsible rewritten-prompt panel (differentiator — Nutlope hides it). Wire to `app/api/ui/generate/route.ts` importing the *same* `lib/tools/*` modules — structural parity. **Gate:** e2e — typed brand, clicked Modern → saw prompt → saw logo → downloaded ZIP.

**Day 8 — Web UI #2: library + brand editor + auth gate.** `app/(dashboard)/library/page.tsx` lists user's `Asset` rows; `app/(dashboard)/brand/page.tsx` is a Monaco editor bound to `Brand.markdown` with a Validate button running `brand_bundle_parse`. Gate MCP + UI routes behind Auth.js Google sign-in. `@upstash/ratelimit` with `Ratelimit.fixedWindow(3, "60 d")` keyed on `user.id`; add BYOK field (encrypted `User.unsafeMetadata`). **Gate:** new-user flow works; unauth MCP calls return 401 + `WWW-Authenticate: Bearer resource_metadata=…`.

**Day 9 — OAuth consent polish + Skill pack body.** Polish the `oauth/authorize` page with branding + scope list (`asset:generate`, `asset:read`, `brand:write`). Write `skills/prompt-to-asset/SKILL.md`: frontmatter `name`, `description`, `allowed-tools` listing our five MCP tools; body explains when to call `enhance_prompt` before `generate_logo`. Symlink `AGENTS.md → skills/prompt-to-asset/SKILL.md` for LCD coverage. **Gate:** Inspector, Claude Desktop, and Cursor all complete the OAuth handshake; Claude Code reads the `SKILL.md` and auto-invokes `enhance_prompt` on bare "make a logo".

**Day 10 — `npx prompt-to-asset init` + `scripts/test-mcp-client.mjs`.** Node-based installer modeled on `databricks-solutions/ai-dev-kit` (Node so Windows works). Detects `~/.claude/`, `~/.cursor/`, `.vscode/`, `~/.config/zed/`, `~/.gemini/`; writes the right MCP config for each with our hosted URL + OAuth instructions. Flags: `--only claude,cursor`, `--dry-run`, `--uninstall`. Smoke test boots the app, authenticates, calls every tool. Wire into GitHub Actions. **Gate:** fresh clone → `pnpm install` → `pnpm dev` → `npx prompt-to-asset init` → Cursor's tool list shows all five tools.

**Day 11 — Playwright + token counting.** One Playwright test: signs in, drops brand.md, generates logo, downloads ZIP, asserts ≥50 files and non-empty iOS 1024² PNG. Wire Helicone pass-through (`baseURL: "https://<vendor>.helicone.ai/v1"` when `HELICONE_API_KEY` set — Nutlope's pattern). Log `Generation.costUsd` per call. **Gate:** Playwright green; Helicone traces.

**Day 12 — Production deploy.** Create `prompt-to-asset.app` + `mcp.prompt-to-asset.app`. Enable Fluid Compute (required for MCP SSE per `22-repo-deep-dives/19-vercel-mcp-stack.md`); `maxDuration: 800`; attach Upstash Redis (TCP `REDIS_URL`, not REST — `mcp-handler` requires node-redis). Deploy, re-run Playwright against production. **Gate:** `curl .../.well-known/oauth-protected-resource` returns valid RFC 9728 JSON; OAuth round-trips.

**Day 13 — Pilot user + README + Deploy-to-Vercel button.** Onboard one outside-the-team pilot (designer with a real project). Watch, fix top-three UX bugs live. Write README: 90-second demo GIF, five-step install (Claude Code, Cursor, VS Code, Claude Desktop via `mcp-remote`, web), Deploy-to-Vercel button, BYOK instructions, cost estimates. **Gate:** pilot generates a brand-complete kit unassisted in ≤10 min and ships it into their project.

**Day 14 — Bug-fix buffer + demo + ship.** Reserved for regressions. Full integration pass across Inspector + Claude Desktop + Cursor + VS Code + web. Record ≤90s demo: `enhance_prompt` → `generate_logo` → `validate_asset` → `resize_icon_set` → ZIP. Announce on X and HN. **Gate:** shipped; five outside users in first 48 h.

## Risks & mitigations

- **Fork drift** (`@vercel/mcp-adapter ^0.11.1` old name; MCP SDK `^1.13.1` lags 1.26.0 CVE floor per `22-repo-deep-dives/19-vercel-mcp-stack.md`). *Mitigation:* rename + bump day 1; pin lockfile; weekly rebuild per `INDEX.md` cross-cutting pattern #5.
- **`gpt-image-1 background: 'transparent'` regressions** ("transparent also cuts other white spots" per `21-oss-deep-dive/04-native-rgba-generation.md`). *Mitigation:* always run `validate_asset` alpha-coverage; on failure retry `background: 'auto'` + `@imgly/background-removal-node`; on second failure return structured error to agent.
- **`pwa-asset-generator` Chromium bloat** (~150 MB post-install vs. Vercel Fluid size cap). *Mitigation:* bake Chromium into Build Output API layer; set `PUPPETEER_EXECUTABLE_PATH`; warm singleton `BrowserManager` (per `22-repo-deep-dives/10-pwa-asset-generator.md`).
- **Nutlope license ambiguity** (no LICENSE, issue unanswered 14 months). *Mitigation:* inspire-only; no code paste; shadcn + Tailwind + Radix written fresh — visual shape is not copyrightable.
- **Subject–Context–Style tilts Claude photorealistic** (camera/lens/aperture bias). *Mitigation:* day 3 patch Style block with asset-type-conditional guidance (logos → "flat vector, no photographic terms"; icons → "single-glyph, centered, safe-zone"; OG → "text legibility primary"). Evals harness day 11.
- **Auth.js + MCP interplay fragile** (fork uses hand-rolled Bearer, bypasses `withMcpAuth`'s `WWW-Authenticate` challenge per `22-repo-deep-dives/19-vercel-mcp-stack.md`). *Mitigation:* swap in `withMcpAuth` day 1 — must not skip.

## Deliberately dropped scope (what we would NOT do in an MVP)

- **No self-hosted rewriter model.** Hunyuan-7B/32B, Promptist, SuperPrompt-v1, BeautifulPrompt deferred. 13–67 GB + GPU + distillation = v1.2.
- **No ComfyUI workers.** LayerDiffuse, RunPod, Modal, Replicate-Cog-ComfyUI, workflow-JSON dispatch all deferred. Hosted closed-API models only.
- **No fal realtime / Together 8-ref-image / Recraft / OpenRouter.** Ship OpenAI + Vertex only. Each is a real v1.1 feature, none is necessary for a tri-surface MVP.
- **No vectorization.** No `vtracer`, no Recraft V3, no SVG. PNG + WebP + ICO + ICNS only. SVG is first v1.1 feature.
- **No `.mcpb`, no Smithery, no v0 registry, no VSIX.** The `init` script + hosted URL + Deploy-to-Vercel do distribution for 5+ IDEs on day 10. Registries = v1.1.
- **No WebMCP.** Chrome 146+ `navigator.registerTool()` is exciting (`21-oss-deep-dive/14-webmcp-impls.md`) but 0 production users in 2026. Defer.
- **No Figma MCP, no `dembrandt`, no AdCP `brand.json`.** Only `brand.md` in MVP.
- **No billing / Stripe / paid tiers.** Free tier (3 generations/60d) + BYOK. `f/mcp-startup-framework`'s pattern = v1.1 reference.
- **No sticker/emoji, mascot-character-consistency, UI-illustration generator.** Deep-dive categories `13, 16, 20` = v1.1 expansions.
- **No full 24-point AlignEvaluator.** Three sharp checks only. 24 key points + our 6–8 asset extensions = v1.2.
- **No history analytics, no admin dashboard, no team accounts.** Single-user, one brand per user.

## Scorecard (1–5 on these dimensions, 5 = best)

- ship-speed: **5** — forked OAuth-complete MCP + three MIT Node libs + one hosted rewriter + two hosted image APIs is the most tractable 14-day bundle producing a real tri-surface product.
- asset-correctness: **3** — native RGBA via `gpt-image-1`, alpha/palette/size validation, battle-tested platform-spec resizing. Weak: no text-legibility, CLIPScore, LayerDiffuse, vectorization, or text-in-image fixing.
- license-safety: **5** — every dep MIT/Apache-2.0. Inspire-only on Nutlope. No GPL, no CC-BY-NC, no Tencent-7B EU/UK/KR encumbrance.
- cost: **3** — ~$0.025/logo (`gpt-image-1`) + ~$0.01/enhance (Claude 4 Sonnet). 1k gen/day ≈ $35/day. Room to drop 3→5 in v1.1 with Flux Schnell + self-hosted rewriter.
- ops-burden: **4** — Next.js on Vercel + Neon + Upstash + Blob + three API keys. No GPU, no self-hosted inference, no queue, no worker. Weekly lockfile rebuild + monthly dep bump = whole runbook.
- agent-native-parity: **4** — every UI action is an MCP tool behind shared `lib/tools/` (parity pattern per `22-repo-deep-dives/19-vercel-mcp-stack.md`). Skill pack + `init` covers 5+ IDEs day 10. Weak: no stdio bundle (v1.1 via `anthropics/mcpb`); WebMCP deferred.
- distribution-reach: **3** — hosted URL + Deploy-to-Vercel + `npx init` reaches Claude Code / Cursor / VS Code / Claude Desktop (via `mcp-remote`) / Windsurf / Zed / Codex. Gaps: Smithery, VS Code MCP Registry, Anthropic Directory, v0 — all v1.1.
- **total: 27/35**

The plan is decisively optimized for day-14 shipability over long-run correctness, model breadth, or OSS purity. The v1.1 → v1.2 roadmap is the inverse: every point dropped from ops-burden, cost, asset-correctness, and distribution-reach is a known next move backed by specific OSS references catalogued in the wave-1/wave-2 corpus. What ships on day 14 is a real tri-surface product a real user can generate a real brand kit through — built on dependencies whose licenses, APIs, and release cadences we have verified one by one.
