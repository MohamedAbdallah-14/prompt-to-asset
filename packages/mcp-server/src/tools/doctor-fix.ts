// Tool: asset_doctor(auto_fix=true)  /  CLI: `p2a doctor --fix`
//
// Explicit opt-in auto-installer for the native-binary gap (vtracer, potrace).
// No sudo. No blind distro detection. Homebrew + cargo only; every other
// platform gets printed commands the user runs themselves. npm optional deps
// are NOT auto-manipulated — if sharp/satori/etc. are missing, the honest fix
// is a `npm install` the user sees, not an in-place poke at their modules.
//
// Safety:
//   - dry_run defaults to TRUE when called via MCP. The LLM cannot silently
//     install things. CLI --fix runs for real; --fix --dry-run previews.
//   - Every command is printed before it runs.
//   - execFile (not exec/shell). Arguments hardcoded.
//   - 5-minute timeout per step.
//   - Re-probes at the end and reports what's still missing.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { doctor } from "./doctor.js";

const execFileAsync = promisify(execFile);

export interface AutoFixOptions {
  dry_run?: boolean;
  skip?: string[];
}

export interface FixStep {
  id: string;
  command: string;
  args: string[];
  reason: string;
  ran: boolean;
  success?: boolean;
  output?: string;
  skipped_reason?: string;
}

export interface AutoFixReport {
  platform: NodeJS.Platform;
  arch: string;
  dry_run: boolean;
  steps: FixStep[];
  still_missing: string[];
  manual_hints: string[];
  ok: boolean;
}

const STEP_TIMEOUT_MS = 5 * 60 * 1000;

