# Research Update Log — Category 34 (Part B: files 10+)
**Date:** 2026-04-21  
**Scope:** Files 10+ alphabetically in `34-installable-skills-survey/`, plus SYNTHESIS.md and index.md  
**Files in scope:** index.md, LANDSCAPE.md, multi-provider-mcp-servers.md, nano-banana-skills.md, NEW-SKILLS-ROADMAP.md, openai-official-skills.md, SYNTHESIS.md, video-generation-skills.md, web-asset-skills.md

---

## Summary of Changes

### index.md
- Updated frontmatter to add `last_updated: 2026-04-21`
- Added a "Key facts current as of 2026-04-21" callout block with 9 bullet points covering all major topics verified in this audit session

### LANDSCAPE.md
- **Smithery row updated:** 6k+ → 7k+ servers in the collection table
- Added inline `> Updated` block confirming Smithery crossed 7,000 servers April 2026, with hosted remote server support
- **Nano-banana skill section:** corrected the "free tier" claim — Google free image-gen quota removed December 2025; skill now requires billed project. Added `> Updated` block.
- **Platform install table:** Added GitHub Copilot row (MCP + Agent Skills GA March 2026; `microsoft/skills` repo; `.agent.md` format); updated Gemini CLI row (Agent Skills native March 2026); updated Claude Code MCP column (Streamable HTTP support noted)
- **New section added:** "New Skill/Plugin Marketplaces (2025–2026)" — full table covering skills.sh, Smithery (7k+), vercel-labs/skills CLI v1.1.1, mcpmarket.com, mdskills.ai, claudemarketplaces.com, microsoft/skills
- Added MCP-as-unifying-layer paragraph with AAIF facts (170+ members, Mazin Gilbert as permanent ED)
- Added SSE deprecation note (MCP spec 2025-03-26; Streamable HTTP is production standard)

### SYNTHESIS.md
- Updated frontmatter: added `last_updated: 2026-04-21`
- **Platform install table:** Added GitHub Copilot row; updated Gemini CLI row; updated Claude Code MCP column with Streamable HTTP note
- **Practical install path section (items 1–5):** Extended to 6 items; added Gemini CLI Agent Skills note; added GitHub Copilot path; added vercel-labs/skills (`npx skills`) as universal item with v1.1.1, ~14.7k★, `npx skills find`, skills.sh
- Added `> Updated` block at end of install path section summarizing SSE deprecation and Streamable HTTP
- **Nano Banana section:** Added `> Updated` block noting 347-star count reflects historical adoption, correcting free-tier claim, adding AAIF/Smithery ecosystem context, confirming Mazin Gilbert as permanent ED

### multi-provider-mcp-servers.md
- Added `> Updated` block to lansespirit/image-gen-mcp Architecture Highlights section: SSE deprecated (MCP spec 2025-03-26); Streamable HTTP is correct choice for Claude Code integration

### nano-banana-skills.md
- Added `> Updated` block before "Model Status as of April 2026" heading: confirms `gemini-3-pro-image-preview` dead as of April 21, confirms `gemini-3.1-flash-image-preview` active, restates free-tier removal, directs to Cloudflare Workers AI / HF Inference / Pollinations for zero-key generation

### NEW-SKILLS-ROADMAP.md
- Rewrote the nano-banana `GEMINI_API_KEY` requirement paragraph: removed "obtainable without a credit card" claim (now incorrect since free image tier removed), replaced with accurate billing requirement, noted $0.039/img pricing, directed zero-key users to Cloudflare Workers AI
- Added `> Updated` block restating active/dead model IDs and reframing skill as "low-cost Gemini" not "free tier"

### openai-official-skills.md
- Added `> Updated` block after Finding #6 (agentskills.io standard): notes GitHub Copilot adoption of SKILL.md-shape agent skills (March 2026), microsoft/skills repo, vercel-labs/skills v1.1.1 supporting 19 agents, skills.sh as canonical leaderboard, declares SKILL.md has "won the agent skills portability war"

### video-generation-skills.md
- Added `> Updated` block after the Coverage Gaps paragraph in Section 3 (Provider Coverage Map): confirms no major new provider coverage changes; notes Veo 3.1 growing; confirms no free-tier programmatic video generation exists

### web-asset-skills.md
- Added `> Updated` block before "Summary: Largest Gaps" section: notes vercel-labs/skills v1.1.1 as standard cross-IDE install tool, skills.sh as leaderboard, recommends packaging surveyed skills via `npx skills`, cites MeiGen's multi-IDE install as the 2026 ecosystem expectation

---

## Facts Verified by Web Search

| Claim | Status | Source |
|---|---|---|
| Smithery 7,000+ servers April 2026 | Confirmed | truefoundry.com best-mcp-registries; automationswitch.com; workos.com/blog/smithery-ai |
| AAIF 170+ member organizations April 2026 | Confirmed | techzine.eu (146 members mid-April); linuxfoundation.org press releases show 97 new members batch; aaif.io/press |
| Mazin Gilbert permanent Executive Director of AAIF | Confirmed | aaif.io; linuxfoundation.org press |
| MCP's home is AAIF (Linux Foundation) | Confirmed | linuxfoundation.org formation announcement; aaif.io home |
| vercel-labs/skills v1.1.1 with `npx skills find` | Confirmed | vercel.com/changelog/skills-v1-1-1; github.com/vercel-labs/skills |
| vercel-labs/skills ~14.7k GitHub stars | Confirmed | search results (14.1k–14.7k range, April 2026) |
| skills.sh directory launched January 2026, 19 agents | Confirmed | virtualuncle.com; vercel.com/changelog |
| SSE transport deprecated in MCP spec 2025-03-26 | Confirmed | blog.fka.dev; modelcontextprotocol.io/specification/2025-03-26; brightdata.com; auth0.com |
| Claude Code supports Streamable HTTP for remote MCP | Confirmed | code.claude.com/docs/en/mcp; infoq.com news/2025/06/anthropic-claude-remote-mcp |
| GitHub Copilot MCP + Agent Skills GA March 2026 | Confirmed | devblogs.microsoft.com/visualstudio; docs.github.com/en/copilot |
| Gemini CLI Agent Skills support March 2026 | Confirmed | medium.com/google-cloud ("Gemini CLI extensions just got smarter: introducing Agent Skills") |
| `gemini-3-pro-image-preview` dead March 9, 2026 | Confirmed (consistent with existing research; no reinstatement announced) |
| Gemini free image tier removed December 2025 | Confirmed (consistent with existing research + CLAUDE.md memory) |

---

## Changes NOT Made (Out of Scope or Unchanged)

- Files 1–9 alphabetically (3d-realtime-emerging-skills.md, audio-tts-skills.md, awesome-collections-image-skills.md, composio-volt-collections.md, diagram-svg-skills.md, fal-ai-skills.md, figma-design-tool-skills.md, flux-and-antigravity-skills.md, free-nokey-generation-skills.md) — covered by the Part A update session (updates-34a.md expected)
- No changes to star counts for repos other than smithery server count and vercel-labs/skills — individual community repo stars fluctuate constantly and are not worth pinning
- No changes to pricing tables (fal.ai, OpenAI, etc.) — these are authoritative in data/model-registry.json
