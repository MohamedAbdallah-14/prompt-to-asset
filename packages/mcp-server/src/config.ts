import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ModelInfo, RoutingRule } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = resolve(__dirname, "../../..", "data");

export const MODEL_REGISTRY: { models: ModelInfo[] } = JSON.parse(
  readFileSync(resolve(DATA_DIR, "model-registry.json"), "utf-8")
);

export const ROUTING_TABLE: { rules: RoutingRule[] } = JSON.parse(
  readFileSync(resolve(DATA_DIR, "routing-table.json"), "utf-8")
);

export const CONFIG = {
  cacheDir: process.env["PROMPT_TO_BUNDLE_CACHE_DIR"] || resolve(process.cwd(), ".asset-cache"),
  outputDir: process.env["PROMPT_TO_BUNDLE_OUTPUT_DIR"] || resolve(process.cwd(), "assets"),
  apiKeys: {
    openai: process.env["OPENAI_API_KEY"],
    google: process.env["GOOGLE_API_KEY"] || process.env["GEMINI_API_KEY"],
    ideogram: process.env["IDEOGRAM_API_KEY"],
    recraft: process.env["RECRAFT_API_KEY"],
    flux: process.env["BFL_API_KEY"] || process.env["TOGETHER_API_KEY"],
    stability: process.env["STABILITY_API_KEY"],
    leonardo: process.env["LEONARDO_API_KEY"],
    fal: process.env["FAL_API_KEY"] || process.env["FAL_KEY"],
    huggingface: process.env["HF_TOKEN"] || process.env["HUGGINGFACE_API_KEY"],
    cloudflare: process.env["CLOUDFLARE_API_TOKEN"],
    replicate: process.env["REPLICATE_API_TOKEN"] || process.env["REPLICATE_API_KEY"]
  },
  cloudflareAccountId: process.env["CLOUDFLARE_ACCOUNT_ID"] ?? "",
  transport: (process.env["PROMPT_TO_BUNDLE_TRANSPORT"] || "stdio") as "stdio" | "http",
  httpPort: Number(process.env["PROMPT_TO_BUNDLE_HTTP_PORT"] || "3333"),
  dryRun: process.env["PROMPT_TO_BUNDLE_DRY_RUN"] === "1"
};

export function findModel(id: string): ModelInfo | undefined {
  return MODEL_REGISTRY.models.find((m) => m.id === id);
}
