import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CONFIG } from "./config.js";

/**
 * Content-addressed cache:
 *   key = sha256(model + version + seed + prompt + params_canonical)
 *   path = <cacheDir>/<key[0:2]>/<key>/<variant>.<ext>
 *
 * `prompt_hash` is emitted on every AssetBundle; a future hosted tier can
 * use it as a queue deduplication key (BullMQ jobId, SQS FIFO MessageDeduplicationId,
 * etc.). The local MCP server itself is synchronous, so the value is just a
 * cache fingerprint — see docs/research/18-asset-pipeline-tools/18e for the
 * hosted reference architecture.
 */
export function computeCacheKey(parts: {
  model: string;
  version?: string;
  seed: number;
  prompt: string;
  params: Record<string, unknown>;
}): { key: string; prompt_hash: string; params_hash: string } {
  const canonicalParams = JSON.stringify(sortKeys(parts.params));
  const prompt_hash = sha256(parts.prompt).slice(0, 16);
  const params_hash = sha256(canonicalParams).slice(0, 16);
  const key = sha256(
    [parts.model, parts.version ?? "v0", String(parts.seed), prompt_hash, params_hash].join("|")
  );
  return { key, prompt_hash, params_hash };
}

export function cachePath(key: string, variant: string): string {
  const bucket = key.slice(0, 2);
  return resolve(CONFIG.cacheDir, bucket, key, variant);
}

export function readCache(key: string, variant: string): Buffer | null {
  const p = cachePath(key, variant);
  if (!existsSync(p)) return null;
  try {
    return readFileSync(p);
  } catch {
    return null;
  }
}

export function writeCache(key: string, variant: string, data: Buffer | string): string {
  const p = cachePath(key, variant);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  return p;
}

export function writeArtifact(outDir: string, filename: string, data: Buffer | string): string {
  const p = join(outDir, filename);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  return p;
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function sortKeys(obj: unknown): Json {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    const src = obj as Record<string, unknown>;
    const out: Record<string, Json> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  if (obj === undefined) return null;
  return obj as Json;
}
