---
title: "MCP Server Design for Asset Generation"
category: 19-agentic-mcp-skills-architectures
angle: 19b
subagent: research-19b
topics:
  - model-context-protocol
  - mcp-server-sdk
  - json-rpc
  - streamable-http
  - oauth-2.1
  - tool-schema
  - asset-generation
primary_sources:
  - https://modelcontextprotocol.io/specification/latest
  - https://modelcontextprotocol.io/specification/2025-06-18
  - https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
  - https://github.com/modelcontextprotocol/typescript-sdk
  - https://github.com/modelcontextprotocol/python-sdk
  - https://github.com/modelcontextprotocol/rust-sdk
  - https://github.com/modelcontextprotocol/go-sdk
  - https://modelcontextprotocol.io/docs/concepts/tools
  - https://modelcontextprotocol.io/docs/concepts/resources
  - https://modelcontextprotocol.io/docs/concepts/prompts
  - https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
  - https://docs.cursor.com/context/model-context-protocol
  - https://docs.anthropic.com/en/docs/build-with-claude/mcp
recency: 2024-2026
status: draft
word_count_target: 3000-4500
---

# 19b — MCP Server Design for Asset Generation

## Executive Summary

The Model Context Protocol (MCP) is the emerging lingua franca for wiring tools, data,
and reusable prompts into LLM agents. It is a **JSON-RPC 2.0** protocol standardized by
Anthropic in late 2024 and now co-maintained by a cross-vendor working group that
ships dated specification revisions (the current stable spec is **2025-06-18** with a
draft **2025-11-25** that formalizes Streamable HTTP and tightens OAuth). Every major
agent runtime that matters for this project — Claude Desktop, Claude Code, Cursor,
VS Code's AI features, Codex, Gemini CLI via adapters, and Windsurf — speaks MCP
as their primary tool-extension surface.

For the prompt-to-asset project, MCP is the right shape for exposing
asset-generation capabilities because (a) it decouples the asset pipeline from any one
model, (b) it lets us ship a **single server** that Cursor, Claude, and Codex can all
load, and (c) it gives us first-class `prompts/` and `resources/` primitives for
versioned prompt templates (exactly the artifacts the research fleet is producing).

**Top-3 findings**

1. **Streamable HTTP has replaced HTTP+SSE.** The 2025-03-26 / 2025-06-18 spec deprecates
   the old dual-endpoint SSE transport in favor of a single `/mcp` HTTP endpoint that
   POSTs JSON-RPC and optionally upgrades to SSE for streaming. New servers should ship
   **stdio for local** and **Streamable HTTP for remote** — never plain SSE.
2. **Tools, resources, and prompts are three different primitives**, and conflating them
   is the most common design mistake in public asset-gen MCP servers. Tools are
   *model-invoked actions*, resources are *application-controlled context*, prompts
   are *user-invoked templates*. An asset-generation MCP should expose prompt
   enhancement as a **prompt** (selectable slash-command) *and* as a **tool**
   (callable by the model inside a loop), not one or the other.
3. **OAuth 2.1 + PKCE + Protected Resource Metadata (RFC 9728) is now mandatory for
   public remote servers.** For a hosted prompt-to-asset MCP we need
   `/.well-known/oauth-protected-resource`, JWKS-based JWT validation, and a
   `WWW-Authenticate` challenge flow. For private/local use, stdio plus a static
   bearer env var is acceptable and ships in minutes.

**File path:** `docs/research/19-agentic-mcp-skills-architectures/19b-mcp-server-design-for-asset-gen.md`

---

## 1. MCP Protocol Primer

### 1.1 What MCP is (and is not)

MCP is a bidirectional **JSON-RPC 2.0** protocol between an *MCP host* (the agent
runtime, e.g. Cursor) and an *MCP server* (your process, exposing capabilities). Each
host spawns an *MCP client* per server connection. The protocol defines:

- **Lifecycle**: `initialize` → `initialized` notification → normal operation → `shutdown`.
- **Capability negotiation**: during `initialize`, both sides advertise what they
  support (`tools`, `resources`, `prompts`, `logging`, `sampling`, `roots`,
  `completion`, `elicitation` in newer specs).
- **Three server-side primitives**: `tools`, `resources`, `prompts`.
- **Two client-side primitives**: `sampling` (server asks client to run an LLM call on
  its behalf) and `roots` (filesystem / workspace hints the client exposes).
- **Notifications**: `notifications/tools/list_changed`,
  `notifications/resources/updated`, `notifications/progress`,
  `notifications/message` (logging).

MCP is **not** a model API, not a vector-store API, and not a REST replacement. It is
a narrow control-plane protocol for mediating *agent ↔ capability* interactions with
schema, discoverability, and streaming built in.

### 1.2 Versioning

