# markdown-harness

Governance for a markdown knowledge base that agents help maintain — so you can rely on documents
you did not write, cannot re-read, and have not checked in months.

Full trust in such a corpus is not achievable, and this does not claim it. What it does is narrower
and enough:

> **A document can tell you how much of itself to believe.**

## Install

```bash
npm install --save-dev @hancrafted/markdown-harness
```

Two names for one command: `markdown-harness` to read in a script, `mh` to type in a session. The
scope is the registry coordinate only — the commands, the config filename and the product keep the
bare name.

Node `>=24.16.0 <25 || >=26.1.0`. The range is narrow rather than tidy because path matching
delegates to the platform's glob matcher, and only those releases carry the segment-aware behaviour
the config language is specified against. Outside it the command refuses and names the range — a
refusal is better than the same corpus reporting differently on your machine than on CI.

## Usage

Write one config at the repo root, `markdown-harness.config.yaml` — the shape is below — then:

```bash
mh --check                       # every governed file's violations, and the counts
mh --query docs/research/new.md  # what the config asks of a path, before the file exists
mh --audit                       # how every rule fared, so a rule that governs nothing is visible
mh --assess docs/research/x.md   # what one file is worth believing, at one instant
mh --help                        # the four commands, the flag defaults, and the exit codes
```

Every command answers as JSON on stdout, and `mh --help` is the one exception — it prints the list
above with the exit-code contract and exits 0. The exit codes are the contract: **0** nothing wrong, **1**
the corpus is wrong — `--check` alone ever exits this — and **2** it could not report at all, which
is either a usage error on stderr or a rejected config on stdout. So `--check` goes straight into
your own gate, and a green build starts meaning something:

```json
{ "scripts": { "verify": "... && mh --check" } }
```

Nothing generates a config for you, and nothing writes to your tree. If you would rather not learn
the config language before your first run, ask your Host harness to write one and let `mh --query`
judge it: a malformed config comes back with a fault code and the location inside the file, and a
sound one comes back with the rule that governs the path. That is a complete authoring loop, and it
needs no extra command.

## Status

Pre-1.0. Shapes may still change, and what is here is honest about what is not:

| exists today                                     | not yet                              |
| ------------------------------------------------ | ------------------------------------ |
| `--check`, `--query`, `--audit` and `--assess`   | The OKF Preset                       |
| The config contract and the Conformance suite    | Index generation, scheduling, any UI |
| The pinned OKF revision (`docs/okf/`)            | An importable library surface        |
| Product and architecture vision (`docs/vision/`) | MCP, or any second surface           |

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

**`--assess` amplifies that signal at run time; it is never the only way to reach it.** It reads one
file, compares its `stale_after` to an instant you supply, and answers with your own sentence:

```bash
mh --assess docs/research/yaml.md --now 2026-12-01T00:00:00Z
```

```json
{
  "command": "assess",
  "path": "docs/research/yaml.md",
  "now": "2026-12-01T00:00:00Z",
  "config": "markdown-harness.config.yaml",
  "result": {
    "agentAction": "REVIEW",
    "instruction": "Re-verify by web research before quoting this.",
    "state": "stale",
    "source": "rule",
    "evidence": { "field": "stale_after", "value": "2026-11-24T00:00:00Z" },
    "rule": { "ruleId": "research", "intent": "Research is indexed, so it names its sources." }
  }
}
```

`agentAction` is one of `REVIEW`, `PROCEED` or `FIX_FILE`, and it is derivable from `state` on
purpose — five states onto three actions is a mapping worth doing for the reader rather than by them.
The instant is the whole of why this stays trustworthy: `--now` is echoed back, so the comparison can
be repeated by hand, and `--check` is left clock-free so a corpus cannot go red overnight on a tree
nobody touched. Configure the sentence beside the rules:

```yaml
frontmatter:
  assess:
    stale: This file is past its freshness date. Tell the user and offer to re-verify it.
  rules:
    - ruleId: research
      path: [docs/research/**/*.md]
      intent: Research is indexed, so it names its sources.
      assess:
        stale: Re-verify by web research before quoting this.
      fields:
        stale_after: { presence: required, format: datetime }
```

A rule's block replaces the module-wide one **whole**, never key by key, so deleting it is one
visible act. A prompt with no `stale_after: { presence: required }` beside it is a config error —
a sentence that could never be printed is worth telling you about.

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

MIT — see [`LICENSE`](LICENSE).
