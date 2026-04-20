# 44 — Open Audio & SFX Sources

Catalogue of free/open audio sources and OSS audio tooling for possible future
"brand reel" / "intro sting" outputs from `prompt-to-asset`. Low priority — the
app does not currently generate audio assets. Keep this as a shortlist for the
day we add a reel/sting pipeline.

## TL;DR (policy defaults)

- **Default sources:** Pixabay Audio (attribution-optional, commercial OK) and
  Freesound CC0 subset (no attribution needed). These two cover ~95% of the
  SFX/background bed needs with the fewest compliance footguns.
- **Only add CC-BY sources (Incompetech, ccMixter CC-BY, FMA CC-BY, Musopen
  CC-BY)** if the bundle pipeline can emit an `ATTRIBUTIONS.md` / credits
  manifest alongside the audio file. Otherwise, stick to CC0/Pixabay.
- **Never embed** BBC Sound Effects Archive (personal/educational only),
  Zapsplat, Soundsnap, Soundstripe, YouTube Audio Library — they either
  exclude commercial use, our kind of distribution, or both.

## Sources

### Freesound — https://freesound.org

- **License(s):** mixed per-sound: CC0, CC-BY 4.0, CC-BY-NC (rare legacy:
  Sampling+). Filter the API to `license:"Creative Commons 0"` for the safe
  subset.
- **API:** yes — APIv2, token-based, documented at
  `https://freesound.org/docs/api/`. Free tier is non-commercial only per the
  API ToS; commercial API usage requires contacting Freesound even though the
  underlying CC0/CC-BY *content* is commercially usable when downloaded by a
  user directly.
- **Attribution:** not required for CC0; required for CC-BY (title, author,
  Freesound URL, license link).
- **Embeddable in a generated bundle:** yes for CC0; yes for CC-BY if bundle
  ships a credits manifest. Treat uploader "please credit me" notes in CC0
  descriptions as courtesy, not legally binding.

### Pixabay Audio — https://pixabay.com/music/ + /sound-effects/

- **License:** Pixabay Content License (effectively permissive / near-CC0).
  Commercial use OK, modification OK, no attribution required. Restriction:
  cannot resell the audio standalone in substantially the same form.
- **API:** yes — `https://pixabay.com/api/docs/`. Key required. The API ToS
  asks (not requires for the underlying content) that apps "show users where
  the content is from" when displaying search results, i.e. source-link on the
  *discovery surface*, not on the exported asset.
- **Attribution (end asset):** not required.
- **Embeddable in a generated bundle:** yes, with no credits obligation. Best
  candidate for fully-automated reel/sting pipelines.

### Incompetech (Kevin MacLeod) — https://incompetech.com

- **License:** CC-BY 4.0 on all tracks. (Separate paid "Standard License"
  exists for attribution-impossible use cases like TV/radio ads.)
- **API:** no. Catalogue is browsable by tag/mood; downloads are direct MP3s.
- **Attribution required (prescribed exact text):**

  ```
  "<Title>" Kevin MacLeod (incompetech.com)
  Licensed under Creative Commons: By Attribution 4.0
  https://creativecommons.org/licenses/by/4.0/
  ```

  Must be "easily discoverable" — credits panel, video description, about
  box, etc. Cannot be obscured.
- **Embeddable in a generated bundle:** yes, but only if the bundle includes
  the prescribed credit string in an accompanying credits file. No API means
  ingestion is manual, so treat as a curated shortlist, not a dynamic source.

### ccMixter — http://ccmixter.org

- **License:** per-track; typically CC-BY 3.0 or CC-BY-NC 3.0. Filter to
  CC-BY for commercial-safe subset.
- **API:** yes — Query API 2.0 (beta) at `http://ccmixter.org/query-api`,
  plus a Sample Pool API. RSS/HTML/PHP output formats. No auth required.
- **Attribution required (CC-BY):** in-work credit with artist name, track
  title, featured artists, link back to the ccMixter track URL, and named
  license with link.
- **Embeddable in a generated bundle:** yes for the CC-BY subset, with
  credits manifest. API exists but is old/beta — plan for best-effort
  availability.

### Free Music Archive (FMA) — https://freemusicarchive.org

- **License:** per-track CC licenses (CC-BY, CC-BY-SA, CC-BY-NC, etc.) plus
  some all-rights-reserved. No site-wide license.
