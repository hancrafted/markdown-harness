---
name: markdown-harness
description:
  Author or update a markdown-harness.config.yaml by interviewing the user about their own corpus, then proving every
  rule against the CLI rather than asserting it. Use when governing a folder of markdown, writing or changing a
  markdown-harness config, deciding what a document must declare about its provenance or freshness, working out why
  a rule governs nothing, or wiring the Claude Code hook that reads a freshness sentence back to an agent.
compatibility: Requires @hancrafted/markdown-harness >= 0.0.2, as `mh` or `npx mh`. Confirm with `mh --help`.
---

One config file declares what each path must carry. Rules are an ordered list, the first match is the complete set of
constraints, and a file no rule names is invisible to the tool.

Two properties shape every step below. **Governance is opt-in**, so an empty config is a valid config and adding rules
is how a corpus becomes governed — never the reverse. And **the tool never writes frontmatter**: it reports, and the
user decides. Propose edits; write only what they approve.

`mh --query` is the whole validation loop, so nothing here restates the schema. Ask the tool.

## 1. Survey before asking

Read the tree first, so the user reacts to their own repo instead of an abstraction. Look for directories that already
share a shape — a `research/` whose files cite sources, a `runbooks/` that goes out of date, an `index.md` convention —
and read two or three real files from each to see what frontmatter they already carry.

Bring the candidates to the first question. "You have 34 files under `docs/research/`, 30 of which already carry
`sources:`" is a question the user can answer; "what would you like to govern?" is not.

_Done when_ you can name each governable directory, roughly how many files it holds, and what its files already declare.

## 2. Take one rule at a time

Ask only what the next rule needs, then build it. A config authored rule by rule stays green; a config authored in one
pass goes red across dozens of files at once, and the user cannot tell which decision caused what.

Four things make a rule, and the user supplies all four:

- **Which paths** — a `path:` glob list, or `fileName:` to match a basename at any depth.
- **Why, in one sentence** — `intent:`, mandatory, in their words. It travels back with every violation this rule
  reports, so the failure says why the rule exists rather than only which check fired.
- **Whether frontmatter belongs there at all** — `frontmatter: forbidden` for files that must carry none.
- **What the file must declare** — the fields, under `fields:`.

The shape, at its smallest:

```yaml
frontmatter:
  rules:
    - ruleId: research # mandatory, unique, and how reports refer to this rule
      path: [docs/research/**/*.md]
      intent: Research is only worth as much as the sources behind it, so it names them
      fields:
        sources: { minItems: 1 }
```

`ruleId` and `intent` are both mandatory on every rule. Reports name a rule by its id and never by its position, so
reordering the list — an ordinary edit under first-match — does not silently repoint anything.

The full vocabulary is one worked example: read
[`assets/starter-config.yaml`](assets/starter-config.yaml) when you need a key this file has not shown you — nested
addresses like `generated.by` and `sources[].resource`, the named formats, `unknownKeys`, the `anyOf` / `allOf` /
`exactlyOneOf` cross-field checks, or `pattern`.

_Done when_ one rule is fully specified from the user's answers, and nothing about it was guessed.

## 3. Ask about freshness, once per rule

The one thing worth raising unprompted, because the user cannot discover it by looking: a rule can carry the sentence an
agent hears when it opens a file that has gone stale.

Ask whether this rule's files go out of date. If they do, the user writes the instruction — `assess.stale` — and the
rule requires `stale_after` alongside it:

```yaml
assess:
  stale: Check this against the source before relying on it, then move stale_after.
fields:
  stale_after: { presence: required, format: datetime }
```

Keep the block on the rule rather than module-wide, and keep the two keys together — the config is rejected when they
come apart. The worked freshness rule in [`assets/starter-config.yaml`](assets/starter-config.yaml) says why.

That sentence sits in the config until something asks for it. [Wiring the freshness hook](#wiring-the-freshness-hook)
is how it gets asked on every file an agent opens.

_Done when_ each rule either carries both keys or neither.

## 4. Verify the rule — the loop

Run the query against a path the rule should govern. It needs no file to exist:

```sh
mh --query docs/research/anything.md --config markdown-harness.config.yaml
```

**Exit 0** returns the winning rule and the requirements it imposes. Read them back — a config that parses is not yet a
config that asks for what the user meant.

**Exit 2** returns a fault whose `location` is the exact key path to fix:

```json
{ "code": "CONFIG_INVALID_VALUE", "location": "frontmatter.rules[1].ruleId" }
```

Edit that key and re-run. Faults come back all at once, so work the list rather than re-running after each edit.

Two mechanical points that cost real time otherwise. **Capture the exit code directly** — piping into `head` or `jq`
puts _that_ command's status in `$?`, which reports success over a failed run. Use `out=$(mh ...); code=$?`.

And **quote any `intent` containing a comma.** Unquoted, YAML splits the value on it and the fault location carries a
fragment of the user's own prose, which is the tell:

```
location: "frontmatter.rules[0].fields.type.allowed[0].newest first."
```

_Done when_ the query exits 0 and the requirements it prints are the ones intended.

## 5. Prove the rule governs something

A rule that parses can still govern zero files. Run the audit over the real corpus:

```sh
mh --audit --config markdown-harness.config.yaml
```

Each rule reports `won`, `shadowed` and `shadowedBy`. **`won: 0` means the rule is dead** — and `shadowedBy` names the
rule that ate it, which is almost always a broader rule sitting above it:

```
broad-first     won=6  shadowed=0  shadowedBy=[]
narrow-loses    won=0  shadowed=2  shadowedBy=["broad-first"]
```

The fix is to move the narrower rule above the broader one. This is why the tool reports ordering rather than the config
explaining it: specific rules first, broadest last, and the audit is what proves it landed.

A high `shadowed` count on the _last_ rule is normal and healthy — a catch-all is supposed to lose to everything above it.

_Done when_ every rule the user meant to be active reports `won` above zero.

## 6. Summarise, then write

Report what changed in the user's terms before touching the file: which paths are now governed, what each rule asks for,
what contributors have to add to existing files, and any follow-up left over. A YAML dump is not a summary — the user
already has the file.

Then run `mh --check` and tell them the count. A config that governs existing files usually goes red on the first run,
and that number is the real cost of the rules they just approved.

_Done when_ the user has approved the change, the file is written, and they know what `mh --check` currently reports.

## Wiring the freshness hook

On Claude Code, one hook asks `mh --assess` about every markdown file the agent reads, and hands back the rule's
`assess.stale` sentence when that file is past its date. It is one `PostToolUse` entry in the committed
`.claude/settings.json`, pointing at `scripts/assess-hook.mjs`.

It speaks on one answer and stays silent on every other — including in a repository with no config at all, which is
what governance being opt-in means here. So its silence proves nothing on its own: prove it speaks before you trust
it, by feeding it a file you know is stale.

The settings entry, that check, the full silence table and troubleshooting live in
[`assets/assess-hook.md`](assets/assess-hook.md). Read it before wiring, and again when the hook says nothing and you
expected it to.

_Done when_ the by-hand check prints a sentence for a stale file, and the settings entry is committed.

## Installing this skill

```sh
npx skills add hancrafted/markdown-harness
```

Project scope, the default, so the skill is committed and every clone and CI run has it. Prefer it over `--copy`, which
creates independent per-agent copies that drift apart.
