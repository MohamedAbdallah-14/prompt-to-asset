---
wave: 2
role: deep-dive
slug: 34-installable-skills-survey/audio-tts-skills
title: "Audio, TTS, and Voice Synthesis — Installable Skills Survey"
date: 2026-04-20
scope: "Claude Code, Cursor, Codex, Windsurf, Gemini CLI"
---

# Audio, TTS, and Voice Synthesis — Installable Skills Survey

Research into the full landscape of installable audio/TTS/voice skills for AI coding assistants as of April 2026. Covers official ElevenLabs products, community skills, multi-provider plugins, and music generation tools.

> **Updated 2026-04-21:** ElevenLabs Eleven v3 (`eleven_v3`) is now the flagship TTS model, supporting 70+ languages with Audio Tags ([whispers], [sighs], [shouts]) for expressive delivery and a 68% reduction in errors on complex text. The `eleven_flash_v2_5` model costs 0.5 credits/character (effectively 20,000 characters/month on the free 10k credit plan, not 10,000). Free tier still has no commercial usage rights. The ElevenLabs MCP server is MCP spec 2025-11-25 compliant; SSE transport is deprecated but backward-compatible until 30 June 2026.

---

## 1. elevenlabs/elevenlabs-mcp (1,300 stars) — Official MCP Server

**Repo:** https://github.com/elevenlabs/elevenlabs-mcp  
**Type:** Python MCP server (`pip install elevenlabs-mcp`)  
**Stars:** ~1,300

### Capabilities

The most comprehensive audio MCP server in the ecosystem. Exposes 22 tools across six capability clusters:

**Text-to-Speech**
- `text_to_speech(text, voice_name?, voice_id?, model_id?, stability, similarity_boost, style, use_speaker_boost, speed, language, output_format)` — primary TTS tool; supports stability/style/similarity controls per-generation

**Speech-to-Text**
- `speech_to_text(input_file_path, language_code?, diarize, save_transcript_to_file, return_transcript_to_client_directly, output_directory?)` — uses `scribe_v1` model; diarization (speaker identification) is a first-class param

**Sound Effects**
- `text_to_sound_effects(text, duration_seconds, output_directory?, output_format?, loop?)` — 0.5–5 second clips only

**Voice Tools**
- `search_voices(search?, sort, sort_direction)` — filters account library
- `get_voice(voice_id)` — single voice detail
- `search_voice_library(page, page_size, search?)` — shared community library
- `list_models()` — all available ElevenLabs TTS models
- `voice_clone(name, files, description?)` — IVC (instant voice clone) from audio file list
- `speech_to_speech(input_file_path, voice_name)` — voice conversion
- `text_to_voice(voice_description, text?)` — generate voice previews from text description; returns multiple candidates
- `create_voice_from_preview(voice_id, ...)` — save a preview as permanent voice
- `isolate_audio(input_file_path, output_directory?)` — background noise removal

**Music**
- `compose_music(prompt?, output_directory?, composition_plan?, music_length_ms?)` — text-to-music; ElevenLabs Music model
- `create_composition_plan(prompt, music_length_ms?, source_composition_plan?)` — structured music spec before generation

**Conversational AI (ConvAI)**
- `create_agent(name, first_message, system_prompt, voice_id, language, llm, temperature, ...)` — build a voiced conversational agent
- `add_knowledge_base_to_agent(agent_id, ...)` — attach knowledge
- `list_agents()`, `get_agent(agent_id)` — manage agents
- `list_conversations(agent_id?)`, `get_conversation(conversation_id)` — inspect transcripts
- `make_outbound_call(agent_id, agent_phone_number_id, to_number)` — trigger a phone call from an agent (Twilio or SIP)
- `list_phone_numbers()` — account phone inventory

**Utility**
- `play_audio(input_file_path)` — plays a file through system audio; useful for previewing generated assets
- `check_subscription()` — read current credit balance (free to call)

### Models & Voices

Models (enumerated via `list_models()`): `eleven_multilingual_v2`, `eleven_turbo_v2`, `eleven_flash_v2_5`, `eleven_monolingual_v1`, `scribe_v1` (STT only). For music generation, the server calls the ElevenLabs Music API.

Voices: the account's full voice library plus the shared community library (~5,000+ voices). Default voice: `cgSgspJ2msm6clMCkdW9`. Built-in voices include Rachel, George, Adam, Sarah, etc.