- **API:** **no longer available** — FMA shut down the public API due to
  server load. App developers are told to self-host the files they want to
  use. No programmatic ingest path.
- **Attribution:** required per the track's individual CC license.
- **Embeddable in a generated bundle:** yes for CC-BY / CC-BY-SA tracks with
  credits, but ingestion is manual (scrape-and-host-yourself). Lower priority
  than Freesound/Pixabay because of the missing API.

### Musopen — https://musopen.org

- **License:** mixed — public domain recordings (PD-100), CC0, and various
  CC variants. Filter by license on the site. Scope is classical only.
- **API:** no public documented API. Open Opus (`https://openopus.org/`) is
  a related CC0 *metadata* API for composers/works but does not serve audio.
- **Attribution:** not required for PD/CC0; required for CC-BY tracks.
- **Embeddable in a generated bundle:** yes for the PD/CC0 subset. Useful
  only if we ever want an orchestral/classical sting style — niche for a
  prompt-to-asset brand reel.

### Explicitly skipped

- **YouTube Audio Library** — proprietary ToS; license is tied to
  YouTube-hosted use. Not embeddable in a redistributable bundle.
- **BBC Sound Effects Archive** — "RemArc" license is personal, educational,
  and research use only. No commercial use, no redistribution in a product.
- **Zapsplat, Soundsnap, Soundstripe** — commercial subscription models;
  license does not cover redistribution of the audio as part of a generated
  bundle to end users.

## OSS audio processing tools (likely pipeline dependencies)

- **ffmpeg** — LGPL 2.1+ by default; becomes GPL 2+ if built with
  `--enable-gpl` or patent-encumbered extras with `--enable-nonfree`.
  For commercial redistribution: build with **default LGPL flags only**,
  **dynamic-link** the libs, and ship the source (or an offer for it) plus
  build instructions. Avoid `libx264`/`libx265` (irrelevant for audio-only
  anyway). Codec patents (AAC, H.264/H.265) are a *separate* concern from the
  FFmpeg license — for audio output stick to Opus/AAC-in-MP4 with caution or
  MP3 (now patent-free) / FLAC / Vorbis / Opus to sidestep patents entirely.
  Home: `https://ffmpeg.org/legal.html`.
- **audiowaveform (BBC)** — GPL-3.0 (not BSD, common misconception). Good
  for generating waveform PNG/JSON previews alongside an audio asset. Because
  it is GPL and a standalone CLI binary, invoke it as a subprocess — do not
  link it into our code. Home: `https://github.com/bbc/audiowaveform`.
- **waveform-data.js (BBC)** — companion JS lib for rendering the `.dat`
  JSON that audiowaveform emits. LGPL-3.0. Safe for browser-side preview
  rendering. Home: `https://github.com/bbc/waveform-data.js`.
- **librosa** — ISC license. Python audio analysis (onset detection, beat
  tracking, MFCCs, resampling). Suitable if we ever want automated
  "find the punchy moment" logic for a sting cut. Home:
  `https://github.com/librosa/librosa`.
- **Web Audio API polyfills** — the spec is broadly implemented; a polyfill
  is rarely needed on current evergreen browsers. If targeting Node-side
  rendering, `node-web-audio-api` (MIT) or `web-audio-engine` (MIT) are the
  usual candidates; both are permissive and embeddable.

## Recommended default stack if/when we build the reel pipeline

1. **Source:** Pixabay Audio API (no-attribution default) + Freesound CC0
   subset as secondary. Skip CC-BY sources until a credits-manifest feature
   exists in the bundle format.
2. **Processing:** ffmpeg (LGPL build, dynamic link, Opus/FLAC/MP3 output) for
   trimming, loudness normalization (EBU R128 via `-af loudnorm`), and
   fade-in/out.
3. **Preview artifact:** audiowaveform → `.json` → waveform-data.js in the
   browser preview (keep the GPL tool behind a CLI boundary).
4. **Analysis (optional):** librosa for onset/beat detection when auto-cutting
   stings from a longer track.
5. **Bundle manifest:** emit a `credits.json` / `ATTRIBUTIONS.md` sidecar in
   the bundle for any non-CC0 audio, with title, author, source URL, license
   SPDX id, and license URL. Enforce in CI that every audio asset has either
   an SPDX CC0-1.0 / Pixabay tag or a matching credits entry.
