import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CONFIG } from "../config.js";
import { OpenAIProvider, dummyPng } from "./openai.js";
import { GoogleProvider } from "./google.js";
import { IdeogramProvider } from "./ideogram.js";
import { RecraftProvider } from "./recraft.js";
import { BflProvider } from "./bfl.js";
import { StabilityProvider } from "./stability.js";
import { LeonardoProvider } from "./leonardo.js";
import { FalProvider } from "./fal.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { CloudflareProvider } from "./cloudflare.js";
import { ReplicateProvider } from "./replicate.js";
import { PollinationsProvider } from "./pollinations.js";
import { StableHordeProvider } from "./stable-horde.js";
import { ComfyUiProvider } from "./comfyui.js";
import { MidjourneyProvider } from "./midjourney.js";
import { AdobeProvider } from "./adobe.js";
import { KreaProvider } from "./krea.js";
import {
  findProvider,
  generate,
  isPasteOnlyModel,
  resolveGenerateTarget,
  providerAvailability,
  PASTE_ONLY_PROVIDERS,
  FREE_TIER_PROVIDERS,
  ProviderError
} from "./index.js";
import type { GenerateRequest } from "./types.js";

// ── Test harness ───────────────────────────────────────────────────────────────

type ResponseSpec =
  | {
      kind: "json";
      status?: number;
      body: unknown;
      contentType?: string;
      headers?: Record<string, string>;
    }
  | { kind: "buffer"; status?: number; body: Buffer; contentType?: string }
  | { kind: "text"; status?: number; body: string; contentType?: string };

interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

/** Queue-of-responses fetch mock. Each fetch() call consumes the head of the queue. */
function createFetchMock(responses: ResponseSpec[]): { mock: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const queue = [...responses];
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const raw = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(raw)) headers[k] = String(v);
    }
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body: typeof init?.body === "string" ? init.body : undefined
    });
    const spec = queue.shift();
    if (!spec) throw new Error(`unexpected fetch call: ${url}`);
    const status = spec.status ?? 200;
    const ok = status >= 200 && status < 300;
    const respHeaders = new Map<string, string>();
    if (spec.kind === "json") {
      respHeaders.set("content-type", spec.contentType ?? "application/json");
      if (spec.headers) for (const [k, v] of Object.entries(spec.headers)) respHeaders.set(k, v);
    } else if (spec.kind === "buffer") {
      respHeaders.set("content-type", spec.contentType ?? "image/png");
    } else {
      respHeaders.set("content-type", spec.contentType ?? "text/plain");
    }
    return {
      ok,
      status,
      headers: { get: (k: string) => respHeaders.get(k.toLowerCase()) ?? null },
      async json() {
        if (spec.kind !== "json") throw new Error("not json");
        return spec.body;
      },
      async text() {
        if (spec.kind === "text") return spec.body;
        if (spec.kind === "json") return JSON.stringify(spec.body);
        return "";
      },
      async arrayBuffer() {
        if (spec.kind === "buffer") {
          return spec.body.buffer.slice(
            spec.body.byteOffset,
            spec.body.byteOffset + spec.body.byteLength
          ) as ArrayBuffer;
        }
        return new ArrayBuffer(0);
      }
    };
  });
  return { mock: mock as unknown as typeof fetch, calls };
}

const baseReq: GenerateRequest = {
  prompt: "a minimalist logo mark on a white background",
  width: 1024,
  height: 1024,
  seed: 42
};

const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PNG_BYTES = Buffer.from(PNG_B64, "base64");

// Swap the real CONFIG.apiKeys at runtime. Works because the exported object
// is not frozen; providers read CONFIG.apiKeys[name] on every call.
const ORIGINAL_KEYS = { ...CONFIG.apiKeys };
const ORIGINAL_CF_ACCOUNT = CONFIG.cloudflareAccountId;
const ORIGINAL_DRY_RUN = CONFIG.dryRun;

function setKey(name: keyof typeof CONFIG.apiKeys, value: string | undefined): void {
  (CONFIG.apiKeys as Record<string, string | undefined>)[name as string] = value;
}

function resetKeys(): void {
  for (const k of Object.keys(CONFIG.apiKeys))
    setKey(k as keyof typeof CONFIG.apiKeys, ORIGINAL_KEYS[k as keyof typeof ORIGINAL_KEYS]);
  (CONFIG as { cloudflareAccountId: string }).cloudflareAccountId = ORIGINAL_CF_ACCOUNT;
  (CONFIG as { dryRun: boolean }).dryRun = ORIGINAL_DRY_RUN;
}

const ENV_TO_RESTORE = [
  "POLLINATIONS_DISABLED",
  "POLLINATIONS_TOKEN",
  "HORDE_DISABLED",
  "HORDE_API_KEY",
  "PROMPT_TO_BUNDLE_DRY_RUN",
  "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL",
  "PROMPT_TO_BUNDLE_MODAL_COMFYUI_TOKEN"
];
const envSnapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_TO_RESTORE) envSnapshot[k] = process.env[k];
  for (const k of ENV_TO_RESTORE) delete process.env[k];
  // Clear every API key by default so tests opt-in.
  for (const k of Object.keys(CONFIG.apiKeys)) setKey(k as keyof typeof CONFIG.apiKeys, undefined);
  (CONFIG as { cloudflareAccountId: string }).cloudflareAccountId = "";
  (CONFIG as { dryRun: boolean }).dryRun = false;
});

afterEach(() => {
  resetKeys();
  for (const k of ENV_TO_RESTORE) {
    if (envSnapshot[k] !== undefined) process.env[k] = envSnapshot[k];
    else delete process.env[k];
  }
  vi.restoreAllMocks();
});

function installFetch(...responses: ResponseSpec[]): { calls: FetchCall[]; restore: () => void } {
  const { mock, calls } = createFetchMock(responses);
  const original = global.fetch;
  global.fetch = mock;
  return {
    calls,
    restore() {
      global.fetch = original;
    }
  };
}

// ── OpenAI ─────────────────────────────────────────────────────────────────────

