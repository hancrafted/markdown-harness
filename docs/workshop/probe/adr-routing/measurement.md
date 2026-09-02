# ADR routing probe — measurement

The phase-5 probe from issue #7 of the `define-archgate-adrs` map (#2). It answers whether scoping ADRs by
`paths:` glob actually delivers a small, targeted **Briefing** to an agent, and it does so against observed
behaviour rather than a computed model. Kept as raw material for workshop use.

|                |                                                     |
| -------------- | --------------------------------------------------- |
| Session        | `77b65a8d-7727-4cd5-937c-523c0097ae21`              |
| Date           | 2026-09-02                                          |
| Claude Code    | `2.1.236`                                           |
| Repo state     | pre-migration; `src/config/` still out of a Package |
| ADRs in corpus | 9                                                   |

## What was being tested

design-ADR 0002 records the load-bearing bet: that an ADR scoped by a `paths:` glob, with exactly one
**classifier** per file, means an agent that opens a file receives **only** the records governing that file.
`CONTEXT.md` names the same idea the **Steering query** — "asking what governs a path _before_ the file is
written, rather than checking it after. The reason this is a CLI and an MCP server rather than a set of lint
rules."

Phases 1–4 wrote and enforced the vocabulary. Nothing had ever measured the briefing half.

## The instrument

Not a hook. Claude Code already records every instruction-file load in the session transcript at
`~/.claude/projects/<slug>/<uuid>.jsonl`, as an `attachment` record of type `nested_memory`:

```json
{
  "type": "attachment",
  "attachment": {
    "type": "nested_memory",
    "path": ".../.archgate/adrs/ARCH-004-folders-and-files.md",
    "content": {
      "type": "Project",
      "globs": ["src/**/*"],
      "content": "<what was injected>",
      "rawContent": "<the file on disk>",
      "contentDiffersFromDisk": true
    }
  }
}
```

This beats an `InstructionsLoaded` hook on every axis that matters here: it needs no instrumentation, no
committed configuration and nothing to maintain; it is deterministic and `jq`-able; and it works
retroactively on sessions that have already happened.

Extraction query:

```bash
jq -r 'select(.type=="attachment" and .attachment.type=="nested_memory") |
  [ (.attachment.path|sub(".*markdown-harness/";"")),
    .attachment.content.type,
    (.attachment.content.content|length),
    (.attachment.content.rawContent|length),
    ((.attachment.content.globs // ["(nested traversal)"])|join(" "))
  ] | @tsv' "$TRANSCRIPT"
```

### What the record settles that the documentation does not

- **Symlinks.** `path` reports the **resolved** ADR under `.archgate/adrs/`, never the `.claude/rules/*.md`
  symlink that GEN-002 mandates. Mapping a load back to an ADR id is direct.
- **Size.** `content` is what entered context; `rawContent` is the file on disk. There is no token field
  anywhere in Claude Code for this — chars are exact, tokens below are `chars / 4` estimates. For exact
  tokens, feed `content` to the Claude API `count_tokens` endpoint.

## Method

Baseline first: the session had loaded **no** ADR, despite ~15 files already read — all read through Bash.
Then four files were opened with the **Read** tool, one per classifier position, in one session, in this
order, so each increment is attributable:

1. `src/packages/example/index.ts` — Package root entry point
2. `src/packages/example/lib/span.types.ts` — `.types`
3. `src/packages/example/lib/impl.pure.ts` — `.pure`
4. `src/packages/example/lib/impl.test.ts` — `.test`

The order matters. Because rules load once per session, the first read pays for the shared records and each
later read shows only its own marginal cost.

## Result

| loaded                   | memory type | injected | on disk | matched glob                |
| ------------------------ | ----------- | -------- | ------- | --------------------------- |
| `src/packages/CLAUDE.md` | Project     | 3,234    | —       | (nested traversal, no glob) |
| `GEN-003`                | Project     | 1,724    | 2,042   | `src/**/*`                  |
| `ARCH-004`               | Project     | 8,000    | 8,372   | `src/**/*`                  |
| `ARCH-005`               | Project     | 5,832    | 6,234   | `src/**/*.types.*`          |
| `ARCH-006`               | Project     | 6,575    | 6,977   | `src/**/*.pure.*`           |
| `ARCH-003`               | Project     | 6,341    | 6,679   | `**/*.test.ts`              |