### Install Method

**Claude Desktop / Cursor / Windsurf (via MCP config):**
```json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "uvx",
      "args": ["elevenlabs-mcp"],
      "env": { "ELEVENLABS_API_KEY": "your_key" }
    }
  }
}
```

**Python install:**
```bash
pip install elevenlabs-mcp
python -m elevenlabs_mcp --api-key=YOUR_KEY --print
```

**Smithery (one-command):**
```bash
npx -y @smithery/cli install elevenlabs-mcp --client claude
```

### API Key & Env Vars

| Var | Required | Purpose |
|---|---|---|
| `ELEVENLABS_API_KEY` | Yes | All API calls |
| `ELEVENLABS_MCP_BASE_PATH` | No | Where files land (default: `~/Desktop`) |
| `ELEVENLABS_MCP_OUTPUT_MODE` | No | `files` (default), `resources`, or `both` |
| `ELEVENLABS_DEFAULT_VOICE_ID` | No | Override default voice |
| `ELEVENLABS_API_RESIDENCY` | No | EU residency endpoint |

### Free Tier

10,000 characters/month. `check_subscription()` returns current balance before any generation call.

### Output Formats

Default: `mp3_44100_128`. The `output_format` param on `text_to_speech` and `text_to_sound_effects` accepts: `mp3_44100_64`, `mp3_44100_128`, `mp3_44100_192`, `pcm_16000`, `pcm_22050`, `pcm_24000`, `pcm_44100`, `ulaw_8000`.

### Cost Warnings

The server wraps every API-calling tool with a docstring `⚠️ COST WARNING`. Read-only tools (`check_subscription`, `list_models`, `search_voices`, `list_agents`) are annotated `readOnlyHint: true`.

---

## 2. elevenlabs/plugins — Official Claude Code Plugins (4 stars)

**Repo:** https://github.com/elevenlabs/plugins  
**Type:** Claude Code plugin (two separate plugins: `stt` and `tts`)  
**Stars:** ~4

### Plugin: elevenlabs-stt (Speech-to-Text input)

The STT plugin turns Claude Code into a voice-input terminal. It runs a background daemon that intercepts a global hotkey and transcribes speech into text, which is injected into the active input.

**Capabilities:** STT input only — spoken commands become typed text in Claude Code's prompt field.

**Install:**
```bash
claude plugin marketplace add elevenlabs/claude-plugins
claude plugin install elevenlabs-stt
```

**Commands:**
- `/elevenlabs-stt:setup` — check Python, install deps (uv/pip), set API key, configure preferences
- `/elevenlabs-stt:start` — start background daemon
- `/elevenlabs-stt:stop` — stop daemon
- `/elevenlabs-stt:status` — check daemon health
- `/elevenlabs-stt:config` — change preferences post-setup

**Config options (set during setup):**
- Transcription mode: `batch` (record → transcribe on stop) or `streaming` (realtime)
- Activation mode: `toggle` (press once to start, again to stop) or `push-to-talk` (hold)
- Default hotkey: `Ctrl+Shift+Space` (customizable)
- Sound effects: on/off (audio feedback when recording starts/stops)

**API Key:** `ELEVENLABS_API_KEY` env var or `~/.claude/plugins/elevenlabs-stt/config.toml`

**Free tier:** Yes — uses the same 10k char/month ElevenLabs credit pool (STT uses character-based billing)

**Output format:** Transcribed text injected into Claude Code prompt; no audio file saved

---

### Plugin: elevenlabs-tts (Text-to-Speech output)

Reads Claude's responses aloud automatically. Runs a daemon that hooks into Claude Code's stop event, extracts text from responses, and plays audio via the system audio stack.

**Capabilities:** TTS output — Claude's responses narrated in real time.

**Install:** Same marketplace, then `claude plugin install elevenlabs-tts`

**Commands:**
- `/elevenlabs-tts:setup` — full guided setup
- `/elevenlabs-tts:start`, `/elevenlabs-tts:stop`, `/elevenlabs-stt:status`, `/elevenlabs-tts:config`

**Config options:**
- Voice selection (default: Rachel)
- Auto-read: on (all responses) or off (manual trigger only)
- Skip code blocks: yes (says "[code block]") or no (reads code aloud)

