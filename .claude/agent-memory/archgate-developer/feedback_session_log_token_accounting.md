---
name: session-log-token-accounting
description: Run token/cost figures come from session JSONL, not RESULTS.md, and must be deduped by requestId or they inflate 2-2.4x
metadata:
  type: feedback
---

Ablation run token and cost figures must be read from the Claude Code session
JSONL under `~/.claude/projects/-Users-han-Developer-ablation-runs-<run_id>/`,
deduped by `requestId` — take one row per `requestId`, never sum all rows.

**Why:** two independent failure modes, both silent.

1. `metrics.sh` emits token/cache/think-time figures only when a
   `.metrics-adapter.sh` exists in the run directory. No run has ever had one,
   so every `RESULTS.md` prints _"No adapter installed, so token, cache and
   think-time figures are unavailable"_. **There are no token or cost numbers in
   any RESULTS.md.** Reading the report and reporting "no data" is wrong; the
   data exists, just not there.
2. One API request writes many JSONL rows sharing a `requestId`, and every row
   repeats the _same cumulative_ `usage` object rather than an increment. Naive
   summing inflated the 2026-09-03 runs by 2.0x-3.2x (mh-1-fable-5: 256 rows /
   79 requests; mh-1-sonnet-5: 271 / 118; adr-ablation-1: 581 / 286).

**How to apply:** group usage rows by `requestId`, keep `.[0]`, then sum
`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
`output_tokens` separately — cache read is ~98% of token volume and the single
largest cost line, so collapsing the four into one "total tokens" hides the
whole cost story. Price cache write at 1.25x input and cache read at 0.10x
input; get per-model rates from the `claude-api` skill, never from memory
(Sonnet 5's $2/$10 intro rate expired 2026-08-31, so runs from 2026-09-03
onward bill at $3/$15).

Also check `isSidechain` — subagent spend lands in the same file and belongs in
the total. It was zero for all 2026-09-03 runs, which is itself worth
confirming rather than assuming.

Duration has the same shape of trap: `metrics.sh` computes `now - started`
_from inside the session_, so the RESULTS.md figure stops the clock when the
command ran, not when the run ended, and it silently includes idle time before
the agent's first move. Prefer the JSONL span from first event to last row
carrying `usage` — see [[reproduce-measurement-before-calling-drift]]. A log
whose file mtime is later than the run means the session was merely reopened;
compare the last _API call_ timestamp, not the last event.
