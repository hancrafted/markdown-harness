# Prototype: the indexes Module, and whether a golden-region Conformance suite works

**Throwaway.** This is prototype code answering a question, on a branch, not a proposal to merge as
product. Everything under `src/packages/indexes-harness/` and `fixtures/indexes-conformance/` exists
to settle the questions below and should be deleted or rewritten when the design-ADR for
[Map: index-files](https://github.com/hancrafted/markdown-harness/issues/86) lands.

## The question

Issue #92 closed with a paragraph headed **"The `expect:` marker doesn't stretch"**:

> Today it is a per-document `PASSES`/`FAILS` about frontmatter. An index case asserts _what a region
> contains_, which is a different kind of claim and lives in a different file from the documents that
> cause it. Whether that is a third verdict, a separate expectation file, or a golden region checked
> byte-for-byte is unsettled.

So: **does a golden-region Conformance suite give the indexes Module a real red/green loop, and does
the marker state machine from #107 survive contact with one?**

Everything else built here — the config types, the planner, the splicer — exists because the question
cannot be answered without something to assert on.

## The answer

**Yes, with one correction to the mechanism and one cost.**

A golden file per index plus one `outcomes.yaml` works, and it is strictly better than a marker
would have been, because the thing being asserted is _bytes_ and a marker can only carry a word. The
correction: the suite must run off a **dry run**, never a write. A suite that generated into its own
corpus could not be run twice, and the second run would assert the first run's output.

The cost is stated in [Finding 5](#5-the-healed-file-is-not-a-prettier-fixed-point).

Three red levers were measured, each turning the suite red from green:

| lever                                       | what went red |
| ------------------------------------------- | ------------- |
| edit one line of a golden file              | 1 test        |
| comment out one directory key in the config | 5 tests       |
| edit one `description` in a corpus document | 1 test        |

## What was built

| piece                                 | where                                               |
| ------------------------------------- | --------------------------------------------------- |
| the `indexes:` config contract        | `src/packages/config-contract/lib/indexes.types.ts` |
| the Module                            | `src/packages/indexes-harness/`                     |
| the Conformance suite                 | `fixtures/indexes-conformance/`                     |
| a runner, so it is trivial to look at | `npm run indexes:plan`                              |

14 declared directories reach every outcome and every refusal #90, #92 and #107 specify. 84 tests.

## Findings

### 1. The corpus cannot be `fixtures/conformance/`, and issue #92's Worked example B assumes it can

Worked example B writes the `indexes:` half straight into `fixtures/conformance/valid-test-config.yaml`.
This prototype put it in a **separate synthetic root** instead, and the reason is not convenience:

- The frontmatter corpus is a **frozen specification**. Its 40 documents each carry an
  `<!-- expect: -->` marker and `conformance.test.ts` asserts `declaredCases = 40`. Declaring its
  directories would put a generated region inside four documents that are themselves Conformance
  cases, and ARCH-002 §3.2 makes editing one a contract change.
- Worked example B also requires **inverting the shipped `ruleId: index-files` rule** from
  `frontmatter: forbidden`. That collision is [#94](https://github.com/hancrafted/markdown-harness/issues/94),
  which is open. A prototype should not pre-empt it, so this config simply does not write the rule.

**This is the first thing to disagree with.** If the answer is "fold it in anyway", that is a
contract change to the frontmatter suite and should be reviewed as one.

### 2. Nothing governs `fixtures/indexes-conformance/`

Measured: no ADR `files:` glob reaches it. ARCH-002 is scoped to `fixtures/conformance/**`, and the
`expect-marker` rule to `fixtures/conformance/docs/**/*.md`. The new corpus is reached by `prettier`
and by nothing else — the same shape as trap 11 in `docs/agents/verification.md`.

Either the suite folds into `fixtures/conformance/` (finding 1) or **ARCH-002 has to grow a glob**.
It cannot stay as it is.

### 3. `descriptionSource` resolution is under-specified, and #92's two worked examples disagree

Read alone, each example requires a different rule:

| example                  | described by                           | implies                      |
| ------------------------ | -------------------------------------- | ---------------------------- |
| `docs/reference/`        | the `labels.md` **it itself** declares | the child's own setting wins |
| `docs/skills/anonymous/` | the `SKILL.md` **its parent** declares | the parent's setting wins    |

The only rule reproducing **both** is _"the nearest declared value walking up from the directory
being described, inclusive, else the Module-wide default"_ — which is what this prototype implements
and what makes its output match both rendered examples byte for byte.

That is **inheritance**, and inheritance sits badly beside the Operator's _"there is no implicit
definition, I would even say never"_. The design-ADR has to say which it is.

### 4. The finder is a hand-rolled block scanner, not an AST

#107 settles the finder as _"AST, matching top-level `html_block` nodes only"_, measured against
`commonmark@0.31.2`. Admitting `commonmark` is a dependency decision ARCH-001 §1 reserves for a human,
and a prototype may not clear that bar on its own — so `marker-scan.pure.ts` implements the subset of
CommonMark's block grammar the decision actually turns on: fenced code, indented code, and the
requirement that a marker be the whole of its own line.

It answers every one of #107's recognition cases correctly. It will disagree with a real parser on
constructs no case reaches today — a marker inside a block quote, or inside a list item's continuation.
**The real implementation should take the dependency**, and the four-signal bar should be run on it.

### 5. The healed file is not a Prettier fixed point

#107 part 7 says healing deletes the recognised survivor and nothing else. Deleting a marker line
leaves the blank line that sat above it, so the healed file carries two consecutive blank lines —
and `prettier --check .` collapses them.

Every other generated file **is** a fixed point, asserted in the suite against prettier's own API.
The healed one is the single stated exception. The choice is real and neither side is free:

- keep healing literal, and accept that one file is reformatted once by the gate; or
- let healing normalise the whitespace it orphans, which means touching bytes outside the region —
  the one thing decision 2 of the map says the generator never does.

### 6. Two files are now duplicated across Modules, and both are about to disagree

`indexes-harness` needs frontmatter-block extraction and glob matching. Both already exist inside
`frontmatter-harness/lib/`, and ARCH-004 §3 forbids reaching another Package's internals — so both
were copied, and both copies say so in their own docblock.

Two Modules now need `excludeFiles` to mean the same thing. **Two copies of a matcher is how two
Modules end up disagreeing about what a glob is.** A shared Package is the fix, and it is cheaper to
make before the second Module ships than after.

### 7. Two bugs the first run caught, worth keeping as tests

- **A trailing blank line on every created file.** `split('\n')` on a newline-terminated file yields
  a final empty element, and the creation template ends with a marker. Prettier strips it, so every
  created file would have been rewritten by the repo's own gate on the run that wrote it.
- **The Conformance corpus does not reach the marker _spellings_.** Deleting the indented-code branch
  from the scanner left all 30 conformance tests green. The corpus exercises whole-file _states_;
  the six spellings need colocated unit tests, which is what `marker-scan.test.ts` now is.

### 8. `Glob` had to move, and the cycle was telling the truth

Putting `indexes?: IndexesConfig` on `MarkdownHarnessConfig` while `indexes.types.ts` imported `Glob`
from `config.types.ts` is a cycle, caught by `dependency-cruiser` on the first run. `Glob` now lives
in `glob.types.ts`. The cycle was a real signal: a glob is shared vocabulary, not the `frontmatter:`
Module's property.

## Still open, and deliberately not decided here

- **The CLI.** [#108](https://github.com/hancrafted/markdown-harness/issues/108) is open, so there is
  no `mh indexes generate`. The runner is `prototype-cli.ts`, reachable only through
  `npm run indexes:plan`, and `parse-argv.pure.ts` is untouched. The verb string inside the in-band
  comment is #107's provisional one.
- **Violation codes and tiers.** [#91](https://github.com/hancrafted/markdown-harness/issues/91) owns
  them. Nothing here invents a `ConfigFaultCode`; every config fault reuses `CONFIG_INVALID_VALUE` or
  `CONFIG_UNRECOGNISED_KEY`, so a missing trailing slash and an empty mapping arrive under one code.
- **The symlink skip.** #90 part 8.2 drops a symlink whose target is already an entry. Not
  implemented — it needs an `lstat` the walker does not currently surface, and no fixture reaches it.
- **Writing.** The planner is a dry run only. There is no `--write`, because _nothing writes to a tree
  unasked_ and the command that would ask has no settled shape.
