# Lottie & Rive Ecosystem — External Research

**Research value: high** — Both formats have mature, permissively-licensed open-source runtimes, well-defined container formats, and clear (if different) asset-redistribution rules.

## TL;DR for `prompt-to-asset`

- **Runtimes, wrappers, and format tooling are all safely redistributable** (MIT or Apache-2.0). No legal hazard in bundling them into a generated brand package or in calling them from the server.
- **Asset libraries are not MIT/CC-BY by default.** LottieFiles free animations ship under the proprietary **Lottie Simple License (FL 9.13.21)** — commercial-use OK, but share-alike and no "competing service" clause. Rive Community files ship under **CC BY** — requires attribution. LottieFiles Premium and IconScout Lottie packs are off-limits for redistribution.
- **Server-side Lottie → GIF/MP4 is a solved but narrow problem.** `puppeteer-lottie` is the only actively-viable Node option; `lottie-node` is archived and its maintainer redirects to `puppeteer-lottie`.

---

## 1. Format & spec

| Item | URL | License | Notes |
|---|---|---|---|
| Lottie JSON (Bodymovin) | [airbnb.io/lottie](https://airbnb.io/lottie/) | format is open / de facto | AE export format; JSON-only |
| dotLottie v1.0 / v2.0 spec | [dotlottie.io/spec/1.0](https://dotlottie.io/spec/1.0/), [v2.0](https://dotlottie.io/spec/2.0/) | open spec | ZIP container (`.lottie`, MIME `application/zip+dotlottie`) bundling Lottie JSON + images + themes + state machines + fonts. v2.0 adds state machines (`s/`), themes (`t/`), fonts (`f/`). |
| Rive `.riv` format | [rive.app/docs](https://rive.app/docs/) | proprietary binary, but runtimes are MIT | Binary, vector+state-machine, cross-platform; only readable via rive-runtime. |

**Implication:** `.lottie` is the right distribution container for a generated brand bundle that includes theming — it's open, zip-based, and every major Lottie runtime in 2026 reads it natively. `.riv` requires the Rive editor to author.

---

## 2. Runtime players (ship inside product / brand bundle)

| Project | URL | License | Maintenance (as of early 2026) | Role |
|---|---|---|---|---|
| `lottie-web` (airbnb) | [github.com/airbnb/lottie-web](https://github.com/airbnb/lottie-web) | MIT | Active; last update Sep 2025, v5.x | Canonical JS/DOM Lottie player, 31.8k★. Reference impl. |
| `@lottiefiles/dotlottie-web` | [github.com/LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web) | MIT | Very active; v0.69.0, 622 releases | Canvas + WASM player powered by ThorVG. Framework wrappers for React/Vue/Svelte/Solid/WC all MIT (`@lottiefiles/dotlottie-react`, `-vue`, `-svelte`, `-solid`, `-wc`). **Recommended default for new web integrations.** |
| `lottie-react-native` | [github.com/lottie-react-native/lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) | Apache-2.0 | Healthy; v7.3.6, 609k weekly npm dl | RN wrapper (moved out of airbnb org). |
| `lottie-ios` | [github.com/airbnb/lottie-ios](https://github.com/airbnb/lottie-ios) | Apache-2.0 | Active; v4.6.0 (Jan 2026). Supports iOS/macOS 10.15+/tvOS/visionOS. | Native Swift renderer; macOS support built-in. |
| `lottie-android` | [github.com/airbnb/lottie-android](https://github.com/airbnb/lottie-android) | Apache-2.0 | Active but "nights & weekends"; v6.7.1 (Oct 2025). | Native Android renderer; v6.7 adds initial 3D. |
| Skottie (Skia) | [skia.org/docs/user/modules/skottie](https://skia.org/docs/user/modules/skottie/) | BSD-3 (Skia) | Active (Google) | Skia's native Lottie renderer used in Flutter, Android System UI, CanvasKit. Higher perf, slightly narrower feature set than lottie-web. Best option if you already have Skia/CanvasKit. |
| `rive-wasm` / `@rive-app/canvas`, `@rive-app/webgl` | [github.com/rive-app/rive-wasm](https://github.com/rive-app/rive-wasm) | MIT | Active, 929★ | Wasm + JS runtime for `.riv` on web. |
| `rive-ios` | [github.com/rive-app/rive-ios](https://github.com/rive-app/rive-ios) | MIT | Active; v6.18.2 | SPM + CocoaPods. |
| `rive-android` | [github.com/rive-app/rive-android](https://github.com/rive-app/rive-android) | Apache-2.0 (per GitHub; MIT also reported in source LICENSE) — treat as MIT-compatible | Active; v11.3.1 | Maven. |

**All runtimes above are safe to bundle and redistribute** in either commercial or OSS products. Apache-2.0 and MIT both permit redistribution in closed-source; retain the LICENSE files.

---

## 3. Helper / interactivity libs

| Project | URL | License | Use-case |
|---|---|---|---|
| `@lottiefiles/lottie-interactivity` | [github.com/LottieFiles/lottie-interactivity](https://github.com/LottieFiles/lottie-interactivity) | MIT | Scroll / hover / chain-play triggers on top of lottie-web. |
| `@lottiefiles/lottie-player` (legacy Web Component) | github.com/LottieFiles/lottie-player | MIT | Superseded by `dotlottie-wc`; avoid for new work. |
| ThorVG | [github.com/thorvg/thorvg](https://github.com/thorvg/thorvg) | MIT | Underlies dotlottie-web canvas backend. Rarely needed directly. |

---

## 4. Server-side Lottie rendering (Lottie → PNG/GIF/MP4)

| Project | URL | License | Status | Notes |
|---|---|---|---|---|
| `puppeteer-lottie` | [github.com/transitive-bullshit/puppeteer-lottie](https://github.com/transitive-bullshit/puppeteer-lottie) | MIT | **Recommended.** Maintained by @transitive-bullshit. | Headless Chrome + lottie-web; outputs PNG/JPEG frame sequences, GIF (needs `gifski`), MP4 (needs `ffmpeg`). 100% lottie-web-compatible. Slow but correct. |
| `lottie-node` | [github.com/friday/lottie-node](https://github.com/friday/lottie-node) | MIT | **Archived 2023.** Maintainer explicitly redirects to puppeteer-lottie. | Uses node-canvas + jsdom; brittle on newer Lottie features. Skip. |
| Skottie CLI / CanvasKit (Node) | via `canvaskit-wasm` npm | BSD-3 | Viable, low-level | Can script Skottie rendering in Node with `canvaskit-wasm` + ffmpeg. More perf than puppeteer, more engineering. Good fallback for batch pipelines. |
| LottieFiles "image-renderer" / creator APIs | [developers.lottiefiles.com](https://developers.lottiefiles.com/) | hosted SaaS | Paid | Hosted Lottie → GIF/MP4/PNG; fine for off-the-shelf, bad for redistribution sovereignty. |

**Recommendation for `prompt-to-asset`:** Start with `puppeteer-lottie` for Lottie → GIF/MP4/PNG. Migrate to `canvaskit-wasm` + Skottie only if throughput demands it. No viable Node Rive → video renderer — Rive → video requires the Rive editor export or a headless runtime harness.

---

## 5. Asset libraries — redistribution rules (THE IMPORTANT PART)

| Source | License on free files | Safe to redistribute inside a generated brand bundle? |
|---|---|---|
| **LottieFiles Free library** | [Lottie Simple License FL 9.13.21](https://lottiefiles.com/page/license) (Design Barn Inc., 2021) | **YES, with conditions.** Grants download / reproduce / modify / publish / distribute / publicly display / perform **including commercially.** BUT: (a) any redistribution (including modified derivatives) must pass through *the same license* — i.e. downstream recipients get the same grant, you can't relicense under MIT. (b) Attribution encouraged, not required. (c) **Must not** aggregate LottieFiles files to build a "similar or competing service" — a generator that ships bundles of LottieFiles-sourced animations as its core inventory arguably crosses this line. Ship user-selected single animations with the Simple License text included; do not build a searchable gallery of LottieFiles assets. |
| **LottieFiles Premium** | Paid subscription license | **NO.** Resale / redistribution prohibited per LottieFiles help docs. Do not include in generated bundles. |
| **Rive Community / Marketplace (free files)** | **CC BY 4.0** | **YES, with attribution.** Attribution to original creator is mandatory. Rive's remix feature auto-credits, but if you export the `.riv` and bundle it you must carry the `CC BY` notice + creator attribution in the bundle manifest. |
| **Rive paid Marketplace files** | Per-file commercial license (varies) | Check each file's listing. Usually single-seat / non-redistributable. Skip for generated bundles. |
| **IconScout Lottie packs** | Commercial (IconScout subscription) | **NO.** Skip. Not compatible with free redistribution. |
| **lottie-animated-icons / other github MIT asset packs** | MIT per-repo (verify) | **YES.** Safest source for default / fallback animations in a bundle. |

### Concrete guidance for a `prompt-to-asset` brand bundle

- **Include in a redistributable generated bundle:**
  - Any Rive runtime, Lottie runtime, dotLottie runtime, lottie-interactivity → MIT/Apache-2.0, retain LICENSE file.
  - Rive Community `.riv` files **with creator attribution in a NOTICE / CREDITS file**.
  - LottieFiles free `.json` / `.lottie` **only if the Lottie Simple License text is shipped alongside them**, and only a handful per bundle (don't build an indexed gallery).
  - MIT-licensed standalone Lottie packs from GitHub (verify each repo's LICENSE).

- **Do NOT include:**
  - LottieFiles Premium animations.
  - IconScout / Storyset / UI8 / any commercial marketplace lotties.
  - Any `.riv` marked paid on the Rive Marketplace.

- **License-text files to ship with the bundle** (minimum):
  - `LICENSES/lottie-simple-license.txt` (if any LottieFiles free asset is included).
  - `LICENSES/cc-by-4.0.txt` + `NOTICE.md` with per-file creator attribution (if any Rive Community asset is included).
  - `LICENSES/MIT-<runtime>.txt` and `LICENSES/APACHE-2.0-<runtime>.txt` for each runtime actually bundled.

---

## 6. Maintenance / risk signals

- **lottie-web** is in slow-mo maintenance — airbnb hasn't staffed it heavily since ~2022. Still canonical reference, but new feature velocity is in **dotlottie-web / ThorVG**, which is where LottieFiles is investing. Prefer dotlottie-web for new code paths.
- **lottie-android** is "nights & weekends" per the maintainers' own README; treat as a dependency with slow bug-fix cadence. Still shipping (v6.7.1 late 2025).
- **Skottie** is healthy because it's part of Skia (Google infra). Good long-term bet for high-perf server rendering.
- **Rive runtimes** are first-party, actively released (230+ releases per platform), very healthy.
- **puppeteer-lottie** is a single-maintainer project; acceptable for internal tooling, risky as a critical production dep. Consider vendoring.

---

## 7. Sources

- [Lottie Simple License FL 9.13.21](https://lottiefiles.com/page/license) — LottieFiles free-library license text.
- [LottieFiles Premium Animations help doc](https://help.lottiefiles.com/hc/en-us/articles/24484503354137-premium-animations) — no resale / redistribution of premium.
- [dotLottie v1.0 spec](https://dotlottie.io/spec/1.0/) / [v2.0 spec](https://dotlottie.io/spec/2.0/) — open container format.
- [LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web) — MIT web runtime (ThorVG + WASM).
- [airbnb/lottie-web](https://github.com/airbnb/lottie-web) — MIT, reference JS player.
- [airbnb/lottie-ios](https://github.com/airbnb/lottie-ios), [airbnb/lottie-android](https://github.com/airbnb/lottie-android) — Apache-2.0 native players.
- [lottie-react-native/lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) — Apache-2.0 RN wrapper.
- [skia.org Skottie docs](https://skia.org/docs/user/modules/skottie/) — Skia's native Lottie renderer.
- [rive-app/rive-wasm](https://github.com/rive-app/rive-wasm), [rive-ios](https://github.com/rive-app/rive-ios), [rive-android](https://github.com/rive-app/rive-android) — MIT runtimes.
- [Rive Marketplace Overview](https://rive.app/docs/community/marketplace-overview) — confirms CC BY on community/marketplace files.
- [Remixing in the Rive Community](https://rive.app/blog/remixing-files-in-the-rive-community) — CC BY attribution pass-through via remix.
- [LottieFiles/lottie-interactivity](https://github.com/LottieFiles/lottie-interactivity) — MIT interactivity layer.
- [transitive-bullshit/puppeteer-lottie](https://github.com/transitive-bullshit/puppeteer-lottie) — Node Lottie → PNG/GIF/MP4 renderer.
- [friday/lottie-node](https://github.com/friday/lottie-node) — archived; maintainer redirects to puppeteer-lottie.
