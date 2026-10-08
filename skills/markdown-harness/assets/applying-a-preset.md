# Applying a preset

Reference for the `Apply a preset` row of `SKILL.md`.

A **preset** is a ready-made set of rules for a kind of document that many repositories share. It
lives in `assets/preset/` as a config fragment: `frontmatter:` and `body-structure:` sections whose
rules all share one `ruleId`. Applying it copies those rules into the project's
`markdown-harness.config.yaml`. Applying it again **updates** them: each rule with the preset's
`ruleId` is replaced whole.

| Preset                         | Governs                                          | Default location  |
| ------------------------------ | ------------------------------------------------ | ----------------- |
| `keep-a-change-log.config.yml` | a changelog in the Keep a Changelog 1.1.0 format | `./CHANGELOG.md`  |
| `archgate-adr.config.yml`      | Archgate ADRs, held to the GEN-001 contract      | `.archgate/adrs/` |

Each preset's header comment says what it holds and what it leaves to another tool. Read it out to
the user before step 3.

## 1. Confirm the location

Look for the documents at the default location. When they live elsewhere, find them and agree the
real location with the user. Change `folders:` and `fileNames:` on **every** rule of the preset to
match, because the frontmatter rule and the body rule select separately. A folder token is one
folder with no recursion: name each subfolder that holds documents, or none of them is governed.

**`archgate-adr` sits in a dot-directory, and `mh check` does not walk dot-directories.** `query`,
`assess` and the freshness hook reach `.archgate/adrs/` files, so an agent writing an ADR is steered
by the rules. But the corpus walk behind `check` and `audit` skips every directory whose name starts
with a dot, so the gate reports `governedFiles` without the ADRs and stays green over a broken one.
Say this to the user before applying, and say that the gate does not hold ADRs. Step 4 shows how to
check them by hand.

_Done when_ the user has confirmed the location, and every rule of the preset names it.

## 2. Find where each rule goes

Read the project config. For each section of the preset:

- **A rule with the preset's `ruleId` is already there.** This is an update. Diff that rule against
  the preset's and show the user every line that differs. The update replaces the whole rule, so a
  local edit is lost unless the user carries it into the new copy.
- **No such rule.** This is an append. The first matching rule is the only one applied, so placement
  decides whether the preset governs anything. Run `mh query <path>` on one real path at the
  location and read which rule wins today. Insert the preset's rule **above** that rule. When
  nothing wins, the rule goes at the end of the section.
- **Another rule already wins the path and says something about it**, for example a project rule
  that already requires `type` on ADRs. Bring both rules to the user and let them choose. Putting
  the preset above it silently takes that path out of the other rule.

No config at all: the preset becomes the config. Copy its sections without the header comment and
put `authoring-a-config.md`'s query loop in front of the user.

_Done when_ every rule of the preset has a position, and the user has seen the diff for each update
and the choice for each conflict.

## 3. Write it

Copy each rule into its position under the same section key. If the section is missing, create it.
Keep the preset's comments with its rules, because they say why each choice was made. Keep YAML
anchors as they are. They are namespaced by preset (`&keep-a-changelog-change-types`), so they
cannot clash with the project's own. Leave every rule the preset does not own unchanged.

Then run:

```sh
mh query <path> --config markdown-harness.config.yaml
```

on one path at the location. Exit 2 names the key to fix in its `location`. Exit 0 should name the
preset's `ruleId` for every module the preset has a section for.

_Done when_ the query names the preset's `ruleId` in every module the preset covers.

## 4. Report what it costs

Run `mh check` and give the user the number of violations the preset's rules found, grouped by
code. A changelog or an ADR set written before the preset usually goes red on its first run, so the
number is the real cost of adopting it. As in `wiring-the-gate.md`, the user chooses between two
ways forward. One is to fix the documents. The other is to loosen the rule in the project config,
for example dropping a `mayHold` or opening a closed spine. A rule loosened this way has drifted
from the preset, and the next update shows that drift as a diff in step 2.

`archgate-adr` needs a check of its own, because `mh check` never reaches it. Copy the preset into
the scratchpad with `folders: [./]` on both rules and run:

```sh
mh check --root .archgate/adrs --config <that copy>
```

Read `governedFiles` first. It should equal the number of ADR markdown files. Zero means the check
looked at nothing.

_Done when_ the user has the violation count for the preset's documents, and `governedFiles`
includes them: in `mh check` for a changelog, in the rooted run for ADRs.