**Hotkeys (runtime):**
- `Ctrl+Shift+T` — toggle auto-read on/off
- `Ctrl+Shift+P` — pause/resume current playback
- `Ctrl+Shift+S` — skip current utterance

**Personality / CLAUDE.md instructions:** The `CLAUDE.md` in the plugins repo instructs Claude to emit invisible `---VOICE---...---END VOICE---` blocks in responses. The daemon extracts these for playback. Simple conversational responses get voice-only output; technical responses (code, tables) get full written output plus a spoken summary. ElevenLabs emotion tags (`[laughs]`, `[light chuckle]`) are supported.

**API Key:** `ELEVENLABS_API_KEY` env var or `~/.claude/plugins/elevenlabs-tts/config.json`

**Output format:** Audio played via system player (`afplay` on macOS, `mpv`/`ffplay` on Linux, PowerShell on Windows). No file saved by default.

---

## 3. The `elevenlabs` Skill — Locally Installed

**Location:** `/Users/mohamedabdallah/.claude/skills/elevenlabs/`  
**Source:** Installed in this session's environment (author: `sanjay3290`, Apache-2.0)  
**Type:** Claude Code skill (SKILL.md + Python script, no MCP)

This is the skill that appears in the system prompt's available skills list. It is distinct from the official ElevenLabs MCP server and the official plugins.

### Capabilities

- **Single-voice TTS** from text or document (PDF, DOCX, Markdown, TXT)
- **Two-host conversational podcast generation** — Claude writes a JSON dialogue script, the skill renders each segment with a different voice, ffmpeg concatenates into a single MP3
- **Voice listing** — enumerate account voices

### SKILL.md Trigger Phrases

```
"create podcast", "generate podcast", "podcast from document"
"narrate document", "narrate this file", "read aloud"
"text to speech", "TTS", "convert to audio"
"audio from document", "audio version of"
```

### Commands (scripts/elevenlabs.py)

```bash
# List voices
python skills/elevenlabs/scripts/elevenlabs.py voices [--json]

# Single-voice TTS
python skills/elevenlabs/scripts/elevenlabs.py tts \
  --text "Hello world" --output ~/Downloads/hello.mp3
python skills/elevenlabs/scripts/elevenlabs.py tts \
  --file doc.pdf --voice VOICE_ID --output out.mp3

# Two-host podcast from JSON script
python skills/elevenlabs/scripts/elevenlabs.py podcast \
  --script /tmp/script.json --output ~/Downloads/podcast.mp3
```

The script handles sentence-boundary chunking (~4000 chars per API call), per-chunk TTS with voice continuity settings, and `ffmpeg` concatenation. Document extraction uses `PyPDF2` and `python-docx`.

### Config

`skills/elevenlabs/config.json`:
```json
{
  "api_key": "...",
  "default_voice": "JBFqnCBsd6RMkjVDRZzb",
  "default_model": "eleven_multilingual_v2",
  "podcast_voice1": "JBFqnCBsd6RMkjVDRZzb",
  "podcast_voice2": "EXAVITQu4vr4xnSDxMaL"
}
```

Only `api_key` is required (or `ELEVENLABS_API_KEY` env var). Dependencies: `pip install PyPDF2 python-docx` + `ffmpeg` in PATH.

### Output

MP3 files saved to `~/Downloads/` by default. Default model: `eleven_multilingual_v2`. Default voice: George (`JBFqnCBsd6RMkjVDRZzb`).

---

## 4. idanbeck/claude-skills — eleven-labs-skill (7 stars)

**Repo:** https://github.com/idanbeck/claude-skills/tree/main/eleven-labs-skill  
**Type:** Python CLI skill (SKILL.md + Python script)  
**Language:** Python (97.6% of repo)

### Capabilities

More granular than the locally installed `elevenlabs` skill. Exposes the ElevenLabs SDK surface more directly:

| Command | What it does |
|---|---|
| `setup <api_key>` | Validate key, store in `config.json`, list available voices |
| `voices [--category]` | List voices, optionally filtered by category |
| `speak <text> [--voice] [--model] [--file]` | TTS from text; voice by name or ID |
| `clone <name> <files> [--description]` | IVC (instant voice clone) from 1–3 min samples |
| `sfx <description> [--duration]` | Sound effect generation from text (0.5–5s) |
| `models` | List all TTS models |
| `history [--limit]` | Generation history (text, voice, date, char count) |
| `delete-voice <voice_id>` | Remove a cloned voice |

