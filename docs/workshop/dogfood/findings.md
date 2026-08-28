---
type: prototype-findings
description: Dogfood round 1 asks whether a payload derived from the config lets an agent write a conformant file first time, and how much of config B is ceremony. Predictions registered; results pending.
---

# Dogfood round 1 — can an agent conform from the payload alone?

## What this round asks

Two questions, neither of which anything has tested.

**Goal 2.** Does a structured payload derived from the config actually let an agent write a
conformant file first time? Every argument for the JSON-only contract rests on that being true.

**Goal 1.** How much of config B's extra field set is ceremony rather than signal?

## The instrument

Six packs, one per cell of a 3 × 2 grid: Claude Code headless at two model sizes and Antigravity,
crossed with configs A and B. Every arm is replicated across all three Host harnesses.

Each pack holds the 14 faulty documents at their real paths, the baked `--check` payload, one baked
`--query` payload per document, and a prompt identical to the byte across all six. It holds no
config, no `src/`, no `fixtures/`, no tests, and no governed document that already passes — a
passing document is a worked answer.

Scoring is deterministic and computed by `scripts/dogfood-score.ts` from the pack and the hidden
config. Two scores are judged by a human instead, on the diff: `descriptionQuality` and
`reportHonesty`.

## What was measured before the runs

**A `git worktree` cannot host a blind exam.** Worktrees share `.git`, so
`git show feature/prototype:markdown-harness.config.yaml` prints the answer key from inside any of
them, and `git log -p` shows its introduction. Packs are therefore standalone `git init` directories
under `~/Developer/mh-dogfood/`, outside `~/Developer/markdown-harness`, whose `CLAUDE.md` would
otherwise auto-load `AGENTS.md` and name a frontmatter value the exam asks for.

**Config B demanded the impossible until `address.ts` was fixed.** A document with no frontmatter
block returned one instance for the raw address, so `verified[].by` was reported with the brackets
unresolved on a file with no `verified` list at all. Config B's own text says the opposite: the list
stays optional, and what is required is that an entry which exists says who. After the fix:

| config | before | after                                                          |
| ------ | ------ | -------------------------------------------------------------- |
| A      | 27     | 27 (byte-identical report; no nested violations to begin with) |
| B      | 54     | 31, and no remaining address contains a literal `[]`           |

**Round 1 exercises 1 of 18 outcome codes.** Every violation under both configs is
`MISSING_REQUIRED_FIELD`. The `fixtures/` corpus is the only thing that reaches the other 17, and 23
of its 25 bodies state their own diagnosis, so de-leaking it is real work. That is round 2.

**13 of the 14 faulty documents have no frontmatter block at all.** The exam is therefore "author
frontmatter from scratch", not "patch a typo" — which is also why the addressing defect surfaced
now.

**The fix turned exam B into a test of whether `--query` is load-bearing.** Post-fix, `check.json`
under config B names three fields; `query/` for the same document names nine.

| payload       | what it names for `docs/research/okf-conformance.md`                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `check.json`  | `description`, `type`, `sources`                                                                                                       |
| `query/…json` | `description`, `generated.at`, `generated.by`, `sources`, `sources[].id`, `sources[].resource`, `stale_after`, `type`, `verified[].by` |

So a run working from `check.json` alone cannot produce a conformant `sources` entry, and one that
reads `query/` can. Both payloads ship, and which one carried the work is recovered afterwards from
the residual violations rather than by withholding either.

## Pre-registered predictions

Written before any cell ran, so the experiment can fail.

1. **P1** — Exam A reaches green on at least one Host harness. Every field A requires is derivable
   from the document.
2. **P2** — Exam B reaches green on no Host harness without invention. `generated.by` and
   `generated.at` name facts absent from the corpus.
3. **P3** — `sources[].resource` is filled from real body URLs by the larger models and fabricated
   or left `TODO` by the smallest.
4. **P4** — `maxLength: 200` on `description` is respected everywhere. The constraint travels in the
   payload.
5. **P5** — At least one Host harness edits body prose despite the prompt forbidding it.
6. **P6** — On exam B, a run working from `check.json` alone writes `sources` entries missing `id`
   and `resource`; one that reads `query/` does not. This is the load-bearing test for `--query`,
   and it is visible directly in the residual violations.

## What round 1 cannot answer

- 17 of the 18 outcome codes. That is round 2.
- Whether an agent in a loop converges. This is one-shot by design.
- Whether the two configs differ in authoring effort rather than in what gets reported. Post-fix, B
  asks for only four more top-level violations than A.

## Results

The six cells have not been run. This section gets written from `scripts/dogfood-score.ts` output
and the two judged scores, and not before.
