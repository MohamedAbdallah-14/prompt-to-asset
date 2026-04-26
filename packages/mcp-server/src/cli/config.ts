// `p2a config` — interactive TUI for managing API keys and config.
//
// Why this exists: keys in ~/.zshrc leak via shell history, dotfile syncs, and
// `env` dumps in CI logs. The MCP server runs non-interactively under Claude
// Code / Cursor, so a passphrase prompt isn't viable. We use a JSON file at
// $XDG_CONFIG_HOME/prompt-to-asset/secrets.json with 0700 dir / 0600 file —
// same trust model as `gh`, `npm`, `aws`. Env vars still win at read time.
//
// Dep-free: arrow-key menu via raw stdin + readline keypress events. No
// inquirer/blessed/ink — keeps the install slim.

import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import {
  loadStore,
  setStoredValue,
  getStorePath,
  permsWarning
} from "../security/secrets-store.js";

interface ProviderRow {
  envVar: string;
  label: string;
  helpUrl: string;
}

const PROVIDERS: ProviderRow[] = [
  {
    envVar: "OPENAI_API_KEY",
    label: "OpenAI — gpt-image-2 / gpt-image-1.5 / gpt-image-1 / dall-e-3",
    helpUrl: "https://platform.openai.com/api-keys"
  },
  {
    envVar: "GEMINI_API_KEY",
    label: "Google AI Studio — Gemini / Imagen (paid for image-gen)",
    helpUrl: "https://aistudio.google.com/app/apikey"
  },
  {
    envVar: "IDEOGRAM_API_KEY",
    label: "Ideogram — strong text + transparent (Turbo)",
    helpUrl: "https://ideogram.ai/manage-api"
  },
  {
    envVar: "RECRAFT_API_KEY",
    label: "Recraft — native SVG (V4)",
    helpUrl: "https://www.recraft.ai/projects/api"
  },
  {
    envVar: "BFL_API_KEY",
    label: "Black Forest Labs — Flux Pro / Ultra",
    helpUrl: "https://api.bfl.ai/auth/profile"
  },
  {
    envVar: "STABILITY_API_KEY",
    label: "Stability AI — SD3 / SDXL",
    helpUrl: "https://platform.stability.ai/account/keys"
  },
  {
    envVar: "LEONARDO_API_KEY",
    label: "Leonardo",
    helpUrl: "https://app.leonardo.ai/api-access"
  },
  {
    envVar: "FAL_API_KEY",
    label: "fal.ai",
    helpUrl: "https://fal.ai/dashboard/keys"
  },
  {
    envVar: "FREEPIK_API_KEY",
    label: "Freepik — Mystic / Flux Pro / icon SVG (5 EUR free trial)",
    helpUrl: "https://www.freepik.com/api/dashboard/api-keys"
  },
  {
    envVar: "PIXAZO_API_KEY",
    label: "Pixazo",
    helpUrl: "https://www.pixazo.com/"
  },
  {
    envVar: "HF_TOKEN",
    label: "Hugging Face Inference (free read token)",
    helpUrl: "https://huggingface.co/settings/tokens"
  },
  {
    envVar: "CLOUDFLARE_API_TOKEN",
    label: "Cloudflare Workers AI — 10k neurons/day free",
    helpUrl: "https://dash.cloudflare.com/profile/api-tokens"
  },
  {
    envVar: "CLOUDFLARE_ACCOUNT_ID",
    label: "Cloudflare account ID (paired with the token)",
    helpUrl: "https://dash.cloudflare.com/"
  },
  {
    envVar: "REPLICATE_API_TOKEN",
    label: "Replicate",
    helpUrl: "https://replicate.com/account/api-tokens"
  }
];

interface FlagRow {
  envVar: string;
  label: string;
  placeholder: string;
}