### Install

```bash
pip3 install elevenlabs
```

Place skill in `~/.claude/skills/eleven-labs-skill/`. API key via setup command or `ELEVENLABS_API_KEY`.

### Output

All commands return JSON. Audio saves to `~/.claude/skills/eleven-labs-skill/output/` as timestamped MP3 files. Metadata JSON alongside each file includes status, path, text, voice_id, model.

### Free Tier

Yes — same ElevenLabs 10k char/month free tier.

---

## 5. idanbeck/claude-skills — suno-skill (7 stars)

**Repo:** https://github.com/idanbeck/claude-skills/tree/main/suno-skill  
**Type:** Python + Playwright browser automation skill  
**Requires:** Python 3.9+, `pip install playwright`, `playwright install chromium`

### Capabilities

Full song generation (vocals + instrumentals) via Suno.com. Uses browser automation because Suno has no public API.

| Command | What it does |
|---|---|
| `login` | One-time visible browser login; saves session |
| `create "PROMPT" [--style "STYLE"] [--instrumental] [--output DIR] [--wait N]` | Generate 2 song variations |
| `download "URL" [--output DIR]` | Download a specific song by Suno URL |
| `list [--limit N]` | Show recent creations |

**Limitations:** Suno blocks scripted click-and-download; this skill works around it via Playwright browser automation. The `fltman/claude-code-suno-musicgen-skill` repo explicitly documents that Suno blocks scripted create/download, making browser automation the only viable path.

### API Key

None — authenticate with Google/Discord/Apple account via visible browser. Session persists via Playwright storage state.

### Output

JSON with song title, Suno URL, CDN audio URL, local file path, duration, style. Audio downloaded to `./output/` as MP3.

### Free Tier

Suno free: 10 generations/day (50 songs/month). Pro: 500/month ($10/mo). Premier: 2000/month.

---

## 6. idanbeck/claude-skills — fal-music-skill (7 stars)

**Repo:** https://github.com/idanbeck/claude-skills/tree/main/fal-music-skill  
**Type:** Python CLI skill (SKILL.md + Python script)  
**Trigger:** "create music", "generate music", "make music", "songs", "audio", "melodies", "tracks", "beats"

### Capabilities

Text-to-music via three models on fal.ai. No browser automation — proper API access.

### Models

| Model ID | Quality | Max Duration | Approx Cost | Best For |
|---|---|---|---|---|
| `stable-audio` (Stable Audio Open) | Good | 47s | ~free tier | Loops, SFX, short clips |
| `stable-audio-25` (Stable Audio 2.5) | Excellent | 190s | ~$0.20/gen | Full tracks, high quality |
| `beatoven` (Beatoven Maestro) | Best | 150s | Varies | Composed songs |

### Command

```bash
python3 ~/.claude/skills/fal-music-skill/fal_music_skill.py generate "PROMPT" \
  [--model stable-audio-25] [--duration 60] [--steps N] \
  [--guidance G] [--creativity 1-20] [--negative-prompt N] \
  [--seed S] [--output path] [--timeout 300]
```

`--negative-prompt` only works on Beatoven (others ignore it). `--guidance` only on `stable-audio-25`.

### API Key

`FAL_KEY` env var or `config.json`. Shares key with fal-video-skill if already configured.

### Output

WAV files saved to `~/.claude/skills/fal-music-skill/output/`. JSON includes model, file path, CDN URL, duration, prompt.

---

## 7. mbailey/voicemode (1,100 stars)

**Repo:** https://github.com/mbailey/voicemode  
**Type:** MCP server + Claude Code plugin  
**Stars:** ~1,100

### Capabilities

Bidirectional voice conversation with Claude Code. The most mature two-way voice solution in the ecosystem.

- **STT:** Whisper.cpp (local, offline) or OpenAI Whisper API
- **TTS:** Kokoro (local, offline, multiple voices) or OpenAI TTS API
- **Smart silence detection** — stops recording automatically when you stop speaking
- **Works fully offline** — Whisper.cpp + Kokoro require no API keys

### Install (Claude Code Plugin — recommended)

```bash
claude plugin marketplace add mbailey/voicemode
claude plugin install voicemode@voicemode
/voicemode:install   # installs CLI + local voice services
/voicemode:converse  # start talking
```

### Install (MCP server)

