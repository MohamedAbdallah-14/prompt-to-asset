# Launch checklist — prompt-to-asset 0.2.0

Every autonomous step is done. What's left needs you in a browser (OAuth, 2FA, web forms, upvote identity).

Work through this in order. Rough total: 60–90 minutes across all items.

---

## Already shipped (autonomous)

- npm package published: `prompt-to-asset@0.2.0` — https://www.npmjs.com/package/prompt-to-asset
- GitHub repo: main branch pushed, tag `mcp-server-v0.2.0` pushed, release drafted with `.mcpb` attached
- Repo topics, description, homepage, discussions+issues enabled
- `server.json`, `smithery.yaml`, `.github/workflows/docker.yml` committed
- `.mcpb` bundle built at `dist-release/prompt-to-asset-0.2.0.mcpb` and attached to the GitHub release
- README install badges + one-click deeplinks (Cursor / VS Code / Claude Desktop / Smithery)

---

## Needs you (browser / 2FA / user identity)

### 1 — Republish to npm as 0.2.1 so the MCP Registry can verify ownership

The registry wants `mcpName` in the *published* package.json; 0.2.0 doesn't have it. Bump and republish:

```bash
cd /Users/mohamedabdallah/Work/Projects/prompt-to-asset/packages/mcp-server
npm version patch    # 0.2.0 → 0.2.1
npm publish          # OTP prompt — your 2FA code
cd ../..
# update server.json version to match
sed -i '' 's/"version": "0.2.0"/"version": "0.2.1"/' server.json
sed -i '' 's/"version": "0.2.0"/"version": "0.2.1"/' packages/mcp-server/../../packages/mcp-server/package.json 2>/dev/null || true
```

Then publish to the Official MCP Registry (authenticated earlier):

```bash
mcp-publisher publish
```

Confirm listing at `https://registry.modelcontextprotocol.io/` — search for `prompt-to-asset`.

### 2 — Smithery

https://smithery.ai/new → sign in with GitHub → select `MohamedAbdallah-14/prompt-to-asset` → Smithery auto-reads `smithery.yaml` (already committed). No extra fields to fill.

After listing appears, the install URL becomes `https://smithery.ai/server/prompt-to-asset` and the universal install command:

```bash
npx -y @smithery/cli install prompt-to-asset --client claude
```

### 3 — Glama.ai

Auto-crawls public GitHub repos tagged with MCP topics. Nothing to submit. Listing self-bootstraps at `https://glama.ai/mcp/servers/@MohamedAbdallah-14/prompt-to-asset` within 24-48 hours. Check back; if it's not there after 3 days, submit via https://glama.ai/mcp/servers/new.

**This matters because** Glama's A/B quality score is a precondition for the `punkpeye/awesome-mcp-servers` PR.

### 4 — Cursor Directory

https://cursor.directory/plugins/new → sign in → fill:

- **Name**: prompt-to-asset
- **Description**: MCP server + CLI for production-grade software assets (logos, app icons, favicons, OG images, illustrations). Routes across 30+ image models; works zero-key first.
- **Install command**: `npx prompt-to-asset`
- **Deeplink**: the Cursor URL from README
- **Tags**: mcp, image, logo, favicon, og-image, app-icon, flutter, zero-key

### 5 — Cline Marketplace

File an issue at https://github.com/cline/mcp-marketplace/issues/new with this body (already drafted):

```markdown
## New MCP Server submission: prompt-to-asset

**Repo**: https://github.com/MohamedAbdallah-14/prompt-to-asset
**npm**: https://www.npmjs.com/package/prompt-to-asset
**Logo**: see repo /docs/logo-400x400.png (add one)

### Install

```
npx prompt-to-asset
```

### Config

```json
{
  "mcpServers": {
    "prompt-to-asset": {
      "command": "npx",
      "args": ["-y", "prompt-to-asset"]
    }
  }
}
```

Optional env vars (any subset): OPENAI_API_KEY, GEMINI_API_KEY, IDEOGRAM_API_KEY, RECRAFT_API_KEY, BFL_API_KEY, STABILITY_API_KEY, LEONARDO_API_KEY, FAL_API_KEY, HF_TOKEN, REPLICATE_API_TOKEN, CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.

Zero-key path works out of the box via Pollinations, Stable Horde, HF free tier, or `inline_svg` mode.

### Tools (17)

asset_capabilities, asset_enhance_prompt, asset_generate_logo, asset_generate_app_icon, asset_generate_favicon, asset_generate_og_image, asset_generate_illustration, asset_generate_splash_screen, asset_generate_hero, asset_save_inline_svg, asset_ingest_external, asset_remove_background, asset_vectorize, asset_upscale_refine, asset_validate, asset_brand_bundle_parse, asset_train_brand_lora.
```