const FLAG_ROWS: FlagRow[] = [
  {
    envVar: "PROMPT_TO_BUNDLE_OUTPUT_DIR",
    label: "Output directory for generated assets",
    placeholder: "./assets"
  },
  {
    envVar: "PROMPT_TO_BUNDLE_CACHE_DIR",
    label: "Cache directory",
    placeholder: "./.asset-cache"
  },
  {
    envVar: "PROMPT_TO_BUNDLE_DRY_RUN",
    label: "Dry run — skip provider calls (1 to enable)",
    placeholder: "1 or empty"
  },
  {
    envVar: "PROMPT_TO_BUNDLE_TRANSPORT",
    label: "MCP transport",
    placeholder: "stdio | http"
  },
  {
    envVar: "PROMPT_TO_BUNDLE_HTTP_PORT",
    label: "HTTP port (when transport=http)",
    placeholder: "3333"
  },
  {
    envVar: "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL",
    label: "ComfyUI / Modal URL (custom workflows, brand LoRA)",
    placeholder: "https://..."
  },
  {
    envVar: "P2A_MAX_SPEND_USD_PER_RUN",
    label: "Cost cap per api-mode run (USD)",
    placeholder: "5.00 (empty = no cap)"
  }
];

// ANSI helpers ---------------------------------------------------------------

const CSI = "\x1b[";
const clearScreen = () => stdout.write(`${CSI}2J${CSI}H`);
const hideCursor = () => stdout.write(`${CSI}?25l`);
const showCursor = () => stdout.write(`${CSI}?25h`);
const dim = (s: string) => `${CSI}2m${s}${CSI}0m`;
const bold = (s: string) => `${CSI}1m${s}${CSI}0m`;
const green = (s: string) => `${CSI}32m${s}${CSI}0m`;
const yellow = (s: string) => `${CSI}33m${s}${CSI}0m`;
const cyan = (s: string) => `${CSI}36m${s}${CSI}0m`;
const red = (s: string) => `${CSI}31m${s}${CSI}0m`;

function maskValue(v: string | undefined): string {
  if (!v || v.length === 0) return "";
  if (v.length <= 8) return "*".repeat(v.length);
  return v.slice(0, 4) + "…" + v.slice(-4);
}

// Keypress plumbing ----------------------------------------------------------

interface KeyEvent {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  sequence?: string;
}

function nextKey(): Promise<KeyEvent> {
  return new Promise((resolve) => {
    const onKey = (_str: string, key: KeyEvent | undefined) => {
      stdin.removeListener("keypress", onKey);
      resolve(key ?? {});
    };
    stdin.on("keypress", onKey);
  });
}

/** Read a line of input from raw stdin, optionally masking with `*`. */
function readLine(label: string, prompt: string, mask: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    showCursor();
    stdout.write(`\n  ${label}\n  ${prompt}`);
    let buf = "";
    let done = false;
    const finish = (val: string | null) => {
      if (done) return;
      done = true;
      stdin.removeListener("keypress", onKey);
      stdout.write("\n");
      hideCursor();
      resolve(val);
    };
    const onKey = (_s: string, k: KeyEvent | undefined) => {
      if (!k) return;
      if (k.ctrl && k.name === "c") return finish(null);
      if (k.name === "escape") return finish(null);
      if (k.name === "return" || k.name === "enter") return finish(buf);
      if (k.name === "backspace") {
        if (buf.length > 0) {
          buf = buf.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }
      if (k.ctrl || k.meta) return;
      const seq = k.sequence ?? "";
      if (seq.length === 0) return;
      for (const ch of seq) {
        const code = ch.charCodeAt(0);
        if (code < 0x20 || code === 0x7f) continue;
        buf += ch;
        stdout.write(mask ? "*" : ch);
      }
    };
    stdin.on("keypress", onKey);
  });
}

// Renderers ------------------------------------------------------------------

type Screen = "main" | "keys" | "flags";
type Toast = { text: string; kind: "ok" | "warn" | "err" } | null;

