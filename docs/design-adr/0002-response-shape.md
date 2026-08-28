---
type: design-adr
description: The response is shaped for an agent consumer — a violation names its outcome, values arrive direct, and coverage becomes its own command.
status: accepted
---

# The response names outcomes, not clauses, and answers one question per command

Two payloads had grown by accretion: `CheckReport` and `SteeringAnswer`, each discriminated
on the config key the Operator typed, each carrying a `format: 'v1'` stamp, and one of them
carrying an Operator diagnostic on a payload read by a Contributor's agent. A review of both
shapes found a defect rather than untidiness, and the shapes were rebuilt around a single
question: what can the reader — a language model, one pass, no prose to fall back on — act on?

## The defect

`presence` fails three ways. All three reported `constraint: 'presence'`, so nothing in a
violation said whether to ADD the field or DELETE it; a consumer had to compare `requirement`
against `value` and work it out. `presence` fires more than every other constraint combined,
so this was the common case, not an edge.

The codebase already knew. `core/tests/check.test.ts` computed its violation forms as
`` `presence:${expected.presence}` ``, string-concatenating at the test site a split the
contract refused to carry — and named `presence:forbidden` in its own list of clauses no
fixture reached.

## What was decided

| decision                                                     | why                                                                                                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A violation is discriminated on `violation`, an outcome CODE | The clause leaves the direction unstated. One code per constraint, and more wherever a constraint fails in opposite directions: `presence` gets three, `exactlyOneOf` two.                   |
| CAPITAL_SNAKE_CASE for our codes, lowercase for theirs       | Casing carries provenance. `MISSING_REQUIRED_FIELD` is ours; `presence: 'required'` is the Operator's own word, lifted verbatim, and re-casing it would put words in their mouth.            |
| Const objects, never `enum`                                  | Not a preference. There is no build step, so Node's strip-only mode is the runtime and it rejects `enum` outright. `erasableSyntaxOnly` now fails the build instead of the run.              |
| Values arrive DIRECT; absence is the omission of the key     | Measured at the time: 87 violations across three corpora, exactly one carrying a container. The wrapper was charged on every violation to insure against a case the corpus does not contain. |
| `coverage` becomes its own command                           | It answers the Operator's question, and `--check` is read by a Contributor's agent that can act on none of it.                                                                               |
| No `format` version stamp                                    | Nothing stores a response, so it was paying for a case that does not exist.                                                                                                                  |
| Every constraint the language accepts is evaluated           | `--query` was advertising `maxLength: 200` to an agent that `--check` would never have enforced.                                                                                             |

## Considered options

**The tagged value union — keep, or unwrap?** `{ kind: 'scalar', value: 'draft' }` was
defensible: it bounded the payload and made every case explicit. Unwrapping it wins on the
measurement above, but a naive unwrap to `value: null` for a missing field would have
collapsed four distinct authoring mistakes — never written, written bare, written `''`,
written `[]` — into one. Tenet 7 pays to keep silent-misparse classes apart, so the resolution
is that ABSENCE IS THE KEY'S OMISSION and `EMPTY_REQUIRED_FIELD` is its own code. The
distinction survives; the wrapper does not.

**`coverage` — delete, or move?** Deleting it was proposed on payload cost, measured at 8 to
12 percent of a dogfood check. Rejected: under first match every losing rule is SILENT, so an
ordering mistake or a glob typo is invisible forever, and the missing output is byte-identical
to a clean run. Coverage had already earned its place twice over — it exposed an
over-demanding rule that took one dogfood run from 70 violations to 54, and on the first run
after this change it named two inert rules in this repo's own config. Moving it keeps the
diagnostic and takes it off the agent's path, which is the same trade the steering answer
already made when the shadowed and excluded rules were removed from it.

**Storing derivable counts.** `faultyFiles` and `totalViolations` are arithmetic over `files`,
and an earlier version of the contract stored neither, on the same no-duplication rule that
keeps a `message` out of a violation. That rule is right about prose and wrong about counts
here: the consumer is an agent, and asking a language model to sum an array to find out
whether anything is wrong is asking the one thing it is least reliable at. Both are computed
from `files` at the point of return, so the three cannot disagree.

## Consequences

The check payload over this repo's docs fell 29 percent, from 21037 to 14874 bytes, with
`--coverage` carrying 3109 of its own. Violation counts did not move — 27 for config A, 54
for config B — which is the receipt that this was a reshape and not a behaviour change.

`UNCOVERED` in `core/tests/check.test.ts` fell from 11 clauses to 1. The list is now derived
from the code table rather than restated, so a code added without a fixture fails the test
instead of silently never appearing. The one remaining gap is `unparseable-frontmatter`, which
has no code by design: it gets one in the same change as its fixture.

Two things are now enforced that were previously promises in prose. `pattern` without its
mandatory sibling `intent` is a config fault, which is the whole of what keeps an unexplained
regex out of a report. And a shape-specific constraint meeting the wrong shape is
`CONSTRAINT_SHAPE_MISMATCH` — reported once per address, not once per collided constraint —
where all three value checks previously answered `return null` and passed silently, which is
the trap `constraints.ts` cites Laravel's shape-agnostic `min:18` for.
