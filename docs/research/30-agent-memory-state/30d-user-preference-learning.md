# 30d — User Preference Learning

## What "Preference Learning" Actually Means Here

For prompt-to-asset, preference learning is not RLHF and not fine-tuning. It is: tracking which provider/mode/style the user accepted, which they rejected, and using that history to bias future routing decisions. The signal is binary (kept vs discarded) with optional written feedback ("too cartoonish," "wrong green").

That's a simple frequency table, not a neural policy — and that's the right level of complexity for a local MCP server with no training infrastructure.

---

## The Signal Types Available

**Implicit signals** (inferred without asking):
- User calls `asset_ingest_external` after generating with a specific provider → they used that provider → not a rejection
- User generates three variants and saves only one → the saved one's parameters are preferred
- User regenerates immediately after accepting → the accepted output wasn't good enough

**Explicit signals** (user states a preference):
- "I prefer Recraft over gpt-image-1 for icons"
- "Always use inline_svg for logos in this project"
- Thumbs-up/down in a host UI if the host supports it

**Outcome signals** (downstream validation):
- Asset passes all tier-0 checks → positive signal for that provider/mode combination
- Asset fails alpha check or checkerboard FFT → negative signal (also a routing bug to fix)

---

## How Current Research Handles This

**PAHF (Personalized Agents from Human Feedback, arXiv 2602.16173, Meta 2026)**

Three-step loop: pre-action clarification → action grounded in retrieved preferences → post-action feedback integrated into memory. The agent asks before acting when uncertain, acts, then updates its memory based on the user's reaction. Reported result: substantially faster personalization than no-memory baselines with rapid adaptation to preference drift.

The key pattern: preferences are stored as explicit text in memory ("user prefers transparent PNG with drop shadow") not as latent embeddings. Retrieval is semantic search over those text entries.

**Mem0 Production Architecture (arXiv 2504.19413)**

Mem0 extracts preference facts from conversation transcripts using a secondary LLM call. E.g., "I hate that checkerboard" → stored as "user strongly prefers genuine transparent PNG output." The extraction step converts implicit signal to explicit text.

This is the right model for a conversational MCP surface: the main LLM call generates assets; a cheap follow-up (or background) extraction step turns the conversation into stored preferences.

**Anthropic Prompt Caching as a Lightweight Preference Carrier**

Prompt caching (cache_control: ephemeral) with a 5-minute TTL (default as of March 2026) or 1-hour extended TTL (add `ttl: "1h"` at 2x write cost) keeps a large system prompt hot across repeated calls. If user preferences are bundled into the system prompt, they ride the cache for free on repeated calls within the TTL window.

This is not persistent memory — cache eviction loses the state. But for a power user making multiple asset requests in a single session, caching the full preference block (provider order, brand colors, style constraints) at the top of the system prompt gives near-zero retrieval latency with no storage infrastructure.

---

## Practical Preference Storage Schema

```sql
-- In ~/.prompt-to-asset/memory.db

CREATE TABLE preference_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  project_id TEXT,          -- NULL = global preference
  signal_type TEXT NOT NULL, -- 'explicit' | 'accept' | 'reject' | 'validation_fail'
  dimension TEXT NOT NULL,   -- 'provider' | 'mode' | 'style' | 'format'
  value TEXT NOT NULL,       -- e.g. 'recraft' | 'inline_svg' | 'flat_minimal'
  context TEXT              -- raw text of the preference statement if explicit
);

CREATE TABLE preference_summary (
  project_id TEXT,
  dimension TEXT,
  value TEXT,
  score REAL,               -- weighted recency-biased frequency
  last_updated INTEGER,
  PRIMARY KEY (project_id, dimension, value)
);
```

The summary table is rebuilt periodically (or on startup) by aggregating the log with exponential recency decay. The result is a ranked list per dimension: `provider → [recraft(0.9), gpt-image-1(0.4), ideogram(0.2)]`.

---

## What Not To Do

Do not try to learn style preferences from image embeddings without an embedding model infrastructure. The complexity-to-value ratio is poor for a local tool. Text-based preference extraction (cheap LLM call over the conversation) is sufficient.

Do not overfit to recent signals. A single rejection of `gpt-image-1` on a bad prompt should not permanently blacklist it. Use a decayed score, not a hard ban.

Do not silently apply learned preferences without surfacing them. Tell the user "Based on your history, routing to Recraft. Override with `provider: 'gpt-image-1'`." Unexplained behavior is worse than no personalization.

## Sources

- [PAHF: Learning Personalized Agents from Human Feedback](https://arxiv.org/abs/2602.16173)
- [Mem0 Production Memory Paper](https://arxiv.org/abs/2504.19413)
- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic TTL Change Analysis](https://dev.to/whoffagents/anthropic-silently-dropped-prompt-cache-ttl-from-1-hour-to-5-minutes-16ao)
- [Reinforcement Learning from User Feedback](https://arxiv.org/pdf/2505.14946)