interface UiState {
  mainIdx: number;
  keysIdx: number;
  flagsIdx: number;
  toast: Toast;
}

function renderHeader(): void {
  const path = getStorePath();
  stdout.write(bold("\n  prompt-to-asset config\n"));
  stdout.write(dim(`  storage: ${path}\n`));
  const warn = permsWarning();
  if (warn) stdout.write(yellow(`  ⚠  ${warn}\n`));
  stdout.write("\n");
}

function renderMain(s: UiState): void {
  const items = ["API keys", "Paths & flags", "Run doctor", "Quit"];
  items.forEach((label, i) => {
    const sel = i === s.mainIdx;
    const prefix = sel ? cyan("›") : " ";
    stdout.write(`  ${prefix} ${sel ? bold(label) : label}\n`);
  });
  stdout.write(dim("\n  ↑/↓ move · enter select · q quit\n"));
}

function renderKeys(s: UiState): void {
  stdout.write(bold("  API keys\n\n"));
  const store = loadStore();
  PROVIDERS.forEach((row, i) => {
    const sel = i === s.keysIdx;
    const fileVal = store.values[row.envVar];
    const envVal = process.env[row.envVar];
    let status: string;
    if (envVal && envVal.length > 0 && envVal !== fileVal) {
      status = green(`set [env: ${maskValue(envVal)}]`);
    } else if (fileVal && fileVal.length > 0) {
      status = green(`set [file: ${maskValue(fileVal)}]`);
    } else {
      status = dim("not set");
    }
    const prefix = sel ? cyan("›") : " ";
    const name = sel ? bold(row.envVar) : row.envVar;
    stdout.write(`  ${prefix} ${name.padEnd(28)}  ${status}\n`);
    if (sel) {
      stdout.write(dim(`      ${row.label}\n`));
      stdout.write(dim(`      ${row.helpUrl}\n`));
    }
  });
  stdout.write(dim("\n  ↑/↓ move · enter set/replace · d delete · esc back\n"));
  stdout.write(
    dim("  shell env vars override the file. Unset the env var to use the stored value.\n")
  );
}

function renderFlags(s: UiState): void {
  stdout.write(bold("  Paths & flags\n\n"));
  const store = loadStore();
  FLAG_ROWS.forEach((row, i) => {
    const sel = i === s.flagsIdx;
    const fileVal = store.values[row.envVar];
    const envVal = process.env[row.envVar];
    const tag = envVal ? cyan("[env]") : fileVal ? cyan("[file]") : dim("[default]");
    const shown = envVal ?? fileVal ?? "";
    const prefix = sel ? cyan("›") : " ";
    const name = sel ? bold(row.envVar) : row.envVar;
    stdout.write(`  ${prefix} ${name.padEnd(36)}  ${shown.padEnd(28)}  ${tag}\n`);
    if (sel) {
      stdout.write(dim(`      ${row.label}\n`));
      stdout.write(dim(`      example: ${row.placeholder}\n`));
    }
  });
  stdout.write(dim("\n  ↑/↓ move · enter edit · d clear · esc back\n"));
}

function render(screen: Screen, s: UiState): void {
  clearScreen();
  renderHeader();
  if (screen === "main") renderMain(s);
  else if (screen === "keys") renderKeys(s);
  else if (screen === "flags") renderFlags(s);
  if (s.toast) {
    const fn = s.toast.kind === "ok" ? green : s.toast.kind === "warn" ? yellow : red;
    stdout.write("\n  " + fn(s.toast.text) + "\n");
  }
}

// Edit handlers --------------------------------------------------------------

async function editSecret(envVar: string, label: string): Promise<Toast> {
  const value = await readLine(
    label,
    `${envVar} (paste, then Enter; empty cancels): `,
    /* mask */ true
  );
  if (value === null) return { text: "Cancelled", kind: "warn" };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { text: "Cancelled (empty input)", kind: "warn" };
  setStoredValue(envVar, trimmed);
  process.env[envVar] = trimmed;
  return { text: `Saved ${envVar} (${maskValue(trimmed)})`, kind: "ok" };
}

