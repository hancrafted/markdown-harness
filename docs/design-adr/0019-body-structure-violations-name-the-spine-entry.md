---
type: design-adr
status: accepted
---

# `body-structure` reports six violation codes that name the spine entry, and leaves the exit codes alone

**Supersedes `0015-body-structure-violations-and-the-four-commands`**, a round-one record that exists
only on the branch `prototype/body-structure-module`. The commands it described survive unchanged
and are restated below, because that record is not on this branch. What changes is the violation
family, because the template changed
([`0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md`](./0017-body-structure-template-is-an-ordered-spine-of-heading-and-enumeration-entries.md)).

The second Module speaks in the contract the first one already does. A violation nests under the
Module that made it, the block is named by the top-level config key `body-structure`, and the
exit-code contract does not move: `--check` exits 1 when any Module reports a violation, `--query`,
`--audit` and `--assess` never exit 1, and exit 2 stays "could not report at all". No envelope
changes, no command is added and no flag is added.

## Violations

Codes are spelled `<MODULE>__<OUTCOME>`, the grammar issue #69 settled for a second Module. The
first Module's codes keep their bare spelling; regularising them is #110.

| code                                        | shape beyond `violation`                                                |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `BODY_STRUCTURE__LEVEL_TOO_DEEP`            | `level`, `found`, `requirement`: `{ maxLevel }`                         |
| `BODY_STRUCTURE__HEADING_MISSING`           | `entry`, `requirement`: the heading entry, verbatim                     |
| `BODY_STRUCTURE__HEADING_OUT_OF_ORDER`      | `entry`, `requirement`: the heading entry, verbatim, for either purpose |
| `BODY_STRUCTURE__HEADING_REPEATED`          | `entry`, `found`, `requirement`: the heading entry, verbatim            |
| `BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM` | `entry`, `found`, `requirement`: the enumeration entry, verbatim        |
| `BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM` | `entry`, `found`, `requirement`: the enumeration entry, verbatim        |

`found` is the number of headings at the level for `LEVEL_TOO_DEEP`, and for the others the number
of headings the entry accounts for, as 0017 defines it. `entry` is the zero-based index in the Rule's
`headings:` list, a locator an Operator can open the config at. A verbatim `requirement` includes the
entry's `pattern` and `intent` as written. A violation carries no line or column, because the
response contract has none. A too-deep level is one violation per level, not per heading, so a report
stays bounded. Order inside a file is fixed: levels beyond `maxLevel` ascending, then entries by
index, and within one enumeration out of order before its count.

`LEVEL_FORBIDDEN` with its derived `allowedLevels`, `LEVEL_BELOW_MINIMUM` and `LEVEL_ABOVE_MAXIMUM`
are gone with `levels:`. `HEADING_REPEATED` is new, because a `heading` entry is exactly one and a
second title needs a name.

## The four commands

**A Rule reaches a path** when its folder and file-name axes both match the path and its own
`excludeFiles` does not remove it. Reach is decided from the path alone; the `types` axis is not part
of it. One definition serves `--check`, `--query` and `--audit`.

**`--check`** reads every file some Rule reaches, learns its `type`, then judges it against the first
Rule that reaches it and whose `types`, if written, include that `type`. A file no Rule reaches is
never opened. `governedFiles` stays the union across Modules, and a file two Modules govern is one
governed file whose findings carry two blocks, ordered by the **declared Module set** (`frontmatter`,
then `body-structure`) and never by the order the sections appear in the config. A candidate that
cannot be read refuses the run at exit 2.

**`--query`** reads the config and opens no file, so it cannot know a `type` the file does not yet
have. It answers with **every Rule that could win**: the Rules that reach the path, in config order,
ending at the first of them that carries no `types`. A Rule whose exclusion removes the path is not a
candidate and cannot end the list. Each candidate is its own block with its Rule's `ruleId` and
`intent` and its requirements: `{ types?, maxLevel?, headings? }`, copied verbatim from the Rule with
an omitted key staying omitted, per-heading `intent` included. That is the Steering payload. A block
with no `types` applies to any type; one with `types` applies when the file's `type` is one of them,
and the first applicable block in config order is the Rule that will judge it. This amends
[`0011-claim-is-what-a-module-asks-of-a-path.md`](./0011-claim-is-what-a-module-asks-of-a-path.md): a
claim is what one Rule of one Module would ask of one path, and a Module whose winner depends on file
content answers with one per candidate Rule. `invisible` keeps its wire spelling and now means "no
Rule of any Module could reach this path", not "this path is not governed".

**`--audit`** tallies a Rule's `won`, `shadowed`, `shadowedBy` and `excluded` over all three axes, so
the Module port's `audit` takes the corpus root, as `check` does, and the first Module ignores it. It
opens every file `--check` opens, plus every file a typed Rule excludes, because `excluded` needs
the `type`. A candidate that cannot be read refuses the audit at exit 2. The `selector` echo gains a
`types` list, absent when the Rule wrote none. An audit includes every declared Module, an empty
`{ module, rules: [] }` block for one with no section, as
[`0010-module-dimension-in-audit-and-assess.md`](./0010-module-dimension-in-audit-and-assess.md) says.

**`--assess`** has no freshness claim to make. The Module passes every path by, so a file governed
only by `body-structure` reads `ungoverned` in an Assessment. That imprecision is named and left
open: a state for "governed, nothing to assess" belongs to a later change to the Assessment
vocabulary.

## Consequences

1. Adding the Module is one descriptor and one entry in the declared Module set, plus the import-graph
   rule's explicit Module list. The Core still knows no Module by name.
2. A consumer of `Violation` that assumed every member has a `field` key must narrow on `violation`
   first. The new family has no `field`.
3. `ModuleDescriptor.audit` takes the corpus root and `--query` composition accepts a list of claims
   from one Module. Both are Core-vocabulary changes the implementation makes once, and both leave the
   first Module's wire output byte-identical.
4. The setext-continuation indentation question round one left open is settled by 0014 and the
   Conformance corpus: a two-line heading's content is its lines joined by one line feed, each line as
   the lexer returns it. The corpus pins no indented continuation line, so that remains implementation
   behaviour, named here so it is not mistaken for a specified one.