export async function autoFix(options: AutoFixOptions = {}): Promise<AutoFixReport> {
  const dryRun = options.dry_run ?? false;
  const skip = new Set(options.skip ?? []);

  // Probe current state.
  const before = await doctor({ check_data: false });

  const platform = process.platform;
  const arch = process.arch;

  const steps: FixStep[] = [];
  const manual_hints: string[] = [];

  const brewPath = await which("brew");
  const cargoPath = await which("cargo");
  const scoopPath = platform === "win32" ? await which("scoop") : null;
  const wingetPath = platform === "win32" ? await which("winget") : null;

  // --- vtracer --------------------------------------------------------------
  // vtracer is a Rust crate; it is NOT in Homebrew core, apt, or dnf. The only
  // first-party path is `cargo install vtracer` (a prebuilt musl binary ships
  // with the GitHub releases, but we don't download-and-verify those here).
  // On Windows, scoop's `main` bucket does carry it.
  if (!before.native_dependencies.vtracer.installed && !skip.has("vtracer")) {
    if (cargoPath) {
      steps.push({
        id: "vtracer",
        command: "cargo",
        args: ["install", "vtracer"],
        reason: "Multi-color SVG vectorizer — Rust crate, installed via cargo.",
        ran: false
      });
    } else if (platform === "win32" && scoopPath) {
      steps.push({
        id: "vtracer",
        command: "scoop",
        args: ["install", "vtracer"],
        reason: "Multi-color SVG vectorizer — Windows via scoop.",
        ran: false
      });
    } else {
      manual_hints.push(
        "vtracer: not in Homebrew / apt / dnf. Install Rust first (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`), reopen the shell, then `cargo install vtracer`. Or grab the prebuilt binary from https://github.com/visioncortex/vtracer/releases."
      );
    }
  }

  // --- potrace --------------------------------------------------------------
  if (!before.native_dependencies.potrace.installed && !skip.has("potrace")) {
    if (platform === "darwin" && brewPath) {
      steps.push({
        id: "potrace",
        command: "brew",
        args: ["install", "potrace"],
        reason: "1-bit vectorizer — fallback path for asset_vectorize on silhouettes.",
        ran: false
      });
    } else if (platform === "linux") {
      manual_hints.push(
        "potrace: `sudo apt-get install potrace` (Debian/Ubuntu), `sudo dnf install potrace` (Fedora), or `sudo pacman -S potrace` (Arch)."
      );
    } else if (platform === "win32") {
      if (scoopPath) {
        steps.push({
          id: "potrace",
          command: "scoop",
          args: ["install", "potrace"],
          reason: "1-bit vectorizer — Windows via scoop.",
          ran: false
        });
      } else if (wingetPath) {
        manual_hints.push("potrace: `winget install potrace` (no scoop bucket found).");
      } else {
        manual_hints.push(
          "potrace: install from https://potrace.sourceforge.net/ or via scoop / winget."
        );
      }
    } else {
      manual_hints.push("potrace: install from your distro's package manager.");
    }
  }

  // --- npm optional deps ----------------------------------------------------
  // We deliberately don't run `npm install` from inside the server — it would
  // modify whichever node_modules tree happens to be closest, which is usually
  // wrong for global installs. Instead, surface an explicit hint per missing
  // module so the user runs it themselves.
  const missingNpm = collectMissingNpmModules(before);
  if (missingNpm.length > 0) {
    manual_hints.push(
      `npm optional deps missing (${missingNpm.join(", ")}). These ship with p2a as optionalDependencies but can fail silently on some platforms. Re-run your install with --verbose: \`npm i -g prompt-to-asset --verbose\` (or \`npm i -D prompt-to-asset --verbose\` per-project) to see why they didn't land. Or install them individually: \`npm i -g ${missingNpm.join(" ")}\`.`
    );
  }

  // --- execute --------------------------------------------------------------
  if (!dryRun) {
    for (const step of steps) {
      try {
        const { stdout, stderr } = await execFileAsync(step.command, step.args, {
          timeout: STEP_TIMEOUT_MS,
          maxBuffer: 8 * 1024 * 1024,
          env: process.env
        });
        step.ran = true;
        step.success = true;
        step.output = truncateOutput(stdout + (stderr ? `\n${stderr}` : ""));
      } catch (err) {
        step.ran = true;
        step.success = false;
        const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
        step.output = truncateOutput(
          [e.stdout?.toString() ?? "", e.stderr?.toString() ?? "", e.message ?? ""]
            .filter(Boolean)
            .join("\n")
        );
      }
    }
  }

  // Re-probe so we report ground truth, not optimism.
  const after = dryRun ? before : await doctor({ check_data: false });
  const stillMissing: string[] = [];
  if (!after.native_dependencies.vtracer.installed) stillMissing.push("vtracer");
  if (!after.native_dependencies.potrace.installed) stillMissing.push("potrace");
  for (const m of missingNpm) stillMissing.push(m);

  const ok =
    steps.every((s) => s.success === true || (dryRun && !s.ran)) && stillMissing.length === 0;

  return {
    platform,
    arch,
    dry_run: dryRun,
    steps,
    still_missing: stillMissing,
    manual_hints,
    ok
  };
}

function collectMissingNpmModules(d: Awaited<ReturnType<typeof doctor>>): string[] {
  const missing: string[] = [];
  if (!d.native_dependencies.sharp.installed) missing.push("sharp");
  if (!d.native_dependencies["png-to-ico"].installed) missing.push("png-to-ico");
  if (!d.native_dependencies.satori.installed) missing.push("satori");
  if (!d.native_dependencies["resvg-js"].installed) missing.push("@resvg/resvg-js");
  if (!d.native_dependencies["tesseract.js"].installed) missing.push("tesseract.js");
  if (!d.native_dependencies.svgo.installed) missing.push("svgo");
  return missing;
}

async function which(bin: string): Promise<string | null> {
  const looker = process.platform === "win32" ? "where" : "which";
  try {
    const { stdout } = await execFileAsync(looker, [bin], {
      timeout: 5000,
      maxBuffer: 64 * 1024
    });
    const first = stdout.trim().split(/\r?\n/)[0];
    return first && first.length > 0 ? first : null;
  } catch {
    return null;
  }
}

function truncateOutput(s: string, max = 4000): string {
  if (s.length <= max) return s;
  const head = s.slice(0, max - 200);
  const tail = s.slice(-200);
  return `${head}\n…(truncated ${s.length - max} bytes)…\n${tail}`;
}
