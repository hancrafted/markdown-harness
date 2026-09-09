<div align="center">

<!-- HERO ART SLOT — `.github/assets/hero.svg`, 880px wide.
     Suggested subject: one frontmatter block with `stale_after` picked out, and an agent
     opening it three months later. When it lands, put the <img> here and keep the H1 as
     the image's alt text. -->

# markdown-harness

**Governance for a markdown knowledge base that agents help maintain** — so you can rely on
documents you did not write, cannot re-read, and have not checked in months.

<p>
  <a href="https://www.npmjs.com/package/@hancrafted/markdown-harness"><img src="https://img.shields.io/npm/v/%40hancrafted%2Fmarkdown-harness?label=npm&color=1f6feb&labelColor=0d1117" alt="npm"></a>
  <a href="https://github.com/hancrafted/markdown-harness/actions/workflows/ci.yml"><img src="https://github.com/hancrafted/markdown-harness/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="#1-install"><img src="https://img.shields.io/badge/node-24.16%2B%20%7C%2026.1%2B-1f6feb?labelColor=0d1117" alt="Node"></a>
  <a href="#roadmap"><img src="https://img.shields.io/badge/status-pre--1.0-9e6a03?labelColor=0d1117" alt="Pre-1.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-1f6feb?labelColor=0d1117" alt="MIT"></a>
</p>

<p>
  <b><a href="#quick-start">Quick start</a></b> ·
  <a href="#what-it-does-today">Features</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#the-freshness-hook">Freshness hook</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#why-not-an-existing-tool">Why not an existing tool</a> ·
  <a href="#words-used-here">Glossary</a>
</p>

</div>

---

> **A document can tell you how much of itself to believe.**
>
> That is the whole product. Everything else is the machinery that keeps such a statement true.

Full trust in a corpus like that is not achievable, and this does not claim it. What is available is
narrower and enough. One config declares what each path must carry. Every governed document states
its own provenance, verification and expiry **in the file** — so a reader that has never heard of
this tool still sees them. And `mh --check` turns all of it into an exit code your gate already
understands.

<!-- DEMO GIF SLOT — `.github/assets/demo.gif`, ~820px wide.
     Suggested take: `mh --check` going red on a corpus, the frontmatter fix, then green.
     Caption underneath: the rule's own `intent` sentence appearing in the violation. -->

## Quick start

Five steps, about a minute.

### 1. Install

```bash
npm install --save-dev @hancrafted/markdown-harness
```

Two names for one command: `markdown-harness` to read in a script, `mh` to type in a session. The
scope is the registry coordinate only — the commands, the config filename and the product keep the
bare name.

<details>
<summary>Node <code>&gt;=24.16.0 &lt;25 || &gt;=26.1.0</code> — why the range is narrow rather than tidy</summary>

Path matching delegates to the platform's glob matcher, and only those releases carry the
segment-aware behaviour the config language is specified against. Outside it the command refuses and
names the range — a refusal is better than the same corpus reporting differently on your machine
than on CI.

</details>

### 2. Get a config

