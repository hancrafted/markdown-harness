# Authoring or changing a config

Reference for the `Author the first config, or add, change or debug one rule` row of `SKILL.md`.

Six steps, in order. They are the same six whether the config is new or already exists — an edit is
this workflow entered at step 2, with step 1 spent reading the config that is there instead of the
tree. `mh --query` is the whole validation loop, so nothing here restates the schema. Ask the tool.

## 1. Survey before asking

Read the tree first, so the user reacts to their own repo instead of an abstraction. Look for
directories that already share a shape — a `research/` whose files cite sources, a `runbooks/` that
goes out of date, an `index.md` convention — and read two or three real files from each to see what
frontmatter they already carry.

Bring the candidates to the first question. "You have 34 files under `docs/research/`, 30 of which
already carry `sources:`" is a question the user can answer; "what would you like to govern?" is not.

_Done when_ you can name each governable directory, roughly how many files it holds, and what its
files already declare.

## 2. Take one rule at a time

Ask only what the next rule needs, then build it. A config authored rule by rule stays green; a
config authored in one pass goes red across dozens of files at once, and the user cannot tell which
decision caused what.

Four things make a rule, and the user supplies all four. Number them when you ask, so they can answer
one at a time and point at the one they want to change:

1. **Which paths** — a `path:` glob list, or `fileName:` to match a basename at any depth.
2. **Why, in one sentence** — `intent:`, mandatory, in their words. It travels back with every
   violation this rule reports, so the failure says why the rule exists rather than only which check
   fired.
3. **Whether frontmatter belongs there at all** — `frontmatter: forbidden` for files that must carry
   none. A rule with a selector, an `intent` and no payload is the other end of that: it governs the
   path in order to ask nothing of it, which is how a reserved filename is exempted on purpose
   rather than by falling through a gap.
4. **What the file must declare** — the fields, under `fields:`.

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

`ruleId` and `intent` are both mandatory on every rule. Reports name a rule by its id and never by its
position, so reordering the list — an ordinary edit under first-match — does not silently repoint
anything.

**Start from one real rule, never an empty list.** Measured against 0.0.2:

```
frontmatter.rules: []       exit 2   CONFIG_EMPTY_RULE_LIST
```

Governance being opt-in means a rule that _matches nothing_ governs nothing and the tool stays quiet
(`governedFiles: 0`, exit 0). It does not mean the rule list may be empty, and a config that begins
as a placeholder is rejected before it checks anything.

The full vocabulary is one worked example: read [`starter-config.yaml`](starter-config.yaml) when you
need a key this file has not shown you — nested addresses like `generated.by` and `sources[].resource`,
the named formats, `unknownKeys`, the `anyOf` / `allOf` / `exactlyOneOf` cross-field checks, or
`pattern`.

_Done when_ one rule is fully specified from the user's answers, and nothing about it was guessed.

## 3. Ask about freshness, once per rule

The one thing worth raising unprompted, because the user cannot discover it by looking: a rule can
carry the sentence an agent hears when it opens a file that has gone stale.

Ask whether this rule's files go out of date. If they do, the user writes the instruction —
`assess.stale` — and the rule requires `stale_after` alongside it:

```yaml
assess:
  stale: Check this against the source before relying on it, then move stale_after.
fields:
  stale_after: { presence: required, format: datetime }
```

Keep the block on the rule rather than module-wide, and keep the two keys together — the config is
rejected when they come apart. A module-wide `assess:` forces `stale_after` onto _every_ constraining
rule, which means rewriting the whole corpus to satisfy one key. The worked freshness rule in
[`starter-config.yaml`](starter-config.yaml) says why.

That sentence sits in the config until something asks for it. On Claude Code,
[`wiring-the-hook.md`](wiring-the-hook.md) is how it gets asked on every file an agent opens.

_Done when_ each rule either carries both keys or neither.

## 4. Verify the rule — the loop

Run the query against a path the rule should govern. It needs no file to exist:

```sh
mh --query docs/research/anything.md --config markdown-harness.config.yaml
```

**Exit 0** returns the winning rule and the requirements it imposes. Read them back — a config that
parses is not yet a config that asks for what the user meant.

**Exit 2** returns a fault whose `location` is the exact key path to fix:

```json
{ "code": "CONFIG_INVALID_VALUE", "location": "frontmatter.rules[1].ruleId" }
```

Edit that key and re-run. Faults come back all at once, so work the list rather than re-running after
each edit.

Two mechanical points that cost real time otherwise. **Capture the exit code directly** — piping into
`head` or `jq` puts _that_ command's status in `$?`, which reports success over a failed run. Use
`out=$(mh ...); code=$?`.

And **quote any `intent` containing a comma.** Unquoted, YAML splits the value on it and the fault
location carries a fragment of the user's own prose, which is the tell:

```
location: "frontmatter.rules[0].fields.type.allowed[0].newest first."
```

_Done when_ the query exits 0 and the requirements it prints are the ones intended.

## 5. Prove the rule governs something

A rule that parses can still govern zero files. Run the audit over the real corpus:

```sh
mh --audit --config markdown-harness.config.yaml
```

Each rule reports `won`, `shadowed` and `shadowedBy`. **`won: 0` means the rule is dead** — and
`shadowedBy` names the rule that ate it, which is almost always a broader rule sitting above it:

```
broad-first     won=6  shadowed=0  shadowedBy=[]
narrow-loses    won=0  shadowed=2  shadowedBy=["broad-first"]
```

The fix is to move the narrower rule above the broader one. This is why the tool reports ordering
rather than the config explaining it: specific rules first, broadest last, and the audit is what
proves it landed.

A high `shadowed` count on the _last_ rule is normal and healthy — a catch-all is supposed to lose to
everything above it.

_Done when_ every rule the user meant to be active reports `won` above zero.

## 6. Summarise, then write

Report what changed in the user's terms before touching the file: which paths are now governed, what
each rule asks for, what contributors have to add to existing files, and any follow-up left over. A
YAML dump is not a summary — the user already has the file.

Then run `mh --check` and tell them the count. A config that governs existing files usually goes red
on the first run, and that number is the real cost of the rules they just approved.

_Done when_ the user has approved the change, the file is written, and they know what `mh --check`
currently reports.