```bash
uvx voice-mode-install
claude mcp add --scope user voicemode -- uvx --refresh voice-mode
```

### API Key

`OPENAI_API_KEY` optional — only needed for OpenAI cloud services. Fully functional without any key using local services.

### Platforms

Linux, macOS, Windows (WSL), NixOS. Python 3.10–3.14.

### Output

Real-time audio through system speakers. No files saved; conversation is transient.

### Free Tier

Unlimited if using local services (Whisper.cpp + Kokoro). OpenAI-backed operation billed per character.

---

## 8. MatiousCorp/claude-tts (24 stars)

**Repo:** https://github.com/MatiousCorp/claude-tts  
**Type:** Claude Code plugin (multi-provider TTS)  
**Stars:** 24

### Capabilities

Auto-reads every Claude response aloud via any of 11 TTS providers. The broadest provider coverage of any TTS plugin.

### Providers

| Provider | API Key Required | Free Tier | Default Voice | Default Model |
|---|---|---|---|---|
| ElevenLabs | Yes | 10k chars/mo | Rachel | `eleven_flash_v2_5` |
| OpenAI | Yes | No | alloy | `tts-1` |
| Google Cloud | Yes | Limited | en-US-Neural2-F | — |
| Amazon Polly | Yes | Limited | — | — |
| Azure Speech | Yes | Limited | — | — |
| Fish Audio | Yes | — | — | — |
| Edge TTS | No (pip) | Full free | — | — |
| Kitten TTS | No (pip+espeak) | Full free | — | — |
| Gemini TTS | API key | Limited free | — | — |
| MiMo TTS | API key | Limited free | — | — |
| Local system TTS | No | Full free | — | — |

### Install

```bash
claude plugin install claude-tts
# or manual: clone to ~/.claude/plugins/claude-tts
```

### Setup

```bash
/claude-tts:tts-setup <provider> <api-key>
```

After setup, TTS fires automatically on every Claude response. Audio played via `afplay` (macOS), `mpv`/`ffplay` (Linux), PowerShell (Windows).

### Free/Zero-Key Path

Edge TTS (`pip install edge-tts`) works immediately with no API key. Covers all languages.

---

## 9. paulpreibisch/AgentVibes (136 stars)

**Repo:** https://github.com/paulpreibisch/AgentVibes  
**Type:** npm package + Claude Code hooks  
**Stars:** 136

### Capabilities

Professional TTS acknowledgments triggered at task start and task completion. Designed for ambient audio feedback during long coding sessions, not for reading responses aloud.

- 50+ professional AI voices via Piper TTS (local, open-source, offline)
- sox audio effects: reverb, EQ, pitch shifting
- ffmpeg background music mixing
- Task start/stop hooks automatically trigger voice acknowledgments

### Install

```bash
npx agentvibes install
```

Node.js 16+ required. Python 3.10+ for Piper TTS engine. `sox` and `ffmpeg` optional (for effects).

### API Key

None — fully open-source. All voices are local Piper TTS models.

### Commands

- `npx agentvibes install` — install
- `/agent-vibes:switch Aria` — switch voice via slash command
- MCP: "Switch to Aria voice"

### Output

WAV → sox effects → mixed with optional background music → system audio. 100% local.

### Free Tier

Entirely free. Apache 2.0 license.

---

## 10. TwinPeaksTownie/Claude-to-Speech (13 stars)

**Repo:** https://github.com/TwinPeaksTownie/Claude-to-Speech  
**Type:** Claude Code plugin (ElevenLabs TTS auto-reader)  
**Stars:** 13

### Capabilities

Claude's responses auto-narrated via ElevenLabs. Uses invisible HTML comment markers (`<!-- TTS: "..." -->`) in Claude's output rather than voice blocks, similar to but independent of the official elevenlabs-tts plugin.

- Smart defaults: code-heavy responses stay silent; conversational responses are spoken
- Deduplication (2-second window prevents repeated messages)
- Supports custom ElevenLabs voice IDs
- Local TTS server mode for multi-device setups

### Install

```bash
# Claude Code plugin install
claude plugin install
# Or manual: clone → cp to Claude plugins directory → create .env
```

### Trigger

`/speak` or `/claude-to-speech:speak`. Stop hook fires automatically at response completion.

### API Key

ElevenLabs API key mandatory. `requests` Python library required.

### Output