describe("OpenAIProvider", () => {
  it("supportsModel covers the three ids and rejects others", () => {
    expect(OpenAIProvider.supportsModel("gpt-image-1")).toBe(true);
    expect(OpenAIProvider.supportsModel("gpt-image-1.5")).toBe(true);
    expect(OpenAIProvider.supportsModel("dall-e-3")).toBe(true);
    expect(OpenAIProvider.supportsModel("flux-pro")).toBe(false);
  });

  it("isAvailable tracks the key", () => {
    expect(OpenAIProvider.isAvailable()).toBe(false);
    setKey("openai", "sk-xxx");
    expect(OpenAIProvider.isAvailable()).toBe(true);
  });

  it("throws actionable error when key is missing (no dry run)", async () => {
    await expect(OpenAIProvider.generate("gpt-image-1", baseReq)).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("returns a dummy png in dry-run with no key", async () => {
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const result = await OpenAIProvider.generate("gpt-image-1", {
      ...baseReq,
      transparency: true
    });
    expect(result.image.length).toBeGreaterThan(0);
    expect(result.model).toBe("gpt-image-1");
    expect(result.native_rgba).toBe(true);
  });

  it("hits /v1/images/generations with transparent body for gpt-image-1", async () => {
    setKey("openai", "sk-xxx");
    const { calls, restore } = installFetch({
      kind: "json",
      body: { data: [{ b64_json: PNG_B64, revised_prompt: "revised!" }] }
    });
    try {
      const result = await OpenAIProvider.generate("gpt-image-1", {
        ...baseReq,
        transparency: true,
        reference_images: ["https://example/ref.png"]
      });
      expect(result.image.equals(PNG_BYTES)).toBe(true);
      expect(result.native_rgba).toBe(true);
      expect(result.provider_revised_prompt).toBe("revised!");
      const call = calls[0]!;
      expect(call.url).toBe("https://api.openai.com/v1/images/generations");
      expect(call.headers["Authorization"]).toBe("Bearer sk-xxx");
      const body = JSON.parse(call.body ?? "{}");
      expect(body.background).toBe("transparent");
      expect(body.output_format).toBe("png");
      expect(body.size).toBe("1024x1024");
      expect(body.input_image).toEqual(["https://example/ref.png"]);
    } finally {
      restore();
    }
  });

  it("picks landscape + portrait sizes based on aspect ratio", async () => {
    setKey("openai", "sk-xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { data: [{ b64_json: PNG_B64 }] } },
      { kind: "json", body: { data: [{ b64_json: PNG_B64 }] } },
      { kind: "json", body: { data: [{ b64_json: PNG_B64 }] } },
      { kind: "json", body: { data: [{ b64_json: PNG_B64 }] } }
    );
    try {
      await OpenAIProvider.generate("gpt-image-1", { ...baseReq, width: 1792, height: 1024 });
      await OpenAIProvider.generate("gpt-image-1", { ...baseReq, width: 1024, height: 1792 });
      await OpenAIProvider.generate("dall-e-3", { ...baseReq, width: 1792, height: 1024 });
      await OpenAIProvider.generate("dall-e-3", { ...baseReq, width: 1024, height: 1792 });
      expect(JSON.parse(calls[0]!.body!).size).toBe("1536x1024");
      expect(JSON.parse(calls[1]!.body!).size).toBe("1024x1536");
      expect(JSON.parse(calls[2]!.body!).size).toBe("1792x1024");
      expect(JSON.parse(calls[3]!.body!).size).toBe("1024x1792");
    } finally {
      restore();
    }
  });

  it("throws on non-2xx and missing image data", async () => {
    setKey("openai", "sk-xxx");
    let handle = installFetch({ kind: "text", status: 500, body: "boom" });
    try {
      await expect(OpenAIProvider.generate("gpt-image-1", baseReq)).rejects.toThrow(/HTTP 500/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { data: [{}] } });
    try {
      await expect(OpenAIProvider.generate("gpt-image-1", baseReq)).rejects.toThrow(/no b64_json/);
    } finally {
      handle.restore();
    }
  });

  it("dummyPng returns a valid PNG header", () => {
    const buf = dummyPng(16, 16);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
  });
});

// ── Google ────────────────────────────────────────────────────────────────────

describe("GoogleProvider", () => {
  it("supportsModel covers Imagen and Gemini ids", () => {
    expect(GoogleProvider.supportsModel("imagen-3")).toBe(true);
    expect(GoogleProvider.supportsModel("imagen-4")).toBe(true);
    expect(GoogleProvider.supportsModel("gemini-3-flash-image")).toBe(true);
    expect(GoogleProvider.supportsModel("gemini-3.1-flash-image-preview")).toBe(true);
    expect(GoogleProvider.supportsModel("gemini-3-pro-image-preview")).toBe(true);
    expect(GoogleProvider.supportsModel("gpt-image-1")).toBe(false);
  });

  it("throws when no key", async () => {
    await expect(GoogleProvider.generate("imagen-4", baseReq)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("dry-run returns dummy png", async () => {
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const result = await GoogleProvider.generate("imagen-4", baseReq);
    expect(result.image.length).toBeGreaterThan(0);
    expect(result.native_rgba).toBe(false);
  });

  it("calls generativelanguage and returns base64 image", async () => {
    setKey("google", "goog-xxx");
    const { calls, restore } = installFetch({
      kind: "json",
      body: {
        candidates: [
          { content: { parts: [{ inlineData: { data: PNG_B64, mimeType: "image/png" } }] } }
        ]
      }
    });
    try {
      const result = await GoogleProvider.generate("gemini-3-flash-image", {
        ...baseReq,
        width: 1792,
        height: 1024
      });
      expect(result.image.equals(PNG_BYTES)).toBe(true);
      expect(calls[0]!.url).toContain("gemini-3.1-flash-image-preview:generateContent");
      expect(calls[0]!.headers["x-goog-api-key"]).toBe("goog-xxx");
      const body = JSON.parse(calls[0]!.body ?? "{}");
      expect(body.generationConfig.imageConfig.aspectRatio).toBe("16:9");
    } finally {
      restore();
    }
  });

  it("translates preview aliases and fills aspect ratios", async () => {
    setKey("google", "goog-xxx");
    const { calls, restore } = installFetch(
      {
        kind: "json",
        body: { candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }] }
      },
      {
        kind: "json",
        body: { candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }] }
      },
      {
        kind: "json",
        body: { candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }] }
      },
      {
        kind: "json",
        body: { candidates: [{ content: { parts: [{ inlineData: { data: PNG_B64 } }] } }] }
      }
    );
    try {
      await GoogleProvider.generate("gemini-3-pro-image", {
        ...baseReq,
        width: 1200,
        height: 1600
      });
      await GoogleProvider.generate("imagen-3", { ...baseReq, width: 1024, height: 768 });
      await GoogleProvider.generate("imagen-4", baseReq);
      await GoogleProvider.generate("imagen-4", { ...baseReq, width: 1900, height: 1000 });
      expect(calls[0]!.url).toContain("gemini-3-pro-image-preview");
      expect(calls[1]!.url).toContain("imagen-3.0-generate-002");
      expect(calls[2]!.url).toContain("imagen-4.0-generate-001");
      expect(JSON.parse(calls[1]!.body!).generationConfig.imageConfig.aspectRatio).toBe("4:3");
      expect(JSON.parse(calls[3]!.body!).generationConfig.imageConfig.aspectRatio).toBe("16:9");
    } finally {
      restore();
    }
  });

  it("surfaces the free-tier hint on 429 limit:0 and on empty response", async () => {
    setKey("google", "goog-xxx");
    // Imagen 4 has a 25 RPD free tier — limit:0 means project misconfigured or quota exhausted.
    let handle = installFetch({
      kind: "text",
      status: 429,
      body: JSON.stringify({ error: { details: [{ quotaValue: "limit: 0" }] } })
    });
    try {
      await expect(GoogleProvider.generate("imagen-4", baseReq)).rejects.toThrow(
        /Imagen 4.*25 RPD/
      );
    } finally {
      handle.restore();
    }
    // Nano Banana has no free API tier — limit:0 is expected without billing.
    handle = installFetch({
      kind: "text",
      status: 429,
      body: JSON.stringify({ error: { details: [{ quotaValue: "limit: 0" }] } })
    });
    try {
      await expect(
        GoogleProvider.generate("gemini-3-pro-image", baseReq)
      ).rejects.toThrow(/Nano Banana family.*no free API tier/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { candidates: [] } });
    try {
      await expect(GoogleProvider.generate("imagen-4", baseReq)).rejects.toThrow(/no inline image/);
    } finally {
      handle.restore();
    }
  });
});

