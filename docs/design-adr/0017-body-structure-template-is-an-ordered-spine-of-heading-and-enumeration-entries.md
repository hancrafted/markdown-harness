---
type: design-adr
status: accepted
---

# The heading template is one ordered spine of `heading` and `enumeration` entries, plus an optional `maxLevel`

**Supersedes `0013-body-structure-template-is-level-counts-and-an-ordered-entry-subsequence`**, a
round-one record that exists only on the branch `prototype/body-structure-module`. That record gave
a Rule two payload keys: `levels:`, a closed set of per-level counts, and `headings:`, an ordered
subsequence of titled or prefixed entries. Round two removes `levels:` entirely. A Rule's payload is
now `headings:`, an ordered list that is the document's spine, and `maxLevel:`, one optional scalar.
Either may be written alone, and a Rule carries at least one. The numbers 0013, 0015 and 0016 are
not used on this branch: they were round-one records, and 0017 to 0020 replace them.

## The entry

A heading entry is `{ purpose, level, pattern?, presence?, minCount?, maxCount?, intent? }`.

- `purpose` is mandatory and is `heading` or `enumeration`. There is no default, so a reader of a
  diff never has to know which one was meant.
- A **`heading`** is a fixed part of the spine: the title, a section, sometimes a subsection. It is
  **exactly one heading**. It may carry `presence: optional`, which makes it present-or-absent and
  never misplaced and never repeated. It never carries `minCount` or `maxCount`.
- An **`enumeration`** is a repeating heading whose text is not known ahead of time. It carries
  `minCount`, `maxCount` or both, which count **the repeats of that entry and of nothing else**,
  never all headings at a level. It never carries `presence` (`minCount: 0` is its spelling of
  optional) and never pins one fixed text: a pattern that can match only one string is a `heading`.
- `pattern` is a regular expression over the heading's raw content, as
  [`0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md`](./0014-headings-are-top-level-block-headings-read-by-a-bought-parser.md)
  defines that content. It replaces round one's `title` and `prefix`. A fixed title is an anchored
  pattern; prefixes, suffixes, sentence shapes and lengths all live in it. There are no `minLength`
  or `maxLength` keys. The dialect is
  [`0018-heading-patterns-are-ecmascript-regular-expressions-with-the-u-flag.md`](./0018-heading-patterns-are-ecmascript-regular-expressions-with-the-u-flag.md).
  An entry with no `pattern` matches any heading at its level.
- `intent` is optional on every entry, and is the human-readable counterpart to the pattern. It is
  never enforced and is Steering content.
- An entry **matches** a heading when the heading's level equals the entry's `level` and the pattern,
  if written, matches the heading's raw content.

`maxLevel` is an integer from 1 to 6 on the Rule. **Omitted, any depth is permitted**: levels are
open by default, and forbidding depth is an explicit act. A heading deeper than `maxLevel` is
reported once per level. Round one inverted this, closing every level a Rule did not list.

## The spine walk, in full

The outline is the ordered list of top-level headings of the body, each `(level, content)`. Entries
are processed in index order with one **cursor** that starts at the first heading. A heading is
**claimed** when an entry takes it.

For a **`heading` entry**, the first unclaimed heading at or after the cursor that matches is its
claim, and the cursor moves just past it. When none matches: if an unclaimed matching heading exists
before the cursor, the entry is `HEADING_OUT_OF_ORDER`, required or optional; otherwise it is
`HEADING_MISSING` when required and satisfied silently when optional. The cursor does not move on a
failure.

For an **`enumeration` entry**, its **run** is every heading matching it from the cursor to the first
heading at or after the cursor that matches **any later entry** of the spine, or to the end of the
outline when none does. Headings in the run that match no later entry and do not match the
enumeration are left alone and may interleave freely. The enumeration's repeats are the headings of
the run that match it, the cursor moves just past the last of them, and a run with no repeat leaves
the cursor where it was.

After every entry, each heading nobody claimed and no run took is a **leftover**, and is given to
the first rule that applies:

1. it matches a `heading` entry that has claimed a heading: the lowest-index such entry is repeated;
2. it matches an enumeration: the lowest-index such enumeration found it **outside its run**;
3. otherwise it is unclaimed and constrained by `maxLevel` alone.