Platform audio: `afplay` (macOS), `mpg123`/`aplay` (Linux), `winsound` (Windows).

---

## 11. SamurAIGPT/Generative-Media-Skills (3,000 stars)

**Repo:** https://github.com/SamurAIGPT/Generative-Media-Skills  
**Type:** npm skill package + MCP server (`muapi`)  
**Stars:** ~3,000

### Audio/Music Capabilities

- `muapi_audio_create` — text-to-music via Suno (with working API access, not browser automation)
- `muapi_audio_from_text` — text-to-sound via MMAudio

### Install

```bash
npx skills add SamurAIGPT/Generative-Media-Skills --all
# or for specific agents:
npx skills add SamurAIGPT/Generative-Media-Skills --all -a claude-code -a cursor
```

### API Key

`muapi-cli` requires an API key from https://muapi.ai/dashboard. Configure: `muapi auth configure --api-key "KEY"`.

### MCP Mode

```bash
muapi mcp serve  # exposes all 19 tools to Claude Desktop/Cursor via MCP
```

### Output

JSON with `--output-json` flag plus download URLs. `--download` flag auto-fetches audio locally. Agent-friendly: semantic exit codes, JQ filtering.

---

## 12. vapagentmedia/vap-media-skill (1 star)

**Repo:** https://github.com/vapagentmedia/vap-media-skill  
**Type:** Single SKILL.md (cross-platform)

### Audio Capability

Music generation via Suno V5 model. Free mode is image-only; music requires full mode with API key from vapagent.com.

### Install

Copy `SKILL.md` to appropriate location:
- Claude Code: `~/.claude/skills/vap-media.md`
- Codex CLI: `~/.codex/skills/vap-media.md`
- Gemini CLI: `~/.gemini/skills/vap-media.md`

---

## 13. punt-labs/vox (0 stars, notable)

**Repo:** https://github.com/punt-labs/vox  
**Type:** Python CLI + MCP server

Multi-provider voice synthesis CLI. Supports ElevenLabs, AWS Polly, and OpenAI TTS via a single command surface. Useful as a reference implementation for provider-agnostic TTS routing.

---

## Summary Table — All Audio Skills

| Name | Type | TTS | STT | Music | Voice Clone | SFX | Install | API Key | Free Path | Output |
|---|---|---|---|---|---|---|---|---|---|---|
| **elevenlabs-mcp** | MCP server | Yes | Yes | Yes | Yes | Yes | pip + config | ElevenLabs | 10k chars/mo | MP3/PCM/WAV |
| **elevenlabs-stt plugin** | Claude plugin | No | Yes (input) | No | No | No | `/plugin install` | ElevenLabs | 10k chars/mo | Text (injected) |
| **elevenlabs-tts plugin** | Claude plugin | Yes (auto) | No | No | No | No | `/plugin install` | ElevenLabs | 10k chars/mo | System audio |
| **elevenlabs skill** (local) | SKILL.md + Python | Yes | No | No | No | No | Manual | ElevenLabs | 10k chars/mo | MP3 file |
| **eleven-labs-skill** (idanbeck) | SKILL.md + Python | Yes | No | No | Yes | Yes | Manual | ElevenLabs | 10k chars/mo | MP3 file |
| **suno-skill** (idanbeck) | SKILL.md + Playwright | No | No | Yes (full songs) | No | No | Manual | None (browser login) | 10 gen/day free | MP3 file |
| **fal-music-skill** (idanbeck) | SKILL.md + Python | No | No | Yes (instrumental) | No | No | Manual | FAL_KEY | Stable Audio Open free | WAV file |
| **voicemode** | MCP + plugin | Yes | Yes | No | No | No | Plugin/pip | Optional (OpenAI) | Full free (local) | System audio |
| **claude-tts** (MatiousCorp) | Claude plugin | Yes (auto) | No | No | No | No | Plugin | Varies by provider | Edge TTS (free) | System audio |
| **AgentVibes** | npm + hooks | Yes | No | No | No | No | npx | None | Fully free (local) | System audio |
| **Claude-to-Speech** | Claude plugin | Yes (auto) | No | No | No | No | Plugin | ElevenLabs | 10k chars/mo | System audio |
| **Generative-Media-Skills** | npm + MCP | No | No | Yes (Suno via API) | No | Yes | npx | muapi.ai key | No | MP3 (download) |
| **vap-media-skill** | SKILL.md | No | No | Yes (Suno V5) | No | No | Copy file | vapagent.com key | Image only free | MP3 |

