// Secrets + config persistence for `p2a config`.
//
// Stores provider keys and a few non-secret config knobs at
// $XDG_CONFIG_HOME/prompt-to-asset/secrets.json (default ~/.config/...).
// Directory is forced to 0700, file to 0600 on POSIX. Atomic write via
// tmp-file + rename. No encryption — same trust model as `gh`, `npm`,
// `aws`: filesystem permissions + your user account.
//
// Read order at runtime: process.env wins over the stored value. That keeps
// existing zshrc / .env / CI setups working unchanged. `hydrateEnv()`
// populates only the env vars that are currently empty.

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  renameSync,
  statSync
} from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

const SECRET_KEYS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "IDEOGRAM_API_KEY",
  "RECRAFT_API_KEY",
  "BFL_API_KEY",
  "TOGETHER_API_KEY",
  "STABILITY_API_KEY",
  "LEONARDO_API_KEY",
  "FAL_API_KEY",
  "FAL_KEY",
  "FREEPIK_API_KEY",
  "PIXAZO_API_KEY",
  "PIXAZO_SUBSCRIPTION_KEY",
  "HF_TOKEN",
  "HUGGINGFACE_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY"
] as const;

const NON_SECRET_KEYS = [
  "PROMPT_TO_BUNDLE_OUTPUT_DIR",
  "PROMPT_TO_BUNDLE_CACHE_DIR",
  "PROMPT_TO_BUNDLE_DRY_RUN",
  "PROMPT_TO_BUNDLE_TRANSPORT",
  "PROMPT_TO_BUNDLE_HTTP_PORT",
  "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL",
  "P2A_MAX_SPEND_USD_PER_RUN"
] as const;

export const KNOWN_SECRET_KEYS: readonly string[] = SECRET_KEYS;
export const KNOWN_CONFIG_KEYS: readonly string[] = NON_SECRET_KEYS;
export const KNOWN_KEYS: readonly string[] = [...SECRET_KEYS, ...NON_SECRET_KEYS];

export interface StoreFile {
  version: 1;
  values: Record<string, string>;
}

export function getStorePath(): string {
  // Test override — handy for vitest without touching the real home dir.
  const override = process.env["PROMPT_TO_ASSET_SECRETS_PATH"];
  if (override && override.length > 0) return override;
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(base, "prompt-to-asset", "secrets.json");
}

export function loadStore(): StoreFile {
  const path = getStorePath();
  if (!existsSync(path)) return { version: 1, values: {} };
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoreFile> | null;
    if (!parsed || typeof parsed !== "object") return { version: 1, values: {} };
    const values =
      parsed.values && typeof parsed.values === "object"
        ? (parsed.values as Record<string, string>)
        : {};
    return { version: 1, values };
  } catch {
    // Corrupt file — don't blow up. The TUI will overwrite on next save.
    return { version: 1, values: {} };
  }
}

export function saveStore(store: StoreFile): void {
  const path = getStorePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  if (platform() !== "win32") {
    try {
      chmodSync(dir, 0o700);
    } catch {
      // best-effort; we still write the file
    }
  }
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 });
  if (platform() !== "win32") {
    try {
      chmodSync(tmp, 0o600);
    } catch {
      // best-effort
    }
  }
  renameSync(tmp, path);
  if (platform() !== "win32") {
    try {
      chmodSync(path, 0o600);
    } catch {
      // best-effort
    }
  }
}

export function setStoredValue(key: string, value: string | undefined): void {
  const store = loadStore();
  if (value === undefined || value.length === 0) {
    delete store.values[key];
  } else {
    store.values[key] = value;
  }
  saveStore(store);
}

export function getStoredValue(key: string): string | undefined {
  return loadStore().values[key];
}

/**
 * Copy stored values into process.env for any var that is currently unset
 * or empty. Idempotent. Env always wins.
 */
export function hydrateEnv(): void {
  const store = loadStore();
  for (const [k, v] of Object.entries(store.values)) {
    if (typeof v !== "string" || v.length === 0) continue;
    const cur = process.env[k];
    if (cur === undefined || cur.length === 0) {
      process.env[k] = v;
    }
  }
}

/**
 * Returns a warning string if the secrets file exists with looser perms than
 * 0600 on POSIX. null on Windows (no POSIX perms) or when file is fine.
 */
export function permsWarning(): string | null {
  if (platform() === "win32") return null;
  const path = getStorePath();
  if (!existsSync(path)) return null;
  try {
    const st = statSync(path);
    const mode = st.mode & 0o777;
    if (mode !== 0o600) {
      return `Insecure perms on ${path}: 0${mode.toString(8)} — should be 0600. Run \`chmod 600 ${path}\`.`;
    }
  } catch {
    // ignore
  }
  return null;
}
