---
type: research
---

# Agent Skill Bundling: What `assets/`, `references/` and `scripts/` Actually Do

Research question: this repo was about to ship its first adopter-facing skill — a config-authoring
skill for `markdown-harness` — and the draft plan proposed a `references/` directory beside
`assets/`, on the assumption that the Agent Skills specification assigns meaning to those directory
names. The question is whether any tool reads them, whether the spec requires them, and where the cut
between the always-loaded `SKILL.md` and a bundled file actually belongs. A skill is a **context
router**: what sits in `SKILL.md` is paid for on every activation, and what sits behind a pointer is
paid for only when the pointer fires, so the cut is a cost decision rather than a tidiness one.

Probed 2026-09-09. Every claim is quoted from a specification, official documentation, or shipped
source. Behavioural claims marked **[executed]** were reproduced against a real binary and the
version is given. Each finding is tagged **normative** (the source states it as a requirement, or a
tool breaks without it) or **conventional** (habit, example code, or a default), because the two
license very different things.

---

## 1. The directory names are recommendations, not schema

**Conventional.** The Agent Skills specification at `agentskills.io` describes `scripts/`,
`references/` and `assets/` as _"recommendations for organizing common types of content"_. It defines
no behaviour for them. Nothing in the spec requires a skill to have any subdirectory at all.

**Conventional, and self-contradicting.** Anthropic's own documentation does not agree with itself on
the name: one page writes `reference/` (singular), another shows flat files at the skill root with no
subdirectory. Two first-party pages disagreeing is strong evidence the name carries no contract.

**Normative — the decisive one.** The `skills` CLI (`vercel-labs/skills`, v1.5.25) treats a skill
directory as **opaque**. Its source comments that a skill directory is copied _"recursively… so their
`scripts/`, `references/`, `assets/`, etc. are installed too"_. There is no branch on the name. The
directory could be called `banana/` and installation would be byte-identical.

**Consequence for this repo:** `references/` would have been invented convention. This repo has
**zero** `references/` directories across 40 skills, and the one skill that bundles prose —
`commit` — puts it in `assets/` (`assets/research.md`, `assets/setup-husky.md`). Repo convention is
uncontested, so `assets/` it is.

## 2. Bundling tracks content _type_, not document length

The draft plan's reasoning was "`SKILL.md` approaches 500 lines, therefore split". That is backwards.

**Conventional.** Anthropic's `doc-coauthoring` skill is **375 lines with zero bundled files**. It is
pure behavioural guidance — material every run needs — so none of it is disclosable. Length did not
force a split because there was no branch to split on.

**Conventional.** Where shipped skills do bundle, the bundled file is consistently one of: a schema
or format spec consulted on demand, a script executed rather than read, or a rarely-taken branch. The
predictor is whether _some_ runs need it, not how long the file is.

This matches this repo's own doctrine independently: `writing-for-agents/SKILL.md` states the test as
_"inline what every branch needs, and push behind a pointer what only some branches reach"_ and names
**sprawl** as the failure mode — so 500 lines is a wall, never a target.

## 3. Short example inline, exhaustive example bundled

**Conventional, and unanimous in the sample.** Every sampled shipped skill that carries an example at
all keeps a _short_ one inline at the point of need and pushes the _exhaustive_ one out:

- `skill-creator` inlines an abbreviated `evals.json`, then points at the full schema.
- `pdf` inlines the common-case snippets and reserves the bundled file for the rest.

**No sampled skill runs the other way** — none omits the inline example and points at a bundled one
for the common case. The draft plan had no inline example at all, which the survey contradicts.

## 4. Never reach a bundled file with `@`-syntax

**Normative.** `@`-prefixed links force-load the target immediately on skill activation. That spends
exactly the context the disclosure was created to save — the pointer stops being a pointer and
becomes an inline include with extra steps. Use a plain relative markdown link, which the agent
follows only when it decides to.

## 5. Four measurements taken against `@hancrafted/markdown-harness@0.0.2`

**[executed] The published README's primary example config is rejected by the tool it documents.**
The block omitted `ruleId`, mandatory since the Floor was removed. Piping the README's own block into
the built CLI:

```
$ mh --query docs/research/new.md --config <(sed -n '85,93p' README.md)
{"error":"CONFIG_REJECTED","faults":[{"code":"CONFIG_INVALID_VALUE",
  "location":"frontmatter.rules[0].ruleId"}]}
EXIT: 2
```

A new adopter copying the first example gets exit 2 on their first command. The second README block
(lines 154–164) was verified sound at exit 0, so exactly one block was broken. Fixed in this change,
with a regression guard that was proven to go red on reintroduction.

**[executed] `--audit` reports rule ordering mechanically, so prose explaining it is a cache.** A
deliberately mis-ordered pair — broad rule above narrow — reports:

```
broad-first     won=6  shadowed=0  shadowedBy=[]
narrow-loses    won=0  shadowed=2  shadowedBy=["broad-first"]
```

`won: 0` plus a populated `shadowedBy` names both the dead rule and the rule that ate it. Under this
repo's own pruning rule — a document restating the environment is a **cache** that earns its load
only when the lookup is expensive — a paragraph explaining first-match ordering loses to a one-line
instruction to run the command.

**[executed] An unquoted `intent` containing a comma is silently split by YAML.** The flow scalar
terminates at the comma and the remainder is parsed as a key:

```
intent: Findings that settle a question, newest first.
  → exit 2, CONFIG_UNRECOGNISED_KEY at
    frontmatter.rules[0].fields.type.allowed[0].newest first.

intent: 'Findings that settle a question, newest first.'
  → exit 0
```

The tell is that the fault `location` contains a fragment of the author's own prose. This already bit
this repo once — `ARCH-002` records five silently truncated entries.

**[executed] Piping a command into another swallows its exit code.** `node cli.js … | head` puts
`head`'s status in `$?`, not the CLI's, which reports success over a failed run. This produced a
false `EXIT: 0` during this very session before being caught. Capture directly — `out=$(cmd); code=$?`
— or read `${PIPESTATUS[0]}`. This is trap-class material for `docs/agents/verification.md`, and it
is the same failure shape as the traps already recorded there: a green that was never measured.

## 6. What this settled

The architectural cut adopted for `.agents/skills/markdown-harness/`:

| Decision                                              | Basis                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `SKILL.md` + `assets/` only, no `references/`         | §1 — the name has no mechanical effect, and repo convention is uncontested |
| Interview inline in `SKILL.md`                        | §2 — it fires every run, so it is not disclosable                          |
| Short example inline, exhaustive example in `assets/` | §3 — unanimous in the shipped sample                                       |
| Plain markdown link to the asset                      | §4 — `@` defeats the disclosure                                            |
| Ordering taught by a verified `mh --audit` step       | §5 — the tool reports it; prose would be a stale-able cache                |