Nothing generates one for you, and nothing writes to your tree. Either write
`markdown-harness.config.yaml` at the repo root by hand — [the shape is below](#how-it-works) — or
install the skill and let your Host harness write it with you:

```bash
npx skills add hancrafted/markdown-harness
```

Then ask for `markdown-harness` in a session. It probes the repo, says where you stand in one line,
and offers numbered options: set it up, watch it work on throwaway files first, or author the first
rule.

### 3. Ask what a rule expects, before the file exists

```bash
mh --query docs/research/new.md
```

This doubles as the authoring loop. A malformed config comes back with a fault code and its location
inside the file; a sound one comes back with the rule that governs the path.

### 4. Check the corpus

```bash
mh --check
```

Exit **0** clean, exit **1** the corpus is wrong. A path no rule matches is invisible — a correct
answer, not an error — so a fresh install reports nothing on a corpus it has never seen.

### 5. Put it in your gate

```json
{ "scripts": { "verify": "... && mh --check" } }
```

That is the whole adoption path. A green build starts meaning something.

<details>
<summary><b>Optional — wire the freshness hook on Claude Code</b></summary>

Install the skill as in step 2, then follow the `Wire the freshness hook on its own, on Claude Code`
row of its `SKILL.md`. After that, any file an agent reads that is past its `stale_after` comes back
with your own sentence attached. See [the freshness hook](#the-freshness-hook) for what it does and
what it deliberately stays quiet about.

</details>

## What it does today

Four commands, and a `--help` that is the only one not answering in JSON.

| command              | answers                                                         |
| -------------------- | --------------------------------------------------------------- |
| `mh --check`         | every governed file's violations, and the counts. The default   |
| `mh --query <path>`  | what the config asks of a path, before the file exists          |
| `mh --audit`         | how every rule fared, so a rule that governs nothing is visible |
| `mh --assess <path>` | what one file is worth believing, at one instant                |
| `mh --help`          | the commands, the flag defaults and the exit-code contract      |

The exit codes are the contract: **0** nothing wrong, **1** the corpus is wrong — `--check` alone
ever exits this — and **2** it could not report at all, which is either a usage error on stderr or a
rejected config on stdout.

And around them:

- **One config, ordered rules, first match wins, nothing merges.** For any file the first matching
  rule is the complete set of constraints.
- **Governance is opt-in by path.** A file no rule names is never reported and never counted.
- **Every rule states its `intent` in your words**, and that sentence travels with any violation it
  reports — so a failure says why the rule exists, not just which check fired.
- **The check path is hermetic.** No network, no model, no external service, no git call, no clock.
  The same tree in gives the same result out.
- **The contract is the portable artifact.** The config language, the report format and the
  conformance corpus are the specification; the TypeScript is one implementation of it.
- **OKF v0.2 is vendored and pinned** at [`docs/okf/`](docs/okf/), byte for byte.
- **A skill for your Host harness** — [`npx skills add hancrafted/markdown-harness`](#2-get-a-config)
  — carrying five workflows: set up, demo on throwaway files, author or debug a rule, wire the
  gate, wire the hook.
- **A Claude Code freshness hook**, and an activity log that proves it ran.

## How it works

**One config declares what each path must carry.** Rules are an ordered list; for any file the first
match is the complete set of constraints, and a file no rule names is invisible.

```yaml
# markdown-harness.config.yaml
frontmatter:
  rules:
    - ruleId: research
      path: [docs/research/**/*.md]
      intent: Research is indexed, and an index entry copies the description
      fields:
        type: { presence: required, allowed: [{ value: research }] }
        description: { presence: required, maxLength: 200 }
        sources: { minItems: 1 }
```

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

## The freshness hook

**Something has to ask, and on Claude Code a hook can ask for you.** It runs `--assess` after every
file the agent reads and hands your sentence back when that file is past its date.

<!-- HOOK GIF SLOT — `.github/assets/hook.gif`, ~820px wide.
     Suggested take: a fresh Claude Code session asked to summarise a stale document, with the
     freshness sentence arriving unasked. This is the product surface — worth the best asset. -->

It ships with the skill rather than in this package, because a host-shaped asset inside a portable
artefact works against the floor this tool stands on — and because hooks change far more often than
built output. Install it with the skill, then follow the
`Wire the freshness hook on its own, on Claude Code` row of its `SKILL.md`.

It speaks on one state only. `PROCEED` is silence by contract, and `FIX_FILE` is a repair
`mh --check` already reports once in the gate — a governance tool that talks on every read of every
governed file gets switched off.

Which leaves a problem worth naming: a hook that ran and had nothing to say is indistinguishable
from one that never fired. So it records **every** invocation — the silent ones included — to
`docs/markdown-harness/activity.csv`. A `fresh` row is the proof that it ran and chose to stay quiet.

## The problem

A knowledge base maintained by agents degrades along a predictable path:

- **Volume outruns review.** Documents accumulate faster than anyone reads them.
- **Confidence outlives correctness.** A document says "decided" long after the decision moved. Prose
  carries no expiry, so age is invisible at the moment of reading.
- **Governance drifts while checks stay green.** This is the one that ends it — once a standard can be
  quietly relaxed, a passing check stops being evidence, and you stop believing any of it.

The corpus then gets abandoned rather than repaired, because nothing distinguishes the parts that were
still good.

## Roadmap

Pre-1.0. Shapes may still change, and what follows is honest about what is not here.

**Shipped**

| what exists                                         | and what it means                                      |
| --------------------------------------------------- | ------------------------------------------------------ |
| `--check`, `--query`, `--audit`, `--assess`         | The four commands and the exit-code contract           |
| The config contract and the Conformance suite       | The portable specification, not just an implementation |
| The pinned OKF revision                             | Vendored byte-identical at [`docs/okf/`](docs/okf/)    |
| The skill, the gate wiring and the Claude Code hook | Including the activity log that proves the hook ran    |
| Product and architecture vision                     | [`docs/vision/`](docs/vision/)                         |

**On the horizon** — from [`docs/vision/product.md`](docs/vision/product.md). Anything here can move.

| idea                                   | what it would give you                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **The OKF Preset**                     | OKF v0.2 as an ordinary shipped config you can adopt, amend or delete                                                                        |
| **A second Module: folders and files** | Governance over names and structure, not only frontmatter ([#63](https://github.com/hancrafted/markdown-harness/issues/63))                  |
| **Index generation**                   | The index files OKF §8 reserves, produced rather than hand-maintained                                                                        |
| **The Contributor path**               | Governance felt through your own Host harness, without ever opening the config                                                               |
| **A config-authoring web app**         | The one deliberate exception to "no UI" — it configures, it never runs your corpus                                                           |
| **An importable library surface**      | The core as a module, for tools that are not a CLI                                                                                           |
| **This repo governed by itself**       | The vision's proof obligation: govern your own corpus, or have no standing ([#57](https://github.com/hancrafted/markdown-harness/issues/57)) |

**Not on the roadmap, by design.** Each of these is a boundary, and moving one is a vision change
rather than a feature request. The right-hand column is what the product does instead.

| it will not                           | it does this instead                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Run a model or hold an API key        | Delegates judgment to your Host harness, on your own auth and bill                    |
| Run as a service or phone home        | Runs on your machine, against files you can read                                      |
| Index into a vector store             | Treats the markdown tree as the corpus; retrieval belongs to the Host harness         |
| Sit on the consumption path           | Puts the signal in the file, so a reader needs nothing installed                      |
| Rewrite your prose                    | Supplies the metadata, structure and steering that make someone else's rewrite better |
| Be a Host harness, a chat UI or a TUI | Treats the Host harness as the interface                                              |

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

## Documentation

| where                                                        | what is in it                                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`docs/vision/product.md`](docs/vision/product.md)           | The promise, the two roles, the boundaries, the horizons                |
| [`docs/vision/architecture.md`](docs/vision/architecture.md) | The tenets, and the decisions that are cheap now and expensive later    |
| [`docs/okf/`](docs/okf/)                                     | The pinned OKF v0.2 revision                                            |
| [`docs/research/`](docs/research/)                           | The survey behind [Why not an existing tool](#why-not-an-existing-tool) |
| [`CONTEXT.md`](CONTEXT.md)                                   | The complete glossary                                                   |
| [`AGENTS.md`](AGENTS.md)                                     | Conventions, decision records and agent instructions                    |

## Development

Verification scripts are in `package.json`; `npm run verify` runs the full gate, and the husky hooks
run it on commit and push. Start at [`AGENTS.md`](AGENTS.md) — it names the traps a check can fall
into and report success over nothing.

Issues and discussion: [github.com/hancrafted/markdown-harness/issues](https://github.com/hancrafted/markdown-harness/issues).

## Licence

MIT — see [`LICENSE`](LICENSE).