// ── Ideogram ──────────────────────────────────────────────────────────────────

describe("IdeogramProvider", () => {
  it("supportsModel + dry-run + error path", async () => {
    expect(IdeogramProvider.supportsModel("ideogram-3")).toBe(true);
    expect(IdeogramProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await IdeogramProvider.generate("ideogram-3", { ...baseReq, transparency: true });
    expect(dry.native_rgba).toBe(true);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(IdeogramProvider.generate("ideogram-3", baseReq)).rejects.toThrow(
      /IDEOGRAM_API_KEY/
    );
  });

  it("routes transparent requests to /ideogram-v3/generate-transparent", async () => {
    setKey("ideogram", "ik_xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { data: [{ url: "https://cdn.ideogram/out.png" }] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await IdeogramProvider.generate("ideogram-3-turbo", {
        ...baseReq,
        transparency: true,
        negative_prompt: "no text",
        width: 1024,
        height: 576
      });
      expect(r.native_rgba).toBe(true);
      expect(calls[0]!.url).toContain("ideogram-v3/generate-transparent");
      const body = JSON.parse(calls[0]!.body!);
      expect(body.image_request.rendering_speed).toBe("TURBO");
      expect(body.image_request.model).toBe("V_3_TURBO");
      expect(body.image_request.negative_prompt).toBe("no text");
      expect(body.image_request.aspect_ratio).toBe("ASPECT_16_9");
    } finally {
      restore();
    }
  });

  it("non-transparent path hits /generate and maps model codes", async () => {
    setKey("ideogram", "ik_xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { data: [{ url: "https://cdn/out.png" }] } },
      { kind: "buffer", body: PNG_BYTES },
      { kind: "json", body: { data: [{ url: "https://cdn/out2.png" }] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      await IdeogramProvider.generate("ideogram-2", { ...baseReq, width: 900, height: 1600 });
      await IdeogramProvider.generate("ideogram-2a", { ...baseReq, width: 1536, height: 1024 });
      expect(calls[0]!.url).toBe("https://api.ideogram.ai/generate");
      expect(JSON.parse(calls[0]!.body!).image_request.model).toBe("V_2");
      expect(JSON.parse(calls[0]!.body!).image_request.aspect_ratio).toBe("ASPECT_9_16");
      expect(JSON.parse(calls[2]!.body!).image_request.model).toBe("V_2A");
      expect(JSON.parse(calls[2]!.body!).image_request.aspect_ratio).toBe("ASPECT_3_2");
    } finally {
      restore();
    }
  });

  it("throws on HTTP error and missing url", async () => {
    setKey("ideogram", "ik_xxx");
    let handle = installFetch({ kind: "text", status: 401, body: "unauth" });
    try {
      await expect(IdeogramProvider.generate("ideogram-3", baseReq)).rejects.toThrow(/HTTP 401/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { data: [] } });
    try {
      await expect(IdeogramProvider.generate("ideogram-3", baseReq)).rejects.toThrow(
        /no image URL/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Recraft ───────────────────────────────────────────────────────────────────

describe("RecraftProvider", () => {
  it("supportsModel + dry-run png/svg + error path", async () => {
    expect(RecraftProvider.supportsModel("recraft-v4")).toBe(true);
    expect(RecraftProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dryPng = await RecraftProvider.generate("recraft-v3", baseReq);
    expect(dryPng.format).toBe("png");
    const drySvg = await RecraftProvider.generate("recraft-v4", {
      ...baseReq,
      output_format: "svg"
    });
    expect(drySvg.format).toBe("svg");
    expect(drySvg.native_svg).toBe(true);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(RecraftProvider.generate("recraft-v4", baseReq)).rejects.toThrow(
      /RECRAFT_API_KEY/
    );
  });

  it("sends SVG + palette body and auto-detects SVG content", async () => {
    setKey("recraft", "rk_xxx");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`;
    const { calls, restore } = installFetch({
      kind: "json",
      body: { data: [{ b64_json: Buffer.from(svg, "utf-8").toString("base64") }] }
    });
    try {
      const result = await RecraftProvider.generate("recraft-v4", {
        ...baseReq,
        output_format: "svg",
        style_id: "style_123",
        palette: ["#ff0000", "00f", "#abc"]
      });
      expect(result.format).toBe("svg");
      expect(result.native_svg).toBe(true);
      const body = JSON.parse(calls[0]!.body!);
      expect(body.model).toBe("recraftv4");
      expect(body.style).toBe("vector_illustration");
      expect(body.style_id).toBe("style_123");
      expect(body.controls.colors).toHaveLength(3);
      expect(body.controls.colors[0].rgb).toEqual([255, 0, 0]);
    } finally {
      restore();
    }
  });

  it("falls back to url + throws on empty response", async () => {
    setKey("recraft", "rk_xxx");
    let handle = installFetch(
      { kind: "json", body: { data: [{ url: "https://cdn/out.png" }] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await RecraftProvider.generate("recraft-v2", baseReq);
      expect(r.image.equals(PNG_BYTES)).toBe(true);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { data: [{}] } });
    try {
      await expect(RecraftProvider.generate("recraft-v2", baseReq)).rejects.toThrow(/no image/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "text", status: 500, body: "no" });
    try {
      await expect(RecraftProvider.generate("recraft-v2", baseReq)).rejects.toThrow(/HTTP 500/);
    } finally {
      handle.restore();
    }
  });
});

// ── BFL / Flux ────────────────────────────────────────────────────────────────

describe("BflProvider", () => {
  it("supportsModel + dry-run + no-key errors", async () => {
    for (const id of ["flux-pro", "flux-1", "flux-2", "flux-kontext", "flux-schnell", "flux-dev"])
      expect(BflProvider.supportsModel(id)).toBe(true);
    expect(BflProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await BflProvider.generate("flux-pro", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(BflProvider.generate("flux-pro", baseReq)).rejects.toThrow(/BFL_API_KEY/);
  });

  it("polls until ready for flux-2 with LoRA forwarded", async () => {
    setKey("flux", "bfl_xxx");
    const origSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    const { calls, restore } = installFetch(
      {
        kind: "json",
        body: { id: "job-1", polling_url: "https://api.bfl.ai/v1/get_result/job-1" }
      },
      { kind: "json", body: { status: "Pending" } },
      {
        kind: "json",
        body: { status: "Ready", result: { sample: "https://bflcdn/out.png" } }
      },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await BflProvider.generate("flux-2", {
        ...baseReq,
        lora: "ft_123",
        lora_strength: 0.8,
        reference_images: ["ref1"]
      });
      expect(r.image.equals(PNG_BYTES)).toBe(true);
      const body = JSON.parse(calls[0]!.body!);
      expect(body.finetune_id).toBe("ft_123");
      expect(body.finetune_strength).toBe(0.8);
      expect(body.reference_images).toEqual(["ref1"]);
      expect(calls[0]!.url).toContain("flux-pro-2");
    } finally {
      restore();
      (global.setTimeout as unknown) = origSetTimeout;
    }
  });

  it("routes different ids to different BFL endpoints", async () => {
    setKey("flux", "bfl_xxx");
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    const specs: Array<[string, string]> = [
      ["flux-1", "flux-pro"],
      ["flux-kontext", "flux-kontext-pro"],
      ["flux-schnell", "flux-schnell"],
      ["flux-dev", "flux-dev"]
    ];
    for (const [id, suffix] of specs) {
      const handle = installFetch(
        { kind: "json", body: { polling_url: `https://api.bfl.ai/poll/${id}` } },
        { kind: "json", body: { status: "Ready", result: { sample: "https://cdn/x.png" } } },
        { kind: "buffer", body: PNG_BYTES }
      );
      try {
        await BflProvider.generate(id, baseReq);
        expect(handle.calls[0]!.url).toContain(suffix);
      } finally {
        handle.restore();
      }
    }
  });

  it("surfaces errors for missing polling_url, Error status, and timeout", async () => {
    setKey("flux", "bfl_xxx");
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    let handle = installFetch({ kind: "json", body: {} });
    try {
      await expect(BflProvider.generate("flux-pro", baseReq)).rejects.toThrow(/polling_url/);
    } finally {
      handle.restore();
    }
    handle = installFetch(
      { kind: "json", body: { polling_url: "https://api.bfl.ai/poll/y" } },
      { kind: "json", body: { status: "Error" } }
    );
    try {
      await expect(BflProvider.generate("flux-pro", baseReq)).rejects.toThrow(/job failed/);
    } finally {
      handle.restore();
    }
    // 60x pending = timeout
    const pendings: ResponseSpec[] = [
      { kind: "json", body: { polling_url: "https://api.bfl.ai/poll/z" } }
    ];
    for (let i = 0; i < 60; i++) pendings.push({ kind: "json", body: { status: "Pending" } });
    handle = installFetch(...pendings);
    try {
      await expect(BflProvider.generate("flux-pro", baseReq)).rejects.toThrow(/timed out/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "text", status: 500, body: "boom" });
    try {
      await expect(BflProvider.generate("flux-pro", baseReq)).rejects.toThrow(/HTTP 500/);
    } finally {
      handle.restore();
    }
  });
});

// ── Stability ─────────────────────────────────────────────────────────────────

describe("StabilityProvider", () => {
  it("dry-run, no-key, supportsModel", async () => {
    expect(StabilityProvider.supportsModel("sdxl")).toBe(true);
    expect(StabilityProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await StabilityProvider.generate("sdxl", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(StabilityProvider.generate("sdxl", baseReq)).rejects.toThrow(/STABILITY_API_KEY/);
  });

  it("sends multipart form with negative prompt and routes by aspect", async () => {
    setKey("stability", "sk-stab");
    const { calls, restore } = installFetch({ kind: "buffer", body: PNG_BYTES });
    try {
      const r = await StabilityProvider.generate("sd3-large", {
        ...baseReq,
        negative_prompt: "blurry",
        width: 1024,
        height: 768,
        output_format: "webp"
      });
      expect(r.image.equals(PNG_BYTES)).toBe(true);
      expect(r.format).toBe("webp");
      expect(calls[0]!.url).toContain("/sd3");
      expect(calls[0]!.headers["Authorization"]).toBe("Bearer sk-stab");
    } finally {
      restore();
    }
  });

  it("maps every published aspect bucket", async () => {
    setKey("stability", "sk-stab");
    const { restore } = installFetch(
      ...Array.from({ length: 10 }, () => ({ kind: "buffer" as const, body: PNG_BYTES }))
    );
    try {
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1024, height: 1024 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1920, height: 1080 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 2100, height: 900 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1500, height: 1000 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1000, height: 1500 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1000, height: 1250 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1250, height: 1000 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 1080, height: 1920 });
      await StabilityProvider.generate("sdxl", { ...baseReq, width: 900, height: 2100 });
      await StabilityProvider.generate("playground-v3", { ...baseReq, width: 512, height: 1024 });
    } finally {
      restore();
    }
  });

  it("errors on non-2xx", async () => {
    setKey("stability", "sk-stab");
    const { restore } = installFetch({ kind: "text", status: 402, body: "no credits" });
    try {
      await expect(StabilityProvider.generate("sdxl", baseReq)).rejects.toThrow(/HTTP 402/);
    } finally {
      restore();
    }
  });
});

// ── Leonardo ──────────────────────────────────────────────────────────────────

describe("LeonardoProvider", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  });

  it("dry-run, no-key, supportsModel", async () => {
    expect(LeonardoProvider.supportsModel("leonardo-phoenix")).toBe(true);
    expect(LeonardoProvider.supportsModel("sdxl")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await LeonardoProvider.generate("leonardo-phoenix", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(LeonardoProvider.generate("leonardo-phoenix", baseReq)).rejects.toThrow(
      /LEONARDO_API_KEY/
    );
  });

  it("creates a generation, polls, and fetches final image", async () => {
    setKey("leonardo", "leo-xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { sdGenerationJob: { generationId: "gen-1" } } },
      { kind: "json", body: { generations_by_pk: { status: "PENDING" } } },
      {
        kind: "json",
        body: {
          generations_by_pk: {
            status: "COMPLETE",
            generated_images: [{ url: "https://leo/out.png" }]
          }
        }
      },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await LeonardoProvider.generate("leonardo-diffusion-xl", {
        ...baseReq,
        negative_prompt: "blurry"
      });
      expect(r.image.equals(PNG_BYTES)).toBe(true);
      expect(calls[0]!.body).toContain("negative_prompt");
    } finally {
      restore();
    }
  });

  it("covers create-fail, missing id, FAILED status, timeout", async () => {
    setKey("leonardo", "leo-xxx");
    let handle = installFetch({ kind: "text", status: 401, body: "no" });
    try {
      await expect(LeonardoProvider.generate("leonardo-phoenix", baseReq)).rejects.toThrow(
        /HTTP 401/
      );
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { sdGenerationJob: {} } });
    try {
      await expect(LeonardoProvider.generate("leonardo-phoenix", baseReq)).rejects.toThrow(
        /no generationId/
      );
    } finally {
      handle.restore();
    }
    handle = installFetch(
      { kind: "json", body: { sdGenerationJob: { generationId: "id" } } },
      { kind: "json", body: { generations_by_pk: { status: "FAILED" } } }
    );
    try {
      await expect(LeonardoProvider.generate("leonardo-phoenix", baseReq)).rejects.toThrow(
        /generation failed/
      );
    } finally {
      handle.restore();
    }
    const polls: ResponseSpec[] = [
      { kind: "json", body: { sdGenerationJob: { generationId: "id" } } }
    ];
    for (let i = 0; i < 60; i++)
      polls.push({ kind: "json", body: { generations_by_pk: { status: "PENDING" } } });
    handle = installFetch(...polls);
    try {
      await expect(LeonardoProvider.generate("leonardo-phoenix", baseReq)).rejects.toThrow(
        /timed out/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Fal ───────────────────────────────────────────────────────────────────────

describe("FalProvider", () => {
  it("dry-run + supportsModel + endpoints + errors", async () => {
    for (const id of ["fal-flux-pro", "fal-flux-2", "fal-sdxl"])
      expect(FalProvider.supportsModel(id)).toBe(true);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    expect((await FalProvider.generate("fal-flux-pro", baseReq)).image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(FalProvider.generate("fal-flux-pro", baseReq)).rejects.toThrow(/FAL_API_KEY/);
    setKey("fal", "fal-xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { images: [{ url: "https://fal/out.png" }] } },
      { kind: "buffer", body: PNG_BYTES },
      { kind: "json", body: { images: [{ url: "https://fal/sdxl.png" }] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      await FalProvider.generate("fal-flux-2", { ...baseReq, reference_images: ["r"] });
      await FalProvider.generate("fal-sdxl", baseReq);
      expect(calls[0]!.url).toContain("flux-2");
      expect(calls[2]!.url).toContain("fast-sdxl");
    } finally {
      restore();
    }
    let handle = installFetch({ kind: "text", status: 500, body: "no" });
    try {
      await expect(FalProvider.generate("fal-flux-pro", baseReq)).rejects.toThrow(/HTTP 500/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { images: [] } });
    try {
      await expect(FalProvider.generate("fal-flux-pro", baseReq)).rejects.toThrow(/no image/);
    } finally {
      handle.restore();
    }
  });
});

// ── HuggingFace ───────────────────────────────────────────────────────────────

describe("HuggingFaceProvider", () => {
  it("dry-run + supportsModel + success + error", async () => {
    expect(HuggingFaceProvider.supportsModel("hf-sdxl")).toBe(true);
    expect(HuggingFaceProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await HuggingFaceProvider.generate("hf-sdxl", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(HuggingFaceProvider.generate("hf-sdxl", baseReq)).rejects.toThrow(/HF_TOKEN/);
    setKey("huggingface", "hf_xxx");
    const { calls, restore } = installFetch({ kind: "buffer", body: PNG_BYTES });
    try {
      const r = await HuggingFaceProvider.generate("hf-flux-dev", {
        ...baseReq,
        negative_prompt: "blurry"
      });
      expect(r.image.equals(PNG_BYTES)).toBe(true);
      expect(calls[0]!.url).toContain("black-forest-labs/FLUX.1-dev");
    } finally {
      restore();
    }
    const handle = installFetch({ kind: "text", status: 503, body: "cold" });
    try {
      await expect(HuggingFaceProvider.generate("hf-sd3", baseReq)).rejects.toThrow(/HTTP 503/);
    } finally {
      handle.restore();
    }
  });
});

// ── Cloudflare ────────────────────────────────────────────────────────────────

describe("CloudflareProvider", () => {
  it("dry-run + supportsModel + error paths", async () => {
    expect(CloudflareProvider.supportsModel("cf-flux-1-schnell")).toBe(true);
    expect(CloudflareProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    expect(
      (await CloudflareProvider.generate("cf-flux-1-schnell", baseReq)).image.length
    ).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(CloudflareProvider.generate("cf-flux-1-schnell", baseReq)).rejects.toThrow(
      /CLOUDFLARE_ACCOUNT_ID/
    );
  });

  it("handles both raw-bytes and JSON response shapes, with step math", async () => {
    setKey("cloudflare", "cf-xxx");
    (CONFIG as { cloudflareAccountId: string }).cloudflareAccountId = "acct123";
    const { calls, restore } = installFetch(
      { kind: "buffer", body: PNG_BYTES },
      {
        kind: "json",
        body: { result: { images: [PNG_BYTES.toString("base64")] } }
      },
      {
        kind: "json",
        body: { result: { image: PNG_BYTES.toString("base64") } }
      }
    );
    try {
      await CloudflareProvider.generate("cf-flux-1-schnell", {
        ...baseReq,
        negative_prompt: "ignored-for-flux"
      });
      await CloudflareProvider.generate("cf-flux-2-dev", {
        ...baseReq,
        reference_images: ["b64ref"]
      });
      await CloudflareProvider.generate("cf-sdxl-lightning", {
        ...baseReq,
        negative_prompt: "blurry"
      });
      expect(calls[0]!.url).toContain("acct123");
      const b0 = JSON.parse(calls[0]!.body!);
      expect(b0.num_steps).toBe(4);
      expect(b0.negative_prompt).toBeUndefined(); // flux ignores negatives
      const b1 = JSON.parse(calls[1]!.body!);
      expect(b1.image_b64).toEqual(["b64ref"]);
      const b2 = JSON.parse(calls[2]!.body!);
      expect(b2.negative_prompt).toBe("blurry");
      expect(b2.num_steps).toBe(4);
    } finally {
      restore();
    }
  });

  it("clamps dimensions to 2048 and picks sane defaults", async () => {
    setKey("cloudflare", "cf-xxx");
    (CONFIG as { cloudflareAccountId: string }).cloudflareAccountId = "acct123";
    const { calls, restore } = installFetch({ kind: "buffer", body: PNG_BYTES });
    try {
      await CloudflareProvider.generate("cf-leonardo-phoenix", {
        ...baseReq,
        width: 4096,
        height: 4096
      });
      const body = JSON.parse(calls[0]!.body!);
      expect(body.width).toBe(2048);
      expect(body.height).toBe(2048);
      expect(body.num_steps).toBe(20);
    } finally {
      restore();
    }
  });

  it("errors: non-2xx and JSON-without-image", async () => {
    setKey("cloudflare", "cf-xxx");
    (CONFIG as { cloudflareAccountId: string }).cloudflareAccountId = "acct";
    let handle = installFetch({ kind: "text", status: 403, body: "forbidden" });
    try {
      await expect(CloudflareProvider.generate("cf-sdxl", baseReq)).rejects.toThrow(/HTTP 403/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { result: {} } });
    try {
      await expect(CloudflareProvider.generate("cf-dreamshaper-8-lcm", baseReq)).rejects.toThrow(
        /no image\/b64/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Replicate ─────────────────────────────────────────────────────────────────

describe("ReplicateProvider", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  });

  it("dry-run + supportsModel + no-key error", async () => {
    expect(ReplicateProvider.supportsModel("replicate-flux-1.1-pro")).toBe(true);
    expect(ReplicateProvider.supportsModel("gpt-image-1")).toBe(false);
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await ReplicateProvider.generate("replicate-flux-dev", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(ReplicateProvider.generate("replicate-flux-dev", baseReq)).rejects.toThrow(
      /REPLICATE_API_TOKEN/
    );
  });

  it("returns transparent ideogram run with transparency style", async () => {
    setKey("replicate", "rep-xxx");
    const { calls, restore } = installFetch(
      { kind: "json", body: { id: "p1", status: "succeeded", output: ["https://rep/out.png"] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await ReplicateProvider.generate("replicate-ideogram-3", {
        ...baseReq,
        transparency: true,
        negative_prompt: "no text"
      });
      expect(r.native_rgba).toBe(true);
      const body = JSON.parse(calls[0]!.body!);
      expect(body.input.style).toBe("transparent");
      expect(body.input.negative_prompt).toBe("no text");
    } finally {
      restore();
    }
  });

  it("recraft-v3 sends size + reports native_svg", async () => {
    setKey("replicate", "rep-xxx");
    const svg = "<svg xmlns='http://www.w3.org/2000/svg'/>";
    const { calls, restore } = installFetch(
      {
        kind: "json",
        body: { id: "p2", status: "succeeded", output: "https://rep/out.svg" }
      },
      { kind: "buffer", body: Buffer.from(svg) }
    );
    try {
      const r = await ReplicateProvider.generate("replicate-recraft-v3", baseReq);
      expect(r.format).toBe("svg");
      expect(r.native_svg).toBe(true);
      const body = JSON.parse(calls[0]!.body!);
      expect(body.input.size).toBe("1024x1024");
    } finally {
      restore();
    }
  });

  it("polls on non-inline predictions and errors on failure/missing output", async () => {
    setKey("replicate", "rep-xxx");
    let handle = installFetch(
      {
        kind: "json",
        body: { id: "p3", status: "starting", urls: { get: "https://rep/get/p3" } }
      },
      {
        kind: "json",
        body: { id: "p3", status: "processing", urls: { get: "https://rep/get/p3" } }
      },
      {
        kind: "json",
        body: { id: "p3", status: "succeeded", output: ["https://rep/out.png"] }
      },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await ReplicateProvider.generate("replicate-flux-schnell", baseReq);
      expect(r.image.equals(PNG_BYTES)).toBe(true);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { id: "p4", status: "failed", error: "oops" } });
    try {
      await expect(ReplicateProvider.generate("replicate-sdxl", baseReq)).rejects.toThrow(
        /prediction failed/
      );
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { id: "p5", status: "succeeded", output: null } });
    try {
      await expect(ReplicateProvider.generate("replicate-sd3", baseReq)).rejects.toThrow(
        /no output/
      );
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "text", status: 401, body: "no" });
    try {
      await expect(ReplicateProvider.generate("replicate-flux-dev", baseReq)).rejects.toThrow(
        /HTTP 401/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Pollinations ──────────────────────────────────────────────────────────────

describe("PollinationsProvider", () => {
  it("supportsModel + isAvailable flips on POLLINATIONS_DISABLED", () => {
    expect(PollinationsProvider.supportsModel("pollinations-flux")).toBe(true);
    expect(PollinationsProvider.supportsModel("gpt-image-1")).toBe(false);
    expect(PollinationsProvider.isAvailable()).toBe(true);
    process.env["POLLINATIONS_DISABLED"] = "1";
    expect(PollinationsProvider.isAvailable()).toBe(false);
  });

  it("disabled + dry run returns dummy; disabled + no dry run throws", async () => {
    process.env["POLLINATIONS_DISABLED"] = "1";
    (CONFIG as { dryRun: boolean }).dryRun = true;
    const dry = await PollinationsProvider.generate("pollinations-turbo", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    (CONFIG as { dryRun: boolean }).dryRun = false;
    await expect(PollinationsProvider.generate("pollinations-turbo", baseReq)).rejects.toThrow(
      /POLLINATIONS_DISABLED/
    );
  });

  it("fetches with token header + detects PNG / JPEG / WebP", async () => {
    process.env["POLLINATIONS_TOKEN"] = "poll-tok";
    const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const { calls, restore } = installFetch(
      { kind: "buffer", body: PNG_BYTES, contentType: "image/jpeg" },
      { kind: "buffer", body: jpegMagic }
    );
    try {
      const r1 = await PollinationsProvider.generate("pollinations-flux", baseReq);
      expect(r1.format).toBe("png");
      expect(calls[0]!.headers["Authorization"]).toBe("Bearer poll-tok");
      expect(calls[0]!.url).toContain("model=flux");
      const r2 = await PollinationsProvider.generate("pollinations-sd", baseReq);
      expect(r2.format).toBe("jpeg");
      expect(calls[1]!.url).toContain("model=stable-diffusion");
    } finally {
      restore();
    }
  });

  it("maps pollinations-kontext + unknown model id + webp detection + http error", async () => {
    const webpMagic = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const short = Buffer.from([0x89]);
    let handle = installFetch({ kind: "buffer", body: webpMagic });
    try {
      const r = await PollinationsProvider.generate("pollinations-kontext", baseReq);
      expect(r.format).toBe("webp");
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "buffer", body: short });
    try {
      const r = await PollinationsProvider.generate("pollinations-flux", baseReq);
      expect(r.format).toBe("png");
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "text", status: 429, body: "rate limited" });
    try {
      await expect(PollinationsProvider.generate("pollinations-flux", baseReq)).rejects.toThrow(
        /HTTP 429/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Stable Horde ──────────────────────────────────────────────────────────────

describe("StableHordeProvider", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  });

  it("supportsModel + isAvailable + disabled paths", async () => {
    expect(StableHordeProvider.supportsModel("horde-sdxl")).toBe(true);
    expect(StableHordeProvider.supportsModel("gpt-image-1")).toBe(false);
    expect(StableHordeProvider.isAvailable()).toBe(true);
    process.env["HORDE_DISABLED"] = "1";
    expect(StableHordeProvider.isAvailable()).toBe(false);
    process.env["PROMPT_TO_BUNDLE_DRY_RUN"] = "1";
    const dry = await StableHordeProvider.generate("horde-sdxl", baseReq);
    expect(dry.image.length).toBeGreaterThan(0);
    delete process.env["PROMPT_TO_BUNDLE_DRY_RUN"];
    await expect(StableHordeProvider.generate("horde-sdxl", baseReq)).rejects.toThrow(
      /HORDE_DISABLED/
    );
  });

  it("anonymous flow with data: URL result", async () => {
    const b64 = PNG_BYTES.toString("base64");
    const handle = installFetch(
      { kind: "json", body: { id: "horde-1" } },
      { kind: "json", body: { done: false } },
      { kind: "json", body: { done: true, generations: [{ img: `data:image/png;base64,${b64}` }] } }
    );
    try {
      const r = await StableHordeProvider.generate("horde-flux", baseReq);
      expect(r.image.equals(PNG_BYTES)).toBe(true);
    } finally {
      handle.restore();
    }
  });

  it("authenticated flow with HTTPS result", async () => {
    process.env["HORDE_API_KEY"] = "kudos-key";
    const handle = installFetch(
      { kind: "json", body: { id: "horde-2" } },
      { kind: "json", body: { done: true, generations: [{ img: "https://r2/out.png" }] } },
      { kind: "buffer", body: PNG_BYTES }
    );
    try {
      const r = await StableHordeProvider.generate("horde-sd-1.5", baseReq);
      expect(r.image.equals(PNG_BYTES)).toBe(true);
    } finally {
      handle.restore();
    }
  });

  it("errors on non-2xx, missing id, faulted, and timeout", async () => {
    let handle = installFetch({ kind: "text", status: 500, body: "no" });
    try {
      await expect(StableHordeProvider.generate("horde-sdxl", baseReq)).rejects.toThrow(/HTTP 500/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: {} });
    try {
      await expect(StableHordeProvider.generate("horde-sdxl", baseReq)).rejects.toThrow(/no id/);
    } finally {
      handle.restore();
    }
    handle = installFetch(
      { kind: "json", body: { id: "h" } },
      { kind: "json", body: { faulted: true } }
    );
    try {
      await expect(StableHordeProvider.generate("horde-sdxl", baseReq)).rejects.toThrow(/faulted/);
    } finally {
      handle.restore();
    }
    const polls: ResponseSpec[] = [{ kind: "json", body: { id: "h" } }];
    for (let i = 0; i < 100; i++) polls.push({ kind: "json", body: { done: false } });
    handle = installFetch(...polls);
    try {
      await expect(StableHordeProvider.generate("horde-sdxl", baseReq)).rejects.toThrow(
        /timed out/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── ComfyUI ───────────────────────────────────────────────────────────────────

describe("ComfyUiProvider", () => {
  it("supports comfyui- prefix only", () => {
    expect(ComfyUiProvider.supportsModel("comfyui-sdxl")).toBe(true);
    expect(ComfyUiProvider.supportsModel("sdxl")).toBe(false);
    expect(ComfyUiProvider.isAvailable()).toBe(false);
    process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"] = "https://modal/x";
    expect(ComfyUiProvider.isAvailable()).toBe(true);
  });

  it("throws a clear error with no URL configured", async () => {
    await expect(ComfyUiProvider.generate("comfyui-sdxl", baseReq)).rejects.toThrow(
      /MODAL_COMFYUI_URL/
    );
  });

  it("posts with token + LoRA fields + returns image_base64", async () => {
    process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"] = "https://modal/run";
    process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_TOKEN"] = "mod-tok";
    const { calls, restore } = installFetch({
      kind: "json",
      body: {
        image_base64: PNG_B64,
        format: "png",
        seed: 77,
        native_rgba: true,
        raw_response: { info: "ok" }
      }
    });
    try {
      const r = await ComfyUiProvider.generate("comfyui-flux-lora", {
        ...baseReq,
        negative_prompt: "bad",
        lora: "my-brand",
        reference_images: ["ref"]
      });
      expect(r.native_rgba).toBe(true);
      expect(r.seed).toBe(77);
      const body = JSON.parse(calls[0]!.body!);
      expect(body.model).toBe("flux-lora");
      expect(body.negative_prompt).toBe("bad");
      expect(body.lora).toBe("my-brand");
      expect(body.lora_strength).toBe(1);
      expect(body.reference_images).toEqual(["ref"]);
      expect(calls[0]!.headers["Authorization"]).toBe("Bearer mod-tok");
    } finally {
      restore();
    }
  });

  it("surfaces fetch failure, http error, and missing image_base64", async () => {
    process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"] = "https://modal/run";
    const original = global.fetch;
    global.fetch = vi.fn(async () => {
      throw new Error("econnrefused");
    }) as typeof fetch;
    try {
      await expect(ComfyUiProvider.generate("comfyui-x", baseReq)).rejects.toThrow(/fetch failed/);
    } finally {
      global.fetch = original;
    }
    let handle = installFetch({ kind: "text", status: 502, body: "bad gateway" });
    try {
      await expect(ComfyUiProvider.generate("comfyui-x", baseReq)).rejects.toThrow(/HTTP 502/);
    } finally {
      handle.restore();
    }
    handle = installFetch({ kind: "json", body: { format: "png" } });
    try {
      await expect(ComfyUiProvider.generate("comfyui-x", baseReq)).rejects.toThrow(
        /missing image_base64/
      );
    } finally {
      handle.restore();
    }
  });
});

// ── Paste-only trio ───────────────────────────────────────────────────────────

describe("paste-only providers", () => {
  it("Midjourney is paste-only and throws helpful error", async () => {
    expect(MidjourneyProvider.supportsModel("midjourney-v6")).toBe(true);
    expect(MidjourneyProvider.supportsModel("gpt-image-1")).toBe(false);
    expect(MidjourneyProvider.isAvailable()).toBe(false);
    await expect(MidjourneyProvider.generate("midjourney-v7", baseReq)).rejects.toThrow(
      /external_prompt_only/
    );
  });

  it("Adobe Firefly is paste-only and throws helpful error", async () => {
    expect(AdobeProvider.supportsModel("firefly-3")).toBe(true);
    expect(AdobeProvider.isAvailable()).toBe(false);
    await expect(AdobeProvider.generate("firefly-3", baseReq)).rejects.toThrow(/enterprise IMS/);
  });

  it("Krea is paste-only and throws helpful error", async () => {
    expect(KreaProvider.supportsModel("krea-image-1")).toBe(true);
    expect(KreaProvider.isAvailable()).toBe(false);
    await expect(KreaProvider.generate("krea-image-1", baseReq)).rejects.toThrow(
      /no stable public API/
    );
  });
});

// ── Registry / dispatcher ─────────────────────────────────────────────────────

describe("provider registry", () => {
  it("findProvider routes ids to owning providers", () => {
    expect(findProvider("gpt-image-1")?.name).toBe("openai");
    expect(findProvider("imagen-4")?.name).toBe("google");
    expect(findProvider("recraft-v4")?.name).toBe("recraft");
    expect(findProvider("midjourney-v7")?.name).toBe("midjourney");
    expect(findProvider("unknown-foo")).toBeUndefined();
  });

  it("generate() surfaces ProviderError for unknown model ids", async () => {
    await expect(generate("unknown-foo", baseReq)).rejects.toThrow(ProviderError);
  });

  it("isPasteOnlyModel + PASTE_ONLY_PROVIDERS list", () => {
    expect(isPasteOnlyModel("midjourney-v6")).toBe(true);
    expect(isPasteOnlyModel("firefly-3")).toBe(true);
    expect(isPasteOnlyModel("krea-image-1")).toBe(true);
    expect(isPasteOnlyModel("gpt-image-1")).toBe(false);
    expect(isPasteOnlyModel("nonexistent")).toBe(false);
    expect(new Set(PASTE_ONLY_PROVIDERS)).toEqual(new Set(["midjourney", "adobe", "krea"]));
    expect(FREE_TIER_PROVIDERS).toContain("pollinations");
  });

  it("resolveGenerateTarget picks the first available non-paste-only model", () => {
    // Nothing available → null
    expect(resolveGenerateTarget("gpt-image-1", ["ideogram-3"])).toBeNull();
    // Primary key present → primary, no substitution.
    setKey("openai", "sk");
    expect(resolveGenerateTarget("gpt-image-1", ["ideogram-3"])).toEqual({
      model: "gpt-image-1",
      substituted: false
    });
    // Primary paste-only → substitutes to first available fallback.
    setKey("openai", undefined);
    setKey("ideogram", "ik");
    const r = resolveGenerateTarget("midjourney-v7", ["gpt-image-1", "ideogram-3"]);
    expect(r?.model).toBe("ideogram-3");
    expect(r?.substituted).toBe(true);
    expect(r?.note).toContain("midjourney-v7");
    expect(r?.note).toContain("ideogram-3");
  });

  it("providerAvailability returns one entry per provider", () => {
    const avail = providerAvailability();
    expect(typeof avail["openai"]).toBe("boolean");
    expect(typeof avail["pollinations"]).toBe("boolean");
  });
});