---

## Landscape Analysis — Should prompt-to-asset Add Audio Skills?

### The gap is real but narrow for this project's scope

prompt-to-asset is a *software asset pipeline* — logos, app icons, favicons, OG images, illustrations, splash screens. Audio is adjacent but not core. The question is whether audio falls within the natural expansion radius of "software assets a developer needs when building a product."

The answer is: **yes, for a specific subset**.

### Audio assets a software product actually needs

1. **Notification sounds** — short (0.5–3s) audio cues for alerts, success, error, ping. Every mobile and desktop app ships these.
2. **App intro/splash audio** — short branded audio played at launch (common in games, branded apps).
3. **UI feedback sounds** — click, swipe, transition sounds (especially for games and rich UI).
4. **Brand voice / voiceover** — narration for onboarding flows, accessibility, video previews.
5. **Podcast/documentation narration** — convert technical docs or changelogs to audio.

The locally installed `elevenlabs` skill already handles cases 4 and 5. Case 1–3 are unaddressed.

### What the landscape shows

**TTS auto-readers** (elevenlabs-tts plugin, claude-tts, AgentVibes, Claude-to-Speech) are *developer experience* tools — they read Claude's output aloud during coding sessions. These are not software asset generation tools. They solve a different problem and have no place in prompt-to-asset's pipeline.

**Music generators** (suno-skill, fal-music-skill, vap-media-skill, Generative-Media-Skills) produce full songs. Useful for game background music or app demo videos, but they are far outside the "software asset" definition — they require style direction, BPM, genre knowledge, and have no platform packaging analog to iOS AppIconSet.

**The elevenlabs-mcp** is the only tool that squarely hits the "short software asset audio" use case via `text_to_sound_effects` (0.5–5s clips) and via `text_to_speech` for voiceover. Its 22-tool surface is mature, well-annotated, and already installable by any developer who has an ElevenLabs key.

**voicemode** is the best two-way voice conversation tool and works offline. Irrelevant to asset generation.

### Recommended additions to prompt-to-asset

**Add: `audio-gen` skill (priority 2)**

Scope: short notification/UI sounds and voiceover only. Not music, not full songs.

- Route `text_to_sound_effects` for <= 5s clips (notification sounds, UI sounds)
- Route `text_to_speech` for voiceover/narration > 5s
- Provider: elevenlabs-mcp (primary) or fal.ai ElevenLabs endpoint (secondary)
- Free path: ElevenLabs 10k char/month free tier
- Output: MP3, with file naming conventions matching the asset bundle (`notification-success.mp3`, `notification-error.mp3`, etc.)
- Validation: duration within platform spec (iOS max notification sound: 30s; Android: custom)

**Do not add:**
- TTS auto-readers (wrong problem domain)
- Music generators (too far outside scope; no platform packaging analog)
- Voice cloning (no software asset use case)

### Trigger phrases for `audio-gen` skill

```
"notification sound", "app sound", "UI sound", "click sound", "error sound",
"success sound", "alert sound", "brand audio", "voice over", "narrate",
"read aloud", "audio asset", "sound effect for app"
```

### Implementation note

The elevenlabs-mcp is already installable as-is (22 tools, mature, 1,300 stars). The `audio-gen` *skill* would be a thin SKILL.md wrapper that routes the user's brief to the correct MCP tool (`text_to_sound_effects` vs `text_to_speech`) based on duration target and asset type, applies the correct output format, and validates duration and format before handing off. The MCP server does the generation; the skill provides the asset-pipeline framing (asset classification, trigger detection, output naming, validation).

**External sources for users without an ElevenLabs key:**
- Freesound.org (Creative Commons library, manual)
- Zapsplat.com (free registration)
- BBC Sound Effects (free for personal/commercial use)
- No current installable skill covers zero-key short sound generation (all generators require an API key for SFX)

---

## Key Files in This Environment

- `/Users/mohamedabdallah/.claude/skills/elevenlabs/SKILL.md` — locally installed elevenlabs skill definition
- `/Users/mohamedabdallah/.claude/skills/elevenlabs/scripts/elevenlabs.py` — 596-line implementation (TTS + podcast)
- `/Users/mohamedabdallah/.claude/skills/elevenlabs/scripts/extract.py` — document text extraction helper
