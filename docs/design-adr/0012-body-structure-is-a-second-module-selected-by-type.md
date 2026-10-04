---
type: design-adr
status: accepted
---

# A second Module, `body-structure`, governs a body's headings, and `type` is its selector rather than a Constraint

A document kind's template lives today as prose in a skill asset or a docs template, which nothing
governs and nothing checks. The second Module moves that template into the config, so one
declaration steers the agent that writes the file and checks the file afterwards. Its top-level key
is **`body-structure`**, its Package is `body-structure-harness`, and its payload is the heading
structure of a Markdown body. Selection mirrors the first Module: an ordered rule list, the first
matching Rule wins, nothing merges and nothing inherits. A Rule selects on three axes, and **every
axis a Rule carries must match**: `folders:` and `fileNames:`, which are the Core's two literal axes
from [`0007-selector-is-two-literal-axes.md`](./0007-selector-is-two-literal-axes.md), and `types:`,
a list of literal frontmatter `type` values that this Module alone owns. At least one of the three is
required, an absent axis means every, and `excludeFiles:` is the Core's own selector and removes a
file from one Rule only. The spec this record serves is [#220](https://github.com/hancrafted/markdown-harness/issues/220).

**This widens the glossary's selector.** `CONTEXT.md` defines a selector as two literal axes,
folders and file names, and says nothing compares two selectors. The Core's selector is unchanged
and still two axes. What this Module's Rule selects on is that selector plus `types`, an axis whose
value is read out of the file rather than off its path, so "which files does this Rule select" now
has no answer without opening them. The glossary entry needs to say that a Module may add an axis of
its own to the Core's two, and that such an axis may depend on file contents; #220 lists the change.
The record does not edit `CONTEXT.md`.

**`type` changes role, and the two roles are not interchangeable.** In `frontmatter-harness` `type`
is a Constraint: a missing, empty or misspelled value is a violation the Contributor is told about.
Here it is a selector: a missing, empty, non-string or misspelled value simply selects nothing, and
the file falls through to a later Rule or to no Rule at all. The comparison is an exact,
case-sensitive string equality with no trimming, so `Research`, `research ` and `7` are not
`research`. A frontmatter block that does not parse, or never closes, has no readable `type` and
selects nothing. Same field, two jobs, two Modules. The cost is a silent failure mode that a Constraint
does not have: a misspelled `type` is **ungoverned rather than wrong**, which is the defect tenet 5
already names for first-match, now reachable through a typo.

The mitigations are real and partial. The first Module's `fields.type` with `presence: required` and an
`allowed` list reports the misspelling, but nothing checks that the two Modules' declarations agree,
and the config validation that would is out of scope for this prototype: the case where `type` is
optional for a path in `frontmatter` and used as a selector here is a gap #220 names, not one
this record closes. Until it closes, the standing assumption is that every Governed file carries a
valid `type`. `--audit` makes a Rule that wins nothing visible, which is the other half.

## Considered options

**A Rule payload key inside the `frontmatter:` section.** Rejected on the reasoning
[`0006-module-sections-and-module-wide-defaults.md`](./0006-module-sections-and-module-wide-defaults.md)
and the map for the folders-and-files Module ([#63](https://github.com/hancrafted/markdown-harness/issues/63)) already recorded: a key on the first Module's
payload is unreachable for a frontmatter-free file, because `frontmatter: forbidden` sets every
payload key to `never`, and it would make a section named for frontmatter govern what is not
frontmatter. 0006's consequence 3 anticipated `body:` for this Module; the key chosen is
`body-structure` instead, because `body:` would claim the whole region and a later Module governing
links, length or prose would have to take a name beside it. The key names the family of checks.

**`types:` as a third axis of the Core's `Selector`.** Rejected. The Core reads frontmatter without
learning what any field means, and a `Selector` carrying `types` would teach it that `type` is
special. The Core's selector stays two axes. This Module's Rule type extends it with the one axis
only it reads.

**Glob selectors, because the request #220 answers said "path glob".** Not available: the glob was
retired in 0007 and the config language admits none. The request's intent, selecting by location and
by file name, is exactly what `folders:` and `fileNames:` already do. Its illustrative
`path: [...**]` is therefore spelled `folders:` here, and a subtree is an enumeration its author
maintains: a folder token selects that folder alone, never a folder below it.

## Consequences

1. **A Rule that selects by `type` makes the winner a function of the file's bytes.** The first
   Module decides governance before any file is opened. This Module cannot: for every file some
   Rule reaches, meaning its folder and file-name axes match and its own `excludeFiles` does not
   remove it, `--check` must read the frontmatter to learn the `type`. A file no Rule reaches is
   still never opened. A `types`-only Rule reaches every
   path, so it opens every corpus member, and that cost belongs to the Operator who wrote it. A
   candidate that cannot be read is a refusal at exit 2, never a silent skip, for the reason the first
   Module's governed-file refusal already gives.
2. **`--query` cannot name one winner from a path alone.** Which Rule wins depends on a `type` the
   file may not yet have. The command answers with every Rule that could win, in config order, and the
   response says which `type` each one needs. That amends the glossary's claim, defined in 0011 as
   one per Module per path; see
   [`0019-body-structure-violations-name-the-spine-entry.md`](./0019-body-structure-violations-name-the-spine-entry.md).
3. **Relation to [#63](https://github.com/hancrafted/markdown-harness/issues/63).** That map plans a file-names Module with a shared `segments:` grammar and a
   `<module>__<outcome>` code grammar. This Module shares neither the subject nor the section name,
   uses no `segments:`, and adopts only the code grammar, which [#69](https://github.com/hancrafted/markdown-harness/issues/69) settled as the way a second
   Module spells its violation codes. Its key is not pending [#112](https://github.com/hancrafted/markdown-harness/issues/112), and the two Modules stay
   independent: neither names the other's section.
4. **`not-a-module` stays unclaimed, and so do `headings` and `links`.** The rejected-config tier
   keys its unrecognised-key cases on `not-a-module` precisely so no plausible Module name turns them
   red. `body-structure` claims none of the three, and no Module may claim them without moving those
   cases deliberately.
