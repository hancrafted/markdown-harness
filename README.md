# markdown-harness

Governance for a markdown knowledge base that agents help maintain — so you can rely on documents
you did not write, cannot re-read, and have not checked in months.

Full trust in such a corpus is not achievable, and this does not claim it. What it does is narrower
and enough:

> **A document can tell you how much of itself to believe.**

## Status

**Pre-release. Nothing to install yet.** The config contract, the fixture corpus and its tests exist;
the CLI does not. Names and shapes in this README are derived and may still change.

| exists today                                     | not yet                              |
| ------------------------------------------------ | ------------------------------------ |
| The config contract (`src/config/`)              | The CLI — `init`, `check`, `steer`   |
| A 15-file fixture corpus and its tests           | The OKF Preset                       |
| The pinned OKF revision (`docs/okf/`)            | Index generation, scheduling, any UI |
| Product and architecture vision (`docs/vision/`) | A published package                  |

## The problem

A knowledge base maintained by agents degrades along a predictable path:

- **Volume outruns review.** Documents accumulate faster than anyone reads them.
- **Confidence outlives correctness.** A document says "decided" long after the decision moved. Prose
  carries no expiry, so age is invisible at the moment of reading.
- **Governance drifts while checks stay green.** This is the one that ends it — once a standard can be
  quietly relaxed, a passing check stops being evidence, and you stop believing any of it.

The corpus then gets abandoned rather than repaired, because nothing distinguishes the parts that were
still good.

## How it works

**One config declares what each path must carry.** Rules are an ordered list; for any file the first
match is the complete set of constraints, and a file no rule names is invisible. Governance is opt-in,
so a fresh install reports nothing on a corpus it has never seen.

```yaml
# markdown-harness.config.yaml
frontmatter:
  rules:
    - path: [docs/research/**/*.md]
      intent: Research is indexed, and an index entry copies the description
      fields:
        type: { presence: required, allowed: [{ value: research }] }
        description: { presence: required, maxLength: 200 }
        sources: { minItems: 1 }
```

**Every rule states its `intent` in the author's words**, and that sentence travels with any violation
it reports — so a failure says why the rule exists, not just which check fired.

**The steering query answers "what governs this path?" before the file exists.** That is the feature a
linter cannot offer, and the reason this is a command rather than a lint rule: an agent about to write
`docs/research/new.md` can ask what is expected of it first. `git check-attr` has worked this way for
years; this applies the same idea to a knowledge base.

**The signal lives in the file, not in our report.** A governed document carries its own trust state:

```markdown
---
type: research
description: Why the config language does not constrain key order.
generated: { by: human:han, at: 2026-08-26T09:00:00Z }
verified: { by: human:han, at: 2026-08-26T09:00:00Z }
stale_after: 2026-11-24T00:00:00Z
sources:
  - id: yaml-spec
    resource: https://yaml.org/spec/1.2.2/
---
```

An agent that opens this in December sees that `stale_after` has passed — **without running
markdown-harness, and whatever the body claims about itself.** Keeping those fields present and true
is the job; being in the read path is not.

## Why not an existing tool

The tools surveyed in [`docs/research/`](docs/research/) split cleanly, and neither half does this
job. Path-attached **schemas** have a field vocabulary but no way to compose across paths;
path-attached **settings** compose across paths but only set defaults and cannot assert anything.

| tool                               | why it does not fit                                                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remark-lint-frontmatter-schema`   | Closest existing tool. Maps schemas to globs with last-match-wins and no composition, so rules are silently dropped; AJV's raw errors mean a schema's own `description` never reaches the diagnostic |
| JSON Schema + AJV directly         | Subtractive by construction — Core §10.2 makes a sibling subschema unable to relax what another requires                                                                                             |
| markdownlint                       | Does not validate frontmatter: the block is stripped before parsing and handed to rules as an opaque string list                                                                                     |
| Obsidian Linter                    | A formatter, not a linter — rules are `string → string` with no violation type, and no path scoping                                                                                                  |
| Astro content collections          | Code as config, scoped to a collection name rather than a path; unknown keys are silently stripped                                                                                                   |
| Hugo `cascade` / Jekyll `defaults` | Default-setters, not constraint systems — neither can express a single negative assertion                                                                                                            |

This belongs to the **path-attached settings** family, not the schema family. If you read
"frontmatter schema" and pictured JSON Schema per directory, that is the wrong picture.

## Built on OKF

The frontmatter vocabulary is [Google's Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format),
chosen because v0.2 already makes provenance, trust, freshness and lifecycle first-class fields — which
is exactly what a trust signal needs, and not something worth inventing.

Two things to be clear about. OKF ships as a **Preset**: an ordinary config file with no privileged
status, which you can adopt, amend or ignore, and deleting it changes only which rules run. And OKF is
**pinned to a vendored revision** at [`docs/okf/`](docs/okf/), because upstream changes normative
content in place under a fixed version label and publishes no tags or releases — so the copy is the
pin. The product outlives any spec it carries.

## Words used here

| word              | meaning                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| **Host harness**  | The agentic CLI you already run — Claude Code, Codex, Antigravity                 |
| **Operator**      | Whoever writes the config. The only role that opens it                            |
| **Contributor**   | Whoever writes documents and never sees the config                                |
| **Rule**          | One entry in the ordered list: a path selector, an `intent`, and what it requires |
| **Governed file** | A file some rule matches. Everything else is invisible to the tool                |
| **Preset**        | A shipped config you can delete without changing behaviour                        |

"Harness" alone is ambiguous — the industry calls a host harness a harness too. This product is
always written out in full. The complete glossary is [`CONTEXT.md`](CONTEXT.md).

## Vision

- [`docs/vision/product.md`](docs/vision/product.md) — the promise, the two roles, the boundaries, the
  horizons
- [`docs/vision/architecture.md`](docs/vision/architecture.md) — the tenets, and the decisions that are
  cheap now and expensive later

## Development

Conventions, decision records and agent instructions: [`AGENTS.md`](AGENTS.md). Verification scripts
are in `package.json`; `npm run verify` runs the full gate and the husky hooks run it on commit and
push.

## Licence

Intended to be permissive and free to use. A `LICENSE` file has not been added yet — until it is,
no licence is granted.