async function editFlag(row: FlagRow): Promise<Toast> {
  const value = await readLine(
    row.label,
    `${row.envVar} [${row.placeholder}] (Enter to save, esc to cancel): `,
    /* mask */ false
  );
  if (value === null) return { text: "Cancelled", kind: "warn" };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { text: "Cancelled (empty input)", kind: "warn" };
  setStoredValue(row.envVar, trimmed);
  process.env[row.envVar] = trimmed;
  return { text: `Saved ${row.envVar}=${trimmed}`, kind: "ok" };
}

// Entry point ----------------------------------------------------------------

export async function configCommand(_argv: string[] = []): Promise<void> {
  if (!stdin.isTTY) {
    process.stderr.write("p2a config requires an interactive terminal.\n");
    process.exit(2);
  }

  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  hideCursor();

  let exiting = false;
  const cleanup = () => {
    if (exiting) return;
    exiting = true;
    showCursor();
    try {
      stdin.setRawMode(false);
    } catch {
      // ignore
    }
    stdin.pause();
    stdout.write("\n");
  };
  process.on("exit", cleanup);

  const state: UiState = { mainIdx: 0, keysIdx: 0, flagsIdx: 0, toast: null };
  let screen: Screen = "main";

  try {
    while (true) {
      render(screen, state);
      state.toast = null;
      const key = await nextKey();

      if ((key.ctrl && key.name === "c") || (screen === "main" && key.name === "q")) break;
      if (key.name === "escape") {
        if (screen === "main") break;
        screen = "main";
        continue;
      }

      if (screen === "main") {
        if (key.name === "up") state.mainIdx = Math.max(0, state.mainIdx - 1);
        else if (key.name === "down") state.mainIdx = Math.min(3, state.mainIdx + 1);
        else if (key.name === "return") {
          if (state.mainIdx === 0) screen = "keys";
          else if (state.mainIdx === 1) screen = "flags";
          else if (state.mainIdx === 2) {
            // Hand the screen over to doctor, then come back.
            clearScreen();
            showCursor();
            stdin.setRawMode(false);
            const { doctorCommand } = await import("./doctor.js");
            await doctorCommand([]);
            stdout.write("\n  [press any key to return]");
            stdin.setRawMode(true);
            hideCursor();
            await nextKey();
          } else if (state.mainIdx === 3) break;
        }
      } else if (screen === "keys") {
        if (key.name === "up") state.keysIdx = Math.max(0, state.keysIdx - 1);
        else if (key.name === "down")
          state.keysIdx = Math.min(PROVIDERS.length - 1, state.keysIdx + 1);
        else if (key.name === "return") {
          const row = PROVIDERS[state.keysIdx]!;
          state.toast = await editSecret(row.envVar, row.label);
        } else if (key.name === "d" || key.name === "delete") {
          const row = PROVIDERS[state.keysIdx]!;
          setStoredValue(row.envVar, undefined);
          delete process.env[row.envVar];
          state.toast = { text: `Deleted ${row.envVar}`, kind: "ok" };
        }
      } else if (screen === "flags") {
        if (key.name === "up") state.flagsIdx = Math.max(0, state.flagsIdx - 1);
        else if (key.name === "down")
          state.flagsIdx = Math.min(FLAG_ROWS.length - 1, state.flagsIdx + 1);
        else if (key.name === "return") {
          const row = FLAG_ROWS[state.flagsIdx]!;
          state.toast = await editFlag(row);
        } else if (key.name === "d" || key.name === "delete") {
          const row = FLAG_ROWS[state.flagsIdx]!;
          setStoredValue(row.envVar, undefined);
          delete process.env[row.envVar];
          state.toast = { text: `Cleared ${row.envVar}`, kind: "ok" };
        }
      }
    }
  } finally {
    cleanup();
  }
}