A leftover matching a `heading` entry that claimed nothing is already reported by that entry as missing
or out of order, so it is never reported twice.

Violations, in this order: every level beyond `maxLevel`, ascending by level; then each entry by
index. For a `heading` entry: missing or out of order, then repeated with `found` as one plus its
repeats. For an `enumeration`: out of order when any of its repeats lay outside the run, then below
its minimum or above its maximum, where `found` is the repeats inside the run **plus those outside
it**. Counting wherever a repeat sits and judging place apart means a misplaced repeat is one
violation and a missing one is another, and the Contributor is never told to add a heading that
already exists.

## Decisions, each with its reason

1. **An enumeration sits in the spine at one position**, not several. A position is what a template
   says and what `--query` hands an agent to write; two positions for one repeating heading would
   have the template contradict itself the first time a document interleaved them.
2. **Other headings may interleave an enumeration's repeats**, provided no later entry claims them.
   Sections and their subsections interleave in every real document, and the alternative, a run
   broken by any heading at or above the enumeration's level, makes a deeper heading between two
   sources a fault nobody meant to forbid. The one thing that ends a run is a later entry, because
   that is exactly what "ordered" means.
3. **A `heading` entry claims before an enumeration, and an enumeration yields to every later entry.**
   A page that opens with an Intro, then any sections, then a Conclusion needs an unpatterned
   enumeration between two patterned `heading` entries. Without the yield, the enumeration would
   swallow the Conclusion and the last entry would be reported out of order for a document that is
   right. The cost is that an enumeration cannot claim a heading a later entry also matches, which an
   Operator reads off the spine.
4. **A `heading` entry is exactly one.** "Exactly one title" is a `heading` entry at level 1, and the
   second title is `HEADING_REPEATED`. With `levels:` gone there is no other place to say it, and
   open depth must not mean open counts.
5. **An optional `heading` is allowed**, as in round one: present-or-absent, never misplaced. A
   Consequences section that may be left out may not sit before Decision.
6. **Greedy matching, as in round one**, because a subsequence check with backtracking can give two
   readings of one file, and tenet 1 asks that every check be a comparison a person could reproduce
   by hand. The reported entry is the first that cannot be placed after its predecessors, which is not
   always the one an author moved.

## Consequences

1. **The spine is flat.** A subsection that repeats under every section, a third-level heading under
   each of several second-level ones, cannot be said: an enumeration is one run at one position.
   `maxLevel` permits such headings and nothing counts them. A nested template is a later feature and
   needs its own record.
2. **There is no loosening direction anywhere in this Module.** Round one's table assigned a direction
   to every key, and this record does not carry it, at the Operator's instruction: detection of a
   loosened template is a possible later feature and is out of scope. That strains the architecture
   vision's first decision that is cheap now and expensive later, and its warning that a detection pass
   covering half the keys is worse than none. It holds because nothing here ships a detection pass: a
   Module with none cannot certify a diff it never read. The cost is paid in retrofitting, and is one
   reason the key set is small.
3. **`levels:` is a refused key.** A round-one config carrying it is rejected by name, which
   [`0020-body-structure-config-validation-per-purpose.md`](./0020-body-structure-config-validation-per-purpose.md)
   freezes, so nothing is misread silently.
4. **Every entry's `requirement`, in a report, is the entry verbatim**, `pattern` and `intent` included,
   as [`0019-body-structure-violations-name-the-spine-entry.md`](./0019-body-structure-violations-name-the-spine-entry.md)
   says. The first Module makes `intent` mandatory beside a `pattern` so the raw expression never leaks
   into a message; here `intent` stays optional by instruction, so an entry without one shows the
   Contributor its expression. The Rule's own `intent` is always present and always travels with it.

## Considered options

**Round one's two keys.** Rejected by instruction: counts that belong to a level cannot say "exactly
one title and at least one source" when the sources are not all the second-level headings. **Counts on
every entry, with `purpose` as a hint.** Rejected: a counted fixed heading and a fixed repeating
heading are different statements, and a key that means two things is how a template drifts. **One
position per repeat, so an enumeration is several consecutive entries.** Rejected under decision 1.
**A run that ends at any heading at its own level.** Rejected under decision 2.