### 6 — Continue Hub

https://hub.continue.dev → New Block → MCP Server. Fill the YAML with `command: npx`, `args: [-y, prompt-to-asset]`, env schema from `smithery.yaml`.

### 7 — mcp.so

https://mcp.so/submit → paste the repo URL + 1-line description. 10 min.

### 8 — PulseMCP

https://www.pulsemcp.com/submit → form (repo URL, name, description, tags). 10 min.

### 9 — punkpeye/awesome-mcp-servers PR (after Glama lists)

https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md → PR adding under the right category (likely "Developer Tools" or "Image Generation"). Format required by the PR template:

```markdown
- [MohamedAbdallah-14/prompt-to-asset](https://github.com/MohamedAbdallah-14/prompt-to-asset) ([Glama Profile](https://glama.ai/mcp/servers/@MohamedAbdallah-14/prompt-to-asset)) 🎖️ - One brief → a validated multi-platform asset bundle (iOS / Android / PWA / favicon / OG / visionOS). Routes across 30+ image models; works zero-key.
```

### 10 — wong2/awesome-mcp-servers

Simpler: PR with the line above (minus the Glama link).

### 11 — GitHub social preview image

Settings → Social preview → upload a 1280×640 PNG. Use the logo + one-line pitch. This is what HN / Twitter / Slack cards render.

### 12 — Launch posts

**Show HN** (title prefix required):
> Show HN: Prompt-to-asset – MCP server that generates production-grade logos/icons/favicons without a paid API key

Body: link to repo + 5-6 sentences explaining the three modes + one killer example. Post Tue/Wed morning US Pacific time.

**Product Hunt** (create a maker account + product page ahead of time): tag as AI Tools + Developer Tools. Same day as HN.

**Reddit**:
- r/mcp (dedicated audience, ~15k) — full write-up
- r/ClaudeAI, r/ClaudeCode — focus on the MCP install
- r/cursor — focus on the Cursor deeplink + smithery install
- r/LocalLLaMA — angle the zero-key / self-host Phase-4 ComfyUI story

**Twitter/X**: tag @AnthropicAI @cursor_ai @smithery_ai @ClineApp. `#MCP #ClaudeCode`. Use a 4-image carousel showing inline_svg → favicon → app icon → validator output.

### 13 — npm trusted publisher (optional, recommended)

https://www.npmjs.com/package/prompt-to-asset → Settings → Publishing access → GitHub Actions. Once configured, delete `NPM_TOKEN` from the repo secrets — OIDC replaces it. `publish.yml` is already wired for `--provenance`.

### 14 — Codecov

https://app.codecov.io/gh/MohamedAbdallah-14/prompt-to-asset → add repo → copy the upload token → https://github.com/MohamedAbdallah-14/prompt-to-asset/settings/secrets/actions → New secret → name `CODECOV_TOKEN`, paste value. The CI `coverage` job is already pointed at it.

### 15 — npm Trusted Publisher deletion of long-lived token

After Trusted Publisher is set up, delete the `NPM_TOKEN` secret in repo Settings → Secrets → Actions. Safer.

---

## Verify it all worked

After each submission, spot-check the listings:

```bash
# Registry
curl -s https://registry.modelcontextprotocol.io/v0/servers 2>&1 | grep prompt-to-asset | head -3

# Smithery
curl -s https://smithery.ai/server/prompt-to-asset | grep "prompt-to-asset" | head

# Glama
open https://glama.ai/mcp/servers/@MohamedAbdallah-14/prompt-to-asset

# PulseMCP
open https://www.pulsemcp.com/servers
```
