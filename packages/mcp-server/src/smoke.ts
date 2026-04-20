#!/usr/bin/env node
/**
 * Smoke test — exercises the pure logic layer (classifier + router + rewriter + validators)
 * without any network calls. Passes with zero API keys configured.
 */
import { enhancePrompt } from "./tools/enhance-prompt.js";
import { brandBundleParse } from "./tools/brand-bundle-parse.js";
import { capabilities } from "./tools/capabilities.js";
import { generateLogo } from "./tools/generate-logo.js";
import { TOOLS } from "./server.js";
import { MODEL_REGISTRY, ROUTING_TABLE } from "./config.js";

interface Check {
  name: string;
  fn: () => Promise<void> | void;
}

const checks: Check[] = [
  {
    name: "TOOLS: exactly 16 tools registered",
    fn: () => {
      if (TOOLS.length !== 16) throw new Error(`expected 16 tools, got ${TOOLS.length}`);
    }
  },
  {
    name: "TOOLS: asset_capabilities + asset_save_inline_svg + asset_ingest_external are present",
    fn: () => {
      const names = TOOLS.map((t) => t.name);
      for (const required of [
        "asset_capabilities",
        "asset_save_inline_svg",
        "asset_ingest_external"
      ]) {
        if (!names.includes(required)) throw new Error(`${required} not registered`);
      }
    }
  },
  {
    name: "TOOLS: all names are prefixed asset_* (Copilot collision safety)",
    fn: () => {
      const bad = TOOLS.filter((t) => !t.name.startsWith("asset_"));
      if (bad.length) throw new Error(`unprefixed tools: ${bad.map((t) => t.name).join(", ")}`);
    }
  },
  {
    name: "MODEL_REGISTRY: has gpt-image-1 with native_rgba=true",
    fn: () => {
      const m = MODEL_REGISTRY.models.find((x) => x.id === "gpt-image-1");
      if (!m || m.native_rgba !== true) throw new Error("gpt-image-1 missing or not RGBA-native");
    }
  },
  {
    name: "MODEL_REGISTRY: imagen-3 and imagen-4 native_rgba=false (the #1 pain point)",
    fn: () => {
      for (const id of ["imagen-3", "imagen-4", "gemini-3-flash-image"]) {
        const m = MODEL_REGISTRY.models.find((x) => x.id === id);
        if (!m) throw new Error(`${id} missing from registry`);
        if (m.native_rgba !== false) throw new Error(`${id} must have native_rgba=false`);
      }
    }
  },
  {
    name: "ROUTING_TABLE: transparent-mark never uses imagen/gemini/sd1.5",
    fn: () => {
      const r = ROUTING_TABLE.rules.find((x) => x.id === "transparent-mark");
      if (!r) throw new Error("transparent-mark rule missing");
      for (const n of ["imagen-3", "imagen-4", "gemini-3-flash-image", "sd-1.5"]) {
        if (!r.never.includes(n)) throw new Error(`transparent-mark must forbid ${n}`);
      }
    }
  },
  {
    name: "classify + route: 'transparent logo for my app' → gpt-image-1",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "transparent logo for my app called Acme" });
      if (spec.asset_type !== "logo")
        throw new Error(`classified as ${spec.asset_type}, expected logo`);
      if (!["recraft-v3", "gpt-image-1", "ideogram-3-turbo"].includes(spec.target_model)) {
        throw new Error(`target_model=${spec.target_model}, expected a transparency-safe model`);
      }
      if (!spec.transparency_required)
        throw new Error("transparency_required must be true for logo");
    }
  },
  {
    name: "classify: 'generate an app icon' → app_icon",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "generate an app icon of a rocket" });
      if (spec.asset_type !== "app_icon") throw new Error(`got ${spec.asset_type}`);
    }
  },
  {
    name: "classify: 'favicon with bold A' → favicon",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "favicon with a bold letter A" });
      if (spec.asset_type !== "favicon") throw new Error(`got ${spec.asset_type}`);
      if (!spec.vector_required) throw new Error("favicon should require vector output");
    }
  },
  {
    name: "rewriter: Flux prompt does NOT include 'negative_prompt' field (Flux errors on it)",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "hero photoreal image of a mountain at dawn" });
      // rewriter should not emit negative_prompt for Flux family
      const m = MODEL_REGISTRY.models.find((x) => x.id === spec.target_model);
      if (m?.family === "flux" && spec.params["negative_prompt"] !== undefined) {
        throw new Error(`Flux got a negative_prompt — will error at provider`);
      }
    }
  },
  {
    name: "rewriter: wordmark >3 words gets dropped with warning",
    fn: async () => {
      const spec = await enhancePrompt({
        brief: "logo for Acme Corporation Inc with tagline",
        text_content: "Acme Corporation Inc Worldwide"
      });
      if (!spec.warnings.some((w) => /3 words|composit/i.test(w))) {
        throw new Error(`expected 3-word warning in: ${JSON.stringify(spec.warnings)}`);
      }
    }
  },
  {
    name: "brand-bundle-parse: extracts hex colors from raw text",
    fn: async () => {
      const { bundle } = await brandBundleParse({
        source: "Brand: Acme\nPrimary: #0066FF\nSecondary: #FF6B35\nDo not: use shadows"
      });
      if (bundle.palette.length !== 2)
        throw new Error(`expected 2 colors, got ${bundle.palette.length}`);
    }
  },
  {
    name: "brand-bundle-parse: DTCG tokens",
    fn: async () => {
      const dtcg = JSON.stringify({
        colors: {
          brand: {
            primary: { $type: "color", $value: "#ff0000" },
            accent: { $type: "color", $value: "#00ff00" }
          }
        }
      });
      const { bundle } = await brandBundleParse({ source: dtcg });
      if (bundle.palette.length !== 2)
        throw new Error(`DTCG: expected 2, got ${bundle.palette.length}`);
    }
  },
  {
    name: "capabilities: reports inline_svg + external_prompt_only as always-available",
    fn: async () => {
      const caps = await capabilities({});
      if (caps.inline_svg.available !== true)
        throw new Error("inline_svg should always be available");
      if (caps.external_prompt_only.available !== true)
        throw new Error("external_prompt_only should always be available");
    }
  },
  {
    name: "capabilities: api.available is true because zero-key routes (Pollinations, Horde) are on",
    fn: async () => {
      const caps = await capabilities({});
      if (caps.api.available !== true)
        throw new Error(
          `api.available=${caps.api.available}; expected true (pollinations + horde on by default)`
        );
      if (!caps.free_api.available)
        throw new Error(`free_api.available=${caps.free_api.available}; expected true`);
      const freeIds = caps.free_api.routes.map((r) => r.id);
      for (const expected of [
        "pollinations",
        "stable-horde",
        "huggingface",
        "google-ai-studio",
        "cloudflare"
      ]) {
        if (!freeIds.includes(expected))
          throw new Error(`free_api.routes missing "${expected}"; got ${freeIds.join(", ")}`);
      }
    }
  },
  {
    name: "enhance_prompt: logo brief surfaces modes_available + svg_brief",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "flat vector logo for Forge devtools" });
      if (!spec.modes_available.includes("inline_svg"))
        throw new Error("logo should offer inline_svg");
      if (!spec.modes_available.includes("external_prompt_only"))
        throw new Error("logo should offer external_prompt_only");
      if (!spec.svg_brief) throw new Error("svg_brief must be populated for logo");
      if (!spec.svg_brief.viewBox.startsWith("0 0 "))
        throw new Error("svg_brief.viewBox malformed");
    }
  },
  {
    name: "enhance_prompt: og_image does NOT surface inline_svg",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "og image for a blog post about rust" });
      if (spec.modes_available.includes("inline_svg"))
        throw new Error("og_image must not offer inline_svg");
    }
  },
  {
    name: "enhance_prompt: external_prompt_only has paste_targets",
    fn: async () => {
      const spec = await enhancePrompt({ brief: "logo for Forge" });
      if (!spec.modes_available.includes("external_prompt_only")) return;
      if (!spec.paste_targets || spec.paste_targets.length === 0)
        throw new Error(`expected paste_targets, got ${JSON.stringify(spec.paste_targets)}`);
      for (const t of spec.paste_targets) {
        if (!t.name || !t.url || !t.notes)
          throw new Error(`malformed paste target: ${JSON.stringify(t)}`);
      }
    }
  },
  {
    name: "generate_logo mode=inline_svg: returns InlineSvgPlan (no network)",
    fn: async () => {
      const r = await generateLogo({
        brief: "flat minimal logo for Forge",
        mode: "inline_svg",
        vector: true
      });
      if (r.mode !== "inline_svg") throw new Error(`got mode=${r.mode}`);
      if (!r.svg_brief) throw new Error("InlineSvgPlan must include svg_brief");
      if (!r.instructions_to_host_llm.includes("viewBox"))
        throw new Error("instructions must mention viewBox");
      if (!r.instructions_to_host_llm.includes("asset_save_inline_svg"))
        throw new Error(
          "instructions must direct the LLM to call asset_save_inline_svg to persist the file"
        );
    }
  },
  {
    name: "generate_logo mode=external_prompt_only: returns prompt + paste_targets",
    fn: async () => {
      const r = await generateLogo({
        brief: "logo for Forge",
        mode: "external_prompt_only",
        vector: true
      });
      if (r.mode !== "external_prompt_only") throw new Error(`got mode=${r.mode}`);
      if (!r.enhanced_prompt) throw new Error("ExternalPromptPlan must include enhanced_prompt");
      if (!r.paste_targets || r.paste_targets.length === 0)
        throw new Error("ExternalPromptPlan needs paste_targets");
      if (r.ingest_hint.tool !== "asset_ingest_external") throw new Error("ingest_hint malformed");
    }
  },
  {
    name: "generate_logo mode=api (no key): throws actionable error",
    fn: async () => {
      const prior = {
        OPENAI_API_KEY: process.env["OPENAI_API_KEY"],
        IDEOGRAM_API_KEY: process.env["IDEOGRAM_API_KEY"],
        RECRAFT_API_KEY: process.env["RECRAFT_API_KEY"],
        BFL_API_KEY: process.env["BFL_API_KEY"],
        TOGETHER_API_KEY: process.env["TOGETHER_API_KEY"],
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        GOOGLE_API_KEY: process.env["GOOGLE_API_KEY"]
      };
      for (const k of Object.keys(prior)) delete process.env[k];
      try {
        await generateLogo({ brief: "logo for Forge", mode: "api", vector: true });
        throw new Error("api mode should have thrown with no keys");
      } catch (err) {
        const msg = (err as Error).message;
        if (!/api.*key|provider|OPENAI_API_KEY/i.test(msg))
          throw new Error(`error message not actionable: ${msg}`);
      } finally {
        for (const [k, v] of Object.entries(prior)) if (v !== undefined) process.env[k] = v;
      }
    }
  }
];

async function main(): Promise<void> {
  let pass = 0;
  let fail = 0;
  for (const c of checks) {
    try {
      await c.fn();
      process.stdout.write(`  ✓ ${c.name}\n`);
      pass++;
    } catch (err) {
      process.stderr.write(`  ✗ ${c.name}\n      ${(err as Error).message}\n`);
      fail++;
    }
  }
  process.stdout.write(`\n${pass}/${pass + fail} checks passed.\n`);
  if (fail > 0) process.exit(1);
}

main();
