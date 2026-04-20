// CLI dispatcher for the `p2a` binary.
//
//   p2a                 → run the MCP stdio server (default — preserves
//                         existing `claude mcp add ... node dist/index.js`
//                         registrations).
//   p2a mcp             → same as above; explicit.
//   p2a export <png>    → standalone platform fan-out (iOS / Android / PWA /
//                         favicon / visionOS) from a 1024² master. No API key
//                         required. Parity target: appicon.co + flutter_launcher_icons.
//   p2a init            → interactive project setup: detects framework, writes
//                         brand.json scaffold, offers MCP registration.
//   p2a doctor          → print a dependency + env summary (sharp, png-to-ico,
//                         vtracer, potrace, provider keys).
//   p2a --help / -h     → usage.

import { exportCommand } from "./export.js";
import { initCommand } from "./init.js";
import { doctorCommand } from "./doctor.js";
import { spriteSheetCommand } from "./sprite-sheet.js";
import { nineSliceCommand } from "./nine-slice.js";
import { modelsCommand } from "./models.js";
import { pickCommand } from "./pick.js";
import { runMcp } from "./mcp.js";

const USAGE = `prompt-to-asset (p2a)

Usage:
  p2a                        Run the MCP stdio server (default).
  p2a mcp                    Same as above; explicit.
  p2a export <master.png>    Fan a 1024² master out to iOS / Android / PWA /
                             favicon / visionOS / Flutter bundles. No API key
                             required. Parity: appicon.co + flutter_launcher_icons.
                             Options:
                               --platforms ios,android,pwa,favicon,visionos,flutter
                                             Comma list. Default: all.
                               --out <dir>    Output directory (default ./assets/bundle-<timestamp>).
                               --bg <#hex>    Background color for iOS 1024 marketing /
                                             Android adaptive BG / favicon apple-touch.
                               --app-name <s> App short name (PWA manifest).
                               --theme <#hex> theme_color for the PWA manifest.
                               --ios18        Emit iOS 18 dark + tinted variants.
                               --quiet        Suppress per-file logging.
  p2a init                   Interactive setup: detect framework, write brand.json,
                             offer MCP registration for your IDE.
  p2a models list            Print the model registry. Flags:
                               --free         only zero-key / free-tier models
                               --paid         only paid direct-API models
                               --paste-only   only paste-only surfaces
                               --rgba         only models with native transparent output
                               --svg          only models with native SVG output
  p2a models inspect <id>    Full capability dump + paste targets + routing references.
  p2a pick                   Interactive picker. Asks asset type + constraints,
                             returns a ranked route (target model, paste targets,
                             enhanced prompt, next-step commands). No keys needed.
  p2a sprite-sheet <dir>     Pack a directory of PNG frames into one sheet +
                             TexturePacker-compatible JSON atlas. For game devs.
                             Options:
                               --layout grid|strip  (default grid)
                               --columns <n>        grid only
                               --padding <px>       gutter around cells
                               --out sheet.png
                               --atlas sheet.json
  p2a nine-slice <image>     Emit a 9-slice config + CSS border-image snippet +
                             Unity/Godot/Phaser/PixiJS-ready numbers from one image.
                             Options:
                               --guides L,T,R,B     pixels from each edge (required)
                               --android-9patch     also emit an Android .9.png
  p2a doctor                 Print dependency + API-key inventory. Read-only.
                             Flags:
                               --data  Check that model-registry.json and
                                       routing-table.json agree (exits 1 on
                                       broken refs; useful in CI).
  p2a --help, -h             Show this message.

Environment: see .env.example for optional provider keys and pipeline URLs.
Docs:        https://github.com/MohamedAbdallah-14/prompt-to-asset
`;

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const [cmd, ...rest] = argv;

  if (!cmd || cmd === "mcp") {
    await runMcp();
    return;
  }

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(USAGE);
    return;
  }

  if (cmd === "export") {
    await exportCommand(rest);
    return;
  }

  if (cmd === "init") {
    await initCommand(rest);
    return;
  }

  if (cmd === "doctor") {
    await doctorCommand(rest);
    return;
  }

  if (cmd === "models") {
    await modelsCommand(rest);
    return;
  }

  if (cmd === "pick") {
    await pickCommand(rest);
    return;
  }

  if (cmd === "sprite-sheet") {
    await spriteSheetCommand(rest);
    return;
  }

  if (cmd === "nine-slice") {
    await nineSliceCommand(rest);
    return;
  }

  if (cmd === "--version" || cmd === "-v") {
    // Read the version from whichever package.json sits closest above this
    // file. Two layouts to handle: monorepo dev (dist/cli/index.js is two up
    // from packages/mcp-server/package.json) and published npm (dist/cli/
    // index.js is two up from the package root's package.json). Walk up
    // looking for the first package.json with a "version" — first hit wins.
    const { readFileSync, existsSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    let dir = here;
    let version = "unknown";
    for (let i = 0; i < 6; i++) {
      const pkgPath = resolve(dir, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
            name?: string;
            version?: string;
          };
          if (pkg.name === "prompt-to-asset" && pkg.version) {
            version = pkg.version;
            break;
          }
        } catch {
          /* keep walking */
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    process.stdout.write(`${version}\n`);
    return;
  }

  process.stderr.write(`Unknown command: ${cmd}\n\n${USAGE}`);
  process.exit(2);
}