The spec is dated (`YYYY-MM-DD`). Servers and clients negotiate a common version in
`initialize`. Relevant revisions for 2026:

| Version      | Highlights                                                                 |
|--------------|----------------------------------------------------------------------------|
| `2024-11-05` | Original public spec. HTTP+SSE transport (two endpoints).                  |
| `2025-03-26` | Introduces **Streamable HTTP** (single endpoint). Structured tool output.   |
| `2025-06-18` | **Stable** (prior stable). Formalizes OAuth 2.1 + PRM (RFC 9728). Output schemas. |
| `2025-11-25` | **Latest Stable** (as of Nov 2025). Adds async Tasks primitive, OpenID Connect Discovery, tool/resource/prompt icon metadata, incremental scope consent, elicitation URL mode, sampling tool-calling, OAuth Client ID metadata, and formalized extension capability negotiation. |

> **Updated 2026-04-21:** The `2025-11-25` spec is no longer a draft — it shipped as the Latest Stable release on November 25, 2025 (MCP's first anniversary). The `2025-06-18` spec remains "Stable" but is superseded. There is no publicly announced post-`2025-11-25` draft as of April 2026.

Design target for this project: **negotiate `2025-11-25` as the minimum**, accept
`2025-06-18` as the fallback for older clients still pinned to that version.

### 1.3 Tools vs Resources vs Prompts

This distinction is the core mental model an asset-gen MCP must get right.

- **Tools** (`tools/list`, `tools/call`) — *model-controlled*. The LLM decides when to
  call them, based on `name`, `description`, and `inputSchema`. Side-effects allowed.
  Tools are where `generate_logo`, `vectorize`, `remove_background` live.
- **Resources** (`resources/list`, `resources/read`, `resources/templates/list`) —
  *application-controlled*. The host decides when to read them. They are read-only
  context blobs addressed by URI (e.g. `prompt-to-asset://style/flat-modern` or
  `file://./assets/brief.md`). Resources are perfect for **brand kits, prior
  generations, reference style images, and prompt libraries**.
- **Prompts** (`prompts/list`, `prompts/get`) — *user-controlled*. They surface as
  slash-commands / pickers in Claude Desktop and Cursor. Each prompt has a `name`,
  optional `arguments`, and returns one or more `messages`. Prompts are where
  `enhance_prompt_for_logo` lives as a first-class UI affordance.

The practical rule:

> If a human should pick it from a menu, it's a **prompt**.
> If the model should pick it mid-loop, it's a **tool**.
> If it's *data the tool or model needs to read*, it's a **resource**.

### 1.4 SDKs

Three first-party SDKs matter for this project:

- **TypeScript** — `@modelcontextprotocol/sdk` (npm). High-level `McpServer` class,
  Zod-based schemas (Standard Schema in v2), ships transports for stdio and Streamable
  HTTP. This is the canonical choice for a Node-based asset-gen server because all
  the image model SDKs (`openai`, `@google/genai`, `replicate`) are Node-native.
  Source: <https://github.com/modelcontextprotocol/typescript-sdk>.
- **Python** — `mcp` on PyPI, commonly used via the `FastMCP` high-level helper.
  Best when the pipeline wraps Python-native tools (`rembg`, `BRIA RMBG`, `U²-Net`,
  `potrace` via `pypotrace`, `vtracer` bindings, PIL/Pillow). Source:
  <https://github.com/modelcontextprotocol/python-sdk>.
- **Rust** — `rmcp` crate at <https://github.com/modelcontextprotocol/rust-sdk>.
  Useful for a high-throughput hosted endpoint or when embedding into Tauri.

A **Go** SDK (`github.com/modelcontextprotocol/go-sdk`) is also first-party and useful
for static single-binary deployments.

**Recommendation for prompt-to-asset:** a TypeScript server as the primary artifact,
with a thin Python sidecar invoked over stdio/subprocess for Python-only ops
(`rembg`, `vtracer`). One MCP surface, two runtime layers.

---

## 2. Transport Choice

### 2.1 Stdio

The default for local tools. The host launches the server as a subprocess, JSON-RPC
messages are newline-delimited UTF-8 on stdin/stdout, and the server is free to log
UTF-8 to stderr. Zero network surface, no auth needed, trivially testable.

```jsonc
// Example Cursor ~/.cursor/mcp.json entry
{
  "mcpServers": {
    "prompt-to-asset": {
      "command": "npx",
      "args": ["-y", "@prompt-to-asset/mcp@latest"],
      "env": {
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}",
        "GEMINI_API_KEY": "${env:GEMINI_API_KEY}"
      }
    }
  }
}
```

Stdio is how Claude Desktop, Claude Code, and Cursor prefer to load third-party
servers today. **Ship stdio first.** Every test, CI fixture, and the "local dev"
story depends on it.

### 2.2 Streamable HTTP

For hosted / remote / shared-team deployments, the spec mandates Streamable HTTP
(≥ 2025-03-26). One endpoint, typically `POST /mcp`:

- Client POSTs a JSON-RPC request. The server replies either with a single
  `application/json` body (for simple request/response) **or** upgrades the response
  to `text/event-stream` SSE to emit multiple messages (progress, logging,
  intermediate tool results) before the final result.
- Clients may also open a long-lived `GET /mcp` SSE stream for server-initiated
  messages (e.g. `notifications/tools/list_changed`, resource updates).
- Sessions are identified by a `Mcp-Session-Id` header issued on first `initialize`.
  Stateless servers can ignore sessions; stateful ones key per-session state by it.

Security floor for Streamable HTTP:

- Validate the `Origin` header (DNS-rebind defense).
- Bind to `127.0.0.1` when running locally.
- Require TLS for any non-localhost deployment.
- Authenticate (see §4).

### 2.3 Deprecated: HTTP+SSE

The old two-endpoint SSE transport (`GET /sse` + `POST /messages`) is deprecated as
of 2025-03-26 and removed from the default path in the TS SDK's v2 preview. Do not
ship new servers on it; keep a compatibility shim only if a pinned Claude Desktop
build still requires it.

### 2.4 Decision matrix for prompt-to-asset

| Deployment                | Transport              | Auth                      |
|---------------------------|------------------------|---------------------------|
| Local dev, Cursor/Claude  | **stdio**              | none (env vars for keys)  |
| Teammate self-hosted      | Streamable HTTP local  | static bearer header       |
| Hosted multi-tenant SaaS  | Streamable HTTP + TLS  | **OAuth 2.1 + PKCE**       |
| Embedded in a VS Code ext | stdio (spawned by ext) | none                      |

---

## 3. Proposed Tool, Prompt, and Resource Schema for Prompt-Enhancer

This section is the authoritative schema draft for the MCP server this research
project will eventually produce. All JSON is shown as it would appear in a
`tools/list` / `prompts/list` / `resources/list` response — i.e. the **wire format**
the client sees.

### 3.1 Tool inventory

Seven tools cover the full asset pipeline:

| Tool                 | Purpose                                                                |
|----------------------|------------------------------------------------------------------------|
| `enhance_prompt`     | Transform a naive brief into a model-specific structured prompt.       |
| `generate_logo`      | Generate a logo at multiple styles/variants with transparency.         |
| `generate_icon_set`  | Produce platform-aware app-icon packs (iOS/Android/web/favicon).       |
| `remove_background`  | Matte an existing image to RGBA using rembg / BRIA RMBG.               |
| `vectorize`          | Raster → SVG via vtracer / potrace with preset profiles.               |
| `validate_asset`     | Lint a produced asset against platform specs (HIG/Material/PWA).       |
| `upscale_refine`     | Real-ESRGAN / SUPIR pass for detail recovery at export sizes.          |

### 3.2 Full JSON Schema — `tools/list` response

```json
{
  "tools": [
    {
      "name": "enhance_prompt",
      "title": "Enhance Asset Prompt",
      "description": "Transform a natural-language asset brief into a production-ready, model-specific prompt. Handles transparency hints, negative prompts, and style token injection. Returns an enhanced prompt plus a structured spec.",
      "inputSchema": {
        "type": "object",
        "required": ["brief", "asset_type"],
        "properties": {
          "brief": {
            "type": "string",
            "description": "Natural-language request, e.g. 'a transparent logo for my note-taking app'.",
            "minLength": 3,
            "maxLength": 2000
          },
          "asset_type": {
            "type": "string",
            "enum": [
              "logo", "app_icon", "favicon", "og_image",
              "illustration", "hero", "splash", "sticker"
            ]
          },
          "target_model": {
            "type": "string",
            "enum": [
              "gemini-2.5-flash-image", "imagen-4", "gpt-image-1",
              "dall-e-3", "flux-1-dev", "flux-1-pro",
              "sdxl", "recraft-v3", "ideogram-v2", "midjourney-v7"
            ],
            "description": "Model the enhanced prompt will be fed to. Prompt style is tuned per model."
          },
          "brand": {
            "type": "object",
            "properties": {
              "name":       { "type": "string" },
              "palette":    { "type": "array", "items": { "type": "string", "pattern": "^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$" } },
              "keywords":   { "type": "array", "items": { "type": "string" }, "maxItems": 12 },
              "reference_uri": { "type": "string", "format": "uri",
                 "description": "MCP resource URI pointing to a brand kit (e.g. prompt-to-asset://brand/acme)." }
            }
          },
          "constraints": {
            "type": "object",
            "properties": {
              "transparent_bg":  { "type": "boolean", "default": false },
              "no_text":         { "type": "boolean", "default": false },
              "flat":            { "type": "boolean", "default": false },
              "square":          { "type": "boolean", "default": false },
              "negative_prompt": { "type": "string",  "default": "" }
            }
          }
        },
        "additionalProperties": false
      },
      "outputSchema": {
        "type": "object",
        "required": ["enhanced_prompt", "spec"],
        "properties": {
          "enhanced_prompt": { "type": "string" },
          "negative_prompt": { "type": "string" },
          "spec": {
            "type": "object",
            "properties": {
              "style_tokens":   { "type": "array", "items": { "type": "string" } },
              "composition":    { "type": "string" },
              "transparency":   { "type": "string", "enum": ["rgba", "matte_then_cut", "not_applicable"] },
              "aspect_ratio":   { "type": "string" },
              "resolution":     { "type": "string" },
              "seed_suggestion":{ "type": "integer" }
            }
          },
          "warnings": { "type": "array", "items": { "type": "string" } }
        }
      },
      "annotations": {
        "readOnlyHint": true,
        "idempotentHint": true,
        "openWorldHint": false
      }
    },

    {
      "name": "generate_logo",
      "title": "Generate Logo",
      "description": "Generate one or more logo variants from a brief or an enhanced prompt. Supports transparent RGBA output and returns image resources rather than inline base64 for all variants beyond the first.",
      "inputSchema": {
        "type": "object",
        "required": ["prompt"],
        "properties": {
          "prompt":           { "type": "string", "minLength": 3 },
          "negative_prompt":  { "type": "string" },
          "model":            { "type": "string", "enum": [
            "gemini-2.5-flash-image", "imagen-4", "gpt-image-1",
            "flux-1-pro", "recraft-v3", "sdxl"
          ], "default": "gpt-image-1" },
          "variants":         { "type": "integer", "minimum": 1, "maximum": 8, "default": 4 },
          "size":             { "type": "string", "enum": ["1024x1024", "2048x2048", "4096x4096"], "default": "2048x2048" },
          "transparent_bg":   { "type": "boolean", "default": true },
          "style":            { "type": "string", "enum": [
            "flat", "gradient", "mascot", "wordmark", "monogram",
            "isometric", "line", "emblem", "abstract"
          ] },
          "seed":             { "type": "integer" }
        },
        "additionalProperties": false
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "variants": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "uri":        { "type": "string", "format": "uri" },
                "mime":       { "type": "string" },
                "width":      { "type": "integer" },
                "height":     { "type": "integer" },
                "has_alpha":  { "type": "boolean" },
                "seed":       { "type": "integer" },
                "provider":   { "type": "string" }
              }
            }
          }
        }
      },
      "annotations": {
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      }
    },

    {
      "name": "generate_icon_set",
      "title": "Generate Platform Icon Set",
      "description": "Given a source mark (image resource URI or prompt), emit a platform-correct icon pack: iOS (all required sizes and 1024 marketing), Android (adaptive foreground/background, legacy), web favicons, PWA maskable icons.",
      "inputSchema": {
        "type": "object",
        "required": ["source", "platforms"],
        "properties": {
          "source": {
            "oneOf": [
              { "type": "object", "required": ["resource_uri"], "properties": { "resource_uri": { "type": "string", "format": "uri" } } },
              { "type": "object", "required": ["prompt"],       "properties": { "prompt":       { "type": "string" } } }
            ]
          },
          "platforms": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "enum": ["ios", "android", "web", "pwa", "macos", "watchos"] }
          },
          "background": {
            "type": "object",
            "properties": {
              "mode":  { "type": "string", "enum": ["transparent", "solid", "gradient"], "default": "solid" },
              "color": { "type": "string", "pattern": "^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$" }
            }
          },
          "safe_zone_percent": { "type": "number", "minimum": 0, "maximum": 30, "default": 10 }
        }
      }
    },

    {
      "name": "remove_background",
      "title": "Remove Background",
      "description": "Produce a clean RGBA version of an input image using a matting model (rembg / BRIA RMBG 2.0 / BiRefNet). Accepts MCP resource URIs or base64.",
      "inputSchema": {
        "type": "object",
        "required": ["image"],
        "properties": {
          "image":  { "type": "string", "description": "Image as MCP resource URI or data: URL." },
          "model":  { "type": "string", "enum": ["rembg-u2net", "bria-rmbg-2.0", "birefnet", "sam-2"], "default": "bria-rmbg-2.0" },
          "feather_px": { "type": "integer", "minimum": 0, "maximum": 8, "default": 1 },
          "preserve_shadow": { "type": "boolean", "default": false }
        }
      }
    },

    {
      "name": "vectorize",
      "title": "Vectorize Raster to SVG",
      "description": "Convert a raster image into an optimized SVG via vtracer or potrace. Presets are tuned for logos, icons, and illustrations.",
      "inputSchema": {
        "type": "object",
        "required": ["image"],
        "properties": {
          "image":   { "type": "string" },
          "engine":  { "type": "string", "enum": ["vtracer", "potrace", "autotrace"], "default": "vtracer" },
          "preset":  { "type": "string", "enum": ["logo-flat", "logo-detailed", "icon", "illustration", "mono"], "default": "logo-flat" },
          "max_colors": { "type": "integer", "minimum": 1, "maximum": 32, "default": 8 },
          "simplify_tolerance": { "type": "number", "minimum": 0.0, "maximum": 5.0, "default": 0.5 }
        }
      }
    },

    {
      "name": "validate_asset",
      "title": "Validate Asset Against Platform Spec",
      "description": "Lints an asset against platform rules: Apple HIG icon geometry, Material adaptive icon safe zones, favicon manifests, OG/Twitter card dimensions, PWA maskable padding.",
      "inputSchema": {
        "type": "object",
        "required": ["image", "spec"],
        "properties": {
          "image": { "type": "string" },
          "spec":  { "type": "string", "enum": [
            "apple-hig-app-icon", "material-adaptive-icon",
            "favicon-ico", "favicon-manifest",
            "og-image-1200x630", "twitter-card-summary-large",
            "pwa-maskable"
          ] }
        }
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "ok":       { "type": "boolean" },
          "issues":   { "type": "array", "items": { "type": "object", "properties": {
            "severity": { "type": "string", "enum": ["error", "warning", "info"] },
            "code":     { "type": "string" },
            "message":  { "type": "string" }
          } } }
        }
      },
      "annotations": { "readOnlyHint": true, "idempotentHint": true }
    },

    {
      "name": "upscale_refine",
      "title": "Upscale and Refine",
      "description": "Upscale and detail-refine a raster using Real-ESRGAN or SUPIR. Preserves alpha when present.",
      "inputSchema": {
        "type": "object",
        "required": ["image"],
        "properties": {
          "image":  { "type": "string" },
          "engine": { "type": "string", "enum": ["real-esrgan-x4", "swinir", "supir"], "default": "real-esrgan-x4" },
          "scale":  { "type": "integer", "enum": [2, 3, 4], "default": 4 },
          "denoise_strength": { "type": "number", "minimum": 0.0, "maximum": 1.0, "default": 0.3 }
        }
      }
    }
  ]
}
```

### 3.3 Prompts — slash-command surface

Prompts appear as `/prompt-to-asset.<name>` pickers in Cursor and Claude Desktop.
They're the shortest path from a human typing a brief to a structured,
enhanced prompt being injected as the first user message.

```json
{
  "prompts": [
    {
      "name": "logo_brief",
      "title": "New Logo Brief",
      "description": "Kickstart a logo generation session with a structured brief.",
      "arguments": [
        { "name": "product",  "description": "Product or company name", "required": true },
        { "name": "industry", "description": "Industry / domain",       "required": false },
        { "name": "vibe",     "description": "e.g. 'playful flat', 'serious monochrome'", "required": false },
        { "name": "transparent", "description": "Require transparent background (true/false)", "required": false }
      ]
    },
    {
      "name": "icon_set_brief",
      "title": "New App Icon Set",
      "description": "Brief the agent to produce an iOS+Android+web icon pack from one mark.",
      "arguments": [
        { "name": "app_name",  "required": true },
        { "name": "platforms", "description": "Comma list: ios,android,web,pwa", "required": true }
      ]
    },
    {
      "name": "fix_transparency",
      "title": "Fix Checkered Background",
      "description": "Workflow prompt for the 'Gemini draws a checker pattern instead of real transparency' failure mode.",
      "arguments": [
        { "name": "image_uri", "required": true }
      ]
    }
  ]
}
```

A `prompts/get` for `logo_brief` returns a `messages` array the host inlines into
the chat; this is where we encode the *elicitation* prompt that drives the
agent through `enhance_prompt` → `generate_logo` → `validate_asset` → (optional)
`vectorize`.

### 3.4 Resources — reusable context

```json
{
  "resources": [
    { "uri": "prompt-to-asset://style/flat-modern",  "name": "Flat Modern Style",     "mimeType": "text/markdown" },
    { "uri": "prompt-to-asset://style/brand-mono",   "name": "Brand Monochrome",      "mimeType": "text/markdown" },
    { "uri": "prompt-to-asset://spec/apple-hig",     "name": "Apple HIG App Icon",    "mimeType": "application/json" },
    { "uri": "prompt-to-asset://spec/material",      "name": "Material Adaptive",     "mimeType": "application/json" },
    { "uri": "prompt-to-asset://failures/checker",   "name": "Transparency Failures", "mimeType": "text/markdown" }
  ],
  "resourceTemplates": [
    { "uriTemplate": "prompt-to-asset://brand/{slug}", "name": "Brand Kit",    "description": "Palette, fonts, keywords for a brand." },
    { "uriTemplate": "prompt-to-asset://history/{id}", "name": "Prior Gen",    "description": "A previously generated asset for reuse." }
  ]
}
```

### 3.5 Wire example — a `tools/call` for `enhance_prompt`

```json
// request
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "tools/call",
  "params": {
    "name": "enhance_prompt",
    "arguments": {
      "brief": "a transparent logo for my note-taking app",
      "asset_type": "logo",
      "target_model": "gpt-image-1",
      "constraints": { "transparent_bg": true, "no_text": true, "flat": true }
    }
  }
}

// response
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "content": [
      { "type": "text", "text": "Enhanced prompt ready. See structuredContent for spec." }
    ],
    "structuredContent": {
      "enhanced_prompt": "Flat vector-style logo mark for a minimalist note-taking app. Central motif: stylized folded-corner page fused with a rising quill stroke. Clean geometry, single accent color on neutral base, generous negative space, centered composition, PNG with TRUE ALPHA CHANNEL (RGBA) — render the background as fully transparent pixels; do NOT draw a checkerboard, grid, or any pattern to represent transparency. 2048x2048, crisp edges, no text, no watermark.",
      "negative_prompt": "checkered background, transparency grid, letters, words, signature, watermark, 3d, bevel, shadow, photorealism, gradient mesh artifacts",
      "spec": {
        "style_tokens": ["flat", "vector", "minimal", "single-accent"],
        "composition": "centered mark, ~10% safe margin",
        "transparency": "rgba",
        "aspect_ratio": "1:1",
        "resolution": "2048x2048",
        "seed_suggestion": 173245
      },
      "warnings": [
        "gpt-image-1 requires explicit 'transparent background' phrasing; avoid the word 'checker' in any form.",
        "If model outputs a fake checker, pipe through remove_background with preserve_shadow=false."
      ]
    },
    "isError": false
  }
}
```

Two design notes embedded above:

- `structuredContent` is the 2025-06-18 addition that lets a tool return typed JSON
  *in addition to* the human-visible `content` array. Use it everywhere — it's what
  keeps the agent from re-parsing English.
- `annotations` like `readOnlyHint`, `idempotentHint`, `destructiveHint`,
  `openWorldHint` inform client UX (auto-approve, confirm dialogs). We mark
  `enhance_prompt` and `validate_asset` read-only/idempotent so Cursor auto-runs them.

---

## 4. Authentication

### 4.1 Local / stdio

No MCP-level auth. Secrets (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`)
live in env and are read on `initialize`. Never log them; redact in `notifications/message`.

### 4.2 Static bearer (fast remote path)

For a teammate self-hosting the server on a private box:

```
Authorization: Bearer <shared-secret>
```

Reject any request missing or mismatching on the `POST /mcp` handler. This is five
minutes of code and is fine for non-production.

### 4.3 OAuth 2.1 + PKCE (mandatory for public remote)

The 2025-06-18 spec requires MCP servers acting as **Resource Servers** to:

1. Expose `/.well-known/oauth-protected-resource` (RFC 9728) pointing at one or more
   trusted Authorization Servers (AS).
2. Validate incoming access tokens on every RPC:
   - **Preferred:** JWT verification against the AS's JWKS (`/.well-known/jwks.json`),
     cached ~5 min; check `iss`, `aud` (must equal *this* server's canonical URL),
     `exp`, `nbf`, and scopes.
   - **Alternative:** RFC 7662 introspection against the AS.
3. On 401, respond with
   `WWW-Authenticate: Bearer realm="mcp", resource_metadata="https://<server>/.well-known/oauth-protected-resource"`
   so compliant clients can trigger the auth dance automatically.
4. Support **Dynamic Client Registration** (RFC 7591) so the agent runtime can
   register itself without a human pre-provisioning a client_id.
5. Require **PKCE** (S256) on the authorization code flow. Public clients (Cursor,
   Claude Desktop) are unable to hold a client secret.

Scope design for prompt-to-asset:

| Scope                 | Grants                                                  |
|-----------------------|---------------------------------------------------------|
| `prompt.read`         | `enhance_prompt`, `resources/*`, `prompts/*`            |
| `asset.generate`      | `generate_logo`, `generate_icon_set`, `upscale_refine`  |
| `asset.process`       | `remove_background`, `vectorize`, `validate_asset`      |
| `admin`               | mutate brand-kit resources                              |

Claude Desktop and Cursor both understand the `resource_metadata` challenge and open
the AS login page when they see it — this is the whole reason to do OAuth instead of
static bearer for any public deployment.

### 4.4 Cloudflare Access / proxy auth

A pragmatic middle ground for an internal tool: put the MCP server behind Cloudflare
Access, let CF handle SSO, and treat the `Cf-Access-Jwt-Assertion` header as the
auth claim. Zero code changes to the server.

---

## 5. Operational Concerns

### 5.1 Streaming progress

Long-running tools (`generate_logo` with `variants: 8` and Flux Pro) must emit
`notifications/progress` during work. The TS SDK exposes a `context.progress(...)`
hook inside tool handlers; Python's `FastMCP` passes a `Context` with `report_progress`.
Progress notifications appear as shimmering spinners in Cursor/Claude.

### 5.2 Large assets: resources over inline

Returning 4096-px PNGs inline as base64 in `content` bloats transcripts and costs
tokens on every subsequent turn. Instead:

- Write the image to a URI-addressable store (local temp dir served by the server,
  or S3 / R2 for hosted).
- Return a resource descriptor in `content`:
  `{ "type": "resource", "resource": { "uri": "prompt-to-asset://gen/abc123.png", "mimeType": "image/png" } }`.
- Implement `resources/read` to stream it on demand, with `Range` support.

This pattern is how `@modelcontextprotocol/server-imagen` and
`image-gen-mcp` keep transcripts lean.

### 5.3 Structured tool output

Always set `outputSchema`. When a tool has a schema, the SDK validates
`structuredContent` on return and the client can render typed UI (tables for
`validate_asset` issues, galleries for `generate_logo` variants).

### 5.4 Error shape

On failure, return `isError: true` with a descriptive `content[0].text`. Use
JSON-RPC error codes **only** for protocol errors (parse, method-not-found,
invalid-params). Tool-level failures are **results**, not RPC errors — this is a
common newcomer bug.

### 5.5 Testing

Two indispensable tools:

- **MCP Inspector** (`npx @modelcontextprotocol/inspector`) — a web UI that speaks
  MCP and lets you browse tools, call them with forms, and see raw JSON-RPC.
- **SDK integration tests** — spawn the server over an in-memory transport and
  assert tool behavior. Every asset tool should have a golden-image snapshot test.

---

## 6. Host Integration Notes

### 6.1 Cursor

- Config: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project).
- Supports both stdio and Streamable HTTP (`type: "http"`, `url: "..."`).
- Surfaces tools in the agent loop and prompts as `/` slash-commands.
- Honors `readOnlyHint` / `destructiveHint` for auto-approval UX.
- Docs: <https://docs.cursor.com/context/model-context-protocol>.

### 6.2 Claude Desktop / Claude Code

- Config: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).
- Stdio-first. Remote servers supported via *Connectors* (OAuth flow in-app).
- Docs: <https://docs.anthropic.com/en/docs/build-with-claude/mcp>.

### 6.3 VS Code (GitHub Copilot / Continue)

- Both expose MCP server config; stdio and HTTP supported.
- Prompts surface as `/commands`.

### 6.4 Codex CLI / Gemini CLI

> **Updated 2026-04-21:** The claim below that Gemini CLI lacks native MCP support was accurate as of late 2024 but is no longer correct.

- Codex CLI supports MCP over stdio as of its late-2025 releases.
- **Gemini CLI has native MCP support** via its extensions system — declare `mcpServers` in `gemini-extension.json` and the CLI spawns the server over stdio. No adapter is needed. Gemini CLI is in fact one of the primary MCP clients with 24+ official Google MCP servers and a FastMCP `fastmcp install gemini-cli` integration (FastMCP v2.12.3+). The raw Gemini function-calling REST path (OpenAPI 3.0 `FunctionDeclaration[]`) is a separate integration for non-agent apps and does not compose with the CLI layer.

---

## 7. Reference MCP Servers for Image / Asset Generation

- **image-gen-mcp** — multi-provider (OpenAI, Gemini, Vertex Imagen, Azure,
  OpenRouter). Good reference for cross-provider tool normalization.
  <https://github.com/simonChoi034/image-gen-mcp>
- **imagen-mcp** (michaeljabbour) — auto-selects between GPT-Image-1 and Gemini,
  supports conversational refinement.
  <https://github.com/michaeljabbour/imagen-mcp>
- **mcp-openai-image-generator** (Ishan96Dev) — three-tool split
  (`generate_image` / `edit_image` / `create_variation`) we mirror here.
  <https://github.com/Ishan96Dev/mcp-openai-image-generator>
- **mcp-server-gpt-image** — stdio + Streamable HTTP dual transport, streaming
  and caching. Useful transport reference.
  <https://www.npmjs.com/package/mcp-server-gpt-image>
- **openai-image-mcp** (lpenguin) — minimal Node server, good for reading in one
  sitting. <https://playbooks.com/mcp/lpenguin/openai-image-mcp>
- **@modelcontextprotocol/server-everything** — the official kitchen-sink server,
  excellent for seeing resources/prompts/tools/sampling all in one codebase.

None of these existing servers combine prompt enhancement, platform-correct icon
set generation, HIG/Material validation, and vectorization — which is precisely
the product-shaped gap this project fills.

---

## 8. Recommendations for the Prompt-Enhancer MCP

1. **SDK**: TypeScript (`@modelcontextprotocol/sdk`) as primary, Python sidecar for
   `rembg`/`vtracer` via subprocess.
2. **Transports**: stdio for local, Streamable HTTP for hosted; never ship new SSE.
3. **Primitives**: seven tools (§3.1), three prompts (§3.3), curated resources with
   URI templates for brand kits and prior generations.
4. **Output**: always set `outputSchema`; return large assets as
   resource references, not base64 blobs.
5. **Auth**: env-based for stdio; OAuth 2.1 + PKCE + Protected Resource Metadata
   the moment the server is reachable off localhost.
6. **Hint annotations**: `enhance_prompt`, `validate_asset` are
   `readOnlyHint+idempotentHint`. `generate_*` and `upscale_refine` are
   `openWorldHint` (network-touching). None are `destructiveHint`.
7. **Versioning**: target spec `2025-11-25` (Latest Stable), accept `2025-06-18` as fallback for older pinned clients; advertise a server `serverInfo.version` that follows semver and bump major on breaking tool-schema changes.
8. **Observability**: emit `notifications/progress` for every generation tool,
   emit `notifications/message` at `info` for each provider call (model, latency,
   cost estimate) so Cursor/Claude show an honest activity stream.

---

## References

### Specification

- MCP spec index (latest) — <https://modelcontextprotocol.io/specification/latest>
- MCP spec 2025-06-18 — <https://modelcontextprotocol.io/specification/2025-06-18>
- MCP spec 2025-11-25 (Latest Stable, released Nov 25 2025) — <https://modelcontextprotocol.io/specification/2025-11-25>
- Transports section — <https://modelcontextprotocol.io/specification/2025-11-25/basic/transports>
- Authorization — <https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization>
- Streamable HTTP RFC PR — <https://github.com/modelcontextprotocol/modelcontextprotocol/pull/206>
- MCP transport future blog post — <https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/>

### Concepts

- Tools — <https://modelcontextprotocol.io/docs/concepts/tools>
- Resources — <https://modelcontextprotocol.io/docs/concepts/resources>
- Prompts — <https://modelcontextprotocol.io/docs/concepts/prompts>
- Sampling — <https://modelcontextprotocol.io/docs/concepts/sampling>

### SDKs

- TypeScript SDK — <https://github.com/modelcontextprotocol/typescript-sdk>
- TypeScript v2 docs — <https://modelcontextprotocol.github.io/typescript-sdk/v2/>
- TypeScript server guide — <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md>
- Python SDK — <https://github.com/modelcontextprotocol/python-sdk>
- Rust SDK (`rmcp`) — <https://github.com/modelcontextprotocol/rust-sdk>
- Go SDK — <https://github.com/modelcontextprotocol/go-sdk>

### Host integrations

- Cursor MCP docs — <https://docs.cursor.com/context/model-context-protocol>
- Claude MCP docs — <https://docs.anthropic.com/en/docs/build-with-claude/mcp>
- VS Code MCP — <https://code.visualstudio.com/docs/copilot/chat/mcp-servers>
- MCP Inspector — <https://github.com/modelcontextprotocol/inspector>

### Auth

- MCP OAuth 2.1 implementation guide — <https://mcpplaygroundonline.com/blog/mcp-server-oauth-authentication-guide>
- RFC 9728 Protected Resource Metadata — <https://datatracker.ietf.org/doc/html/rfc9728>
- RFC 7591 Dynamic Client Registration — <https://datatracker.ietf.org/doc/html/rfc7591>
- RFC 7662 Token Introspection — <https://datatracker.ietf.org/doc/html/rfc7662>
- mcp-oauth-server reference impl — <https://github.com/wille/mcp-oauth-server>
- mcp-auth.dev — <https://mcp-auth.dev/docs>

### Reference image-generation MCP servers

- image-gen-mcp — <https://github.com/simonChoi034/image-gen-mcp>
- imagen-mcp — <https://github.com/michaeljabbour/imagen-mcp>
- mcp-openai-image-generator — <https://github.com/Ishan96Dev/mcp-openai-image-generator>
- openai-image-mcp — <https://playbooks.com/mcp/lpenguin/openai-image-mcp>
- mcp-server-gpt-image — <https://www.npmjs.com/package/mcp-server-gpt-image>
- @modelcontextprotocol/server-everything — <https://github.com/modelcontextprotocol/servers/tree/main/src/everything>

### Background / adjacent reading

- JSON-RPC 2.0 — <https://www.jsonrpc.org/specification>
- Standard Schema (TS SDK v2 validation layer) — <https://standardschema.dev/>
- Zod v4 — <https://zod.dev>