Cost per position, each as a cold first read, against the whole 63,691-char corpus:

| position         | ADRs | injected chars | ~tokens | vs whole corpus |
| ---------------- | ---- | -------------- | ------- | --------------- |
| root entry point | 2    | 12,958         | ~3,240  | −81%            |
| `*.types.ts`     | 3    | 18,790         | ~4,700  | −72%            |
| `*.pure.ts`      | 3    | 19,533         | ~4,880  | −71%            |
| `*.test.ts`      | 3    | 19,299         | ~4,825  | −71%            |

All four positions touched in one session: **31,706 chars (~7,930 tokens), 5 ADRs, each loaded once.**

## Findings

1. **The routing is correct.** Every position received exactly its predicted record set, with no
   over-delivery. The bet pays: 71–81% less than handing over the corpus.

2. **Records load once per session, not once per read.** Opening `span.types.ts` added only `ARCH-005`;
   `ARCH-004` and `GEN-003` did not re-fire. So the cost is a **session** footprint, and the marginal cost of
   the second file sharing a record is zero. Any budget framed per-read is measuring the wrong thing.

3. **Frontmatter is stripped before injection.** Each ADR lands 318–402 chars smaller than on disk. A
   character budget read off the file overstates what an agent actually pays.

4. **A static model of the routing misses a real cost.** Computing expected loads from `paths:` frontmatter
   alone omits `src/packages/CLAUDE.md` — 3,234 chars that arrive by **nested traversal**, with no glob
   involved, on any read under `src/packages/`. That is larger than the frontmatter saving, so the honest
   figure is above the computed one, not below.

5. **Before this session, the `src/`-scoped records had never loaded. Not once.**

   | ADR        | `paths:`            | times ever loaded |
   | ---------- | ------------------- | ----------------- |
   | `GEN-001`  | `.archgate/adrs/**` | 4                 |
   | `GEN-002`  | `.archgate/adrs/**` | 3                 |
   | `ARCH-003` | `**/*.test.ts`      | **0**             |
   | `ARCH-004` | `src/**/*`          | **0**             |
   | `ARCH-005` | `src/**/*.types.*`  | **0**             |
   | `ARCH-006` | `src/**/*.pure.*`   | **0**             |
   | `GEN-003`  | `src/**/*`          | **0**             |

   Across every transcript in the project: **0** Read-tool calls targeting `src/`, against **129** Bash calls
   that `cat`/`sed`/`grep` a `src/` file. Injection triggers on Read-tool file access. `GEN-001` and
   `GEN-002` fired only because their globs point at `.archgate/adrs/**`, and ADRs do get opened with Read.

   Verified with text unique to the ADR rather than a keyword: `"Position decides the public surface"` also
   appears in `eslint.config.mjs`, so the check was re-run on `"are NOT classifiers"`, unique to `ARCH-004`.
   Its only attachment hit is `edited_text_file` — an agent **editing** the record, not being briefed by it.

## The fork this opens

Enforcement works — `archgate check` 16/16, eslint and dependency-cruiser holding every discipline. The
briefing half works mechanically, as measured above, but had never fired in practice, and the trigger
condition belongs to the **Host harness**, which the repo cannot legislate. Three responses:

- **Make the trigger fire** — instruct agents to use Read for `src/`. Gives up the token saving the
  Bash-reading habit buys, and it is an instruction of exactly the kind this measurement found being
  silently ignored for the project's whole history.
- **Concede briefing, keep enforcement** — the agent writes it wrong and `verify` says so. This gives up
  the Steering query, and `ARCH-004`'s stop protocol never reaches the agent at the moment it is guessing.
- **Deliver by a route independent of the Read tool** — a Steering query over the CLI or the MCP server,
  which is what `docs/vision/architecture.md` already names as the answer.

The third is the product's own thesis, which makes this finding evidence **for** `markdown-harness`,
gathered by dogfooding it.
