# Authoring a `body-structure` section

Reference for the `Convert a document template into a rule over its headings` row of `SKILL.md`, and
for any `body-structure:` rule added or changed from `authoring-a-config.md`.

A kind of document usually keeps its template as prose: a docs template, a skill asset, a sentence
saying "a decision record has Status, Context and Decision". Nothing checks it. The `body-structure:`
section moves the template into the config, so one declaration steers the agent that writes the file
and checks the file afterwards.

The workflow is `authoring-a-config.md`'s: one Rule at a time, with `mh --query`, `mh --audit` and
`mh --check` as the loop. This file holds what differs for headings. The **Operator** is the person who
approves each Rule and decides what a finding means; the **Contributors** are the people and agents who
write the documents it governs.

**No config yet?** Author the file first through `authoring-a-config.md`, then return here with it in
front of you. A config needs one section, not both, so its first Rule may be a `body-structure:` one.

## 1. Find the template

Look where a template hides: `docs/templates/`, a skill's assets, an `AGENTS.md` section, the first
page of a folder of look-alikes. Read two or three real documents of the kind and list their
headings. The Operator confirms which headings are the template and which are one author's habit.

_Done when_ you can state the template as a numbered list: each heading's level, what it may say,
whether it may be absent, whether it repeats, whether its title is one of a fixed set, which headings
belong inside it rather than beside it, which kinds of block sit under it (paragraphs, a numbered list, a bulleted
list), and how the kind is told apart, by its folder or by its `type`.

## 2. Choose what the Rule selects

A Rule selects on `folders:`, `fileNames:` (the literal axes `authoring-a-config.md` step 2 describes)
and `types:`, a list of frontmatter `type` values compared exactly, case included. Every axis the Rule
writes must match, and an absent axis means every. Rules are ordered and the first match is the
complete set of constraints, so a narrow Rule goes above a broad one.

**Here `type` selects; it never constrains.** A missing, empty or misspelt `type` selects no Rule, so
the file goes ungoverned and nothing says so. Prefer `folders:` when the kind lives in a folder. When
only `type` tells the kind apart, pair the Rule with a `frontmatter:` Rule that requires `type` and
lists its `allowed` values, because the two sections never read each other.

`mh --query` answers with every Rule that could win a path, in config order, each with the `types` it
needs: a path alone cannot say which `type` the file will carry.

_Done when_ the Operator has named the paths or types the Rule governs, and a `types:` Rule has its
`frontmatter:` partner or the Operator has said why not.

## 3. Write the spine

The Rule's `headings:` list is its **spine**: the ordered headings a document of the kind has. Each
entry has a `purpose` and a `level` (1 to 6):

- A **`heading`** is a fixed part of the spine, exactly one heading. `presence: optional` makes it
  present-or-absent. It takes no counts.
- An **`enumeration`** is a repeating heading whose text is not known ahead, counted by `minCount`
  and `maxCount`, at least one of them. `minCount: 0` is its optional. It takes no `presence`, and it
  never pins one title: a fixed title is a `heading`.

An entry matches a heading by `level` and by its title, named either by a `pattern` or by an `allowed`
list (step 4), and an entry with neither matches any heading at its level. Only top-level headings
count: a `#` inside a fence, a blockquote, a list item or the frontmatter is not a heading. An
enumeration ends at the first heading a later entry matches, so a Conclusion entry written after a run
of Sources keeps the run from taking it. A list of entries may sit under one heading, which is step 5.

**Write an `intent` on every entry that carries a `pattern`.** A violation shows the Contributor the
entry as written, so an entry without an `intent` shows a raw regular expression.

```yaml
body-structure:
  rules:
    - ruleId: research-report
      folders: [docs/research/]
      intent: 'A report has one title, a Findings section and one section per source, so a reviewer finds the evidence without hunting.'
      headings:
        - { purpose: heading, level: 1, intent: 'What the report is about.' }
        - { purpose: heading, level: 2, pattern: '^Findings$', intent: 'What was measured, with numbers.' }
        - {
            purpose: enumeration,
            level: 2,
            pattern: '^Source: ',
            minCount: 1,
            intent: 'One section per source consulted.',
          }
```

A key an entry may not carry, or a count range turned around, comes back from the exit-2 loop with its
location; let it say so rather than guessing.

_Done when_ every line of the template from step 1 is an entry, is set aside for step 5 (a heading that
belongs under another heading), or the Operator has dropped it.

## 4. Name every title exactly

An entry names the titles it accepts one of two ways, never both: a `pattern` beside `allowed` is
`CONFIG_PATTERN_WITH_ALLOWED` at `allowed`.

- **`allowed`** is a list of exact titles, `{ title, intent? }` each, the same shape as a frontmatter
  `allowed` value. Use it for a fixed title or a fixed set: `allowed: [{ title: Decision }]`. A title
  matches whole, exactly and case-sensitively, never searched, so `### added` fails against `Added`
  and `## Decision record` fails against `Decision`. A title is compared with the heading's raw source,
  so `### **Added**` is `**Added**`. On an enumeration a title may repeat inside the run, as a pattern
  match may. A title an earlier item of the same list holds is `CONFIG_DUPLICATE_VOCABULARY_TITLE`.
- **`pattern`** is a regular expression, for a shape: a prefix such as `^Source: `, or a length.

**Prefer `allowed` for a fixed title. When a pattern names one anyway, anchor it: `^Decision$`, with any regular-expression
metacharacter escaped (`^C\+\+$`). Drop the anchors only when the Operator asks for a substring
match.** A pattern is _searched_, so an unanchored `Decision` also passes `## Decisions` and
`## Decision record`: the entry loosens silently, and the check stays green over headings nobody
meant to allow. A prefix is `^Source: ` and a suffix is ` Report$`.

On `## Decision record` alone, an entry with `Decision` passes the file, and the same entry with
`^Decision$` reports `BODY_STRUCTURE__HEADING_MISSING`.

A pattern is tried against the heading's raw source, so `## **Findings**` is `**Findings**` and
`^Findings$` misses it. Matching is case-sensitive: `^[Ff]indings$` accepts both, and `^.{1,40}$` is
a length. The dialect is ECMAScript with the `u` flag. **Single-quote every pattern**: an unquoted
`^Source: ` carries a `: ` and the config is rejected as `CONFIG_NOT_YAML`.

_Done when_ every fixed title is an `allowed` item or an anchored pattern, and each unanchored pattern
is one the Operator asked for.

## 5. Nest the headings that belong under a heading

A `heading` or an `enumeration` entry may carry its own **`headings:`** list, a **nested spine**. It is
checked over the headings under each heading the entry claims: the headings after it, up to the next
heading at its level or shallower. That is wider than the heading's own section (step 6), which ends
at the next heading of any level. An enumeration's nested list is checked again under every repeat,
so every release of a changelog gets the same sub-template, and a sub-template never reaches into the
next release. A nested list has the same grammar as the Rule's own and nests again, down to level 6.
Every entry in it sits deeper than its parent; one that does not could never match, and is
`CONFIG_NESTED_ENTRY_NOT_DEEPER` at its `level`. A heading under a parent the walk never claimed, a
missing or repeated one, has no nested list checked under it.

A strict [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) file: one optional entry per change
type, in the convention's order, under every release.

```yaml
body-structure:
  rules:
    - ruleId: changelog
      folders: [docs/changelog/]
      intent: 'A changelog has one title and a heading per release, and each release lists its changes under at most one heading per change type, in the order Keep a Changelog gives them.'
      undefinedHeadings: forbid
      headings:
        - { purpose: heading, level: 1, allowed: [{ title: Changelog }], intent: 'The file is the changelog.' }
        - purpose: enumeration
          level: 2
          pattern: '^\['
          minCount: 1
          intent: 'One section per release, newest first.'
          headings:
            - { purpose: heading, level: 3, presence: optional, allowed: [{ title: Added, intent: 'New features.' }] }
            - {
                purpose: heading,
                level: 3,
                presence: optional,
                allowed: [{ title: Changed, intent: 'Changes in existing functionality.' }],
              }
            - {
                purpose: heading,
                level: 3,
                presence: optional,
                allowed: [{ title: Deprecated, intent: 'Soon-to-be removed features.' }],
              }
            - {
                purpose: heading,
                level: 3,
                presence: optional,
                allowed: [{ title: Removed, intent: 'Now removed features.' }],
              }
            - { purpose: heading, level: 3, presence: optional, allowed: [{ title: Fixed, intent: 'Any bug fixes.' }] }
            - {
                purpose: heading,
                level: 3,
                presence: optional,
                allowed: [{ title: Security, intent: 'In case of vulnerabilities.' }],
              }
```

Against that Rule, a second `### Added` inside one release is `HEADING_REPEATED`, `### Fixed` before
`### Added` in one release is `HEADING_OUT_OF_ORDER`, and a `### Added` written before the first
release belongs to no release, so under `forbid` it is `HEADING_UNDEFINED`. Each release is checked on
its own, so `Added` may follow the previous release's `Fixed`. An Operator who wants the change types
in any order and any number of times writes one enumeration instead, `minCount: 0` with all six titles
in its `allowed` list.

A decision record whose fixed sections each carry their own sub-sections:

```yaml
body-structure:
  rules:
    - ruleId: decision-records
      folders: [docs/decisions/]
      intent: 'A decision record weighs at least two options and then states what follows, good and bad.'
      headings:
        - { purpose: heading, level: 1, intent: 'The decision, as a short noun phrase.' }
        - { purpose: heading, level: 2, allowed: [{ title: Context }] }
        - purpose: heading
          level: 2
          allowed: [{ title: Options, intent: 'The choices weighed, one heading each.' }]
          headings:
            - { purpose: enumeration, level: 3, pattern: '^Option ', minCount: 2, intent: 'One option per heading.' }
        - { purpose: heading, level: 2, allowed: [{ title: Decision }] }
        - purpose: heading
          level: 2
          allowed: [{ title: Consequences }]
          headings:
            - { purpose: heading, level: 3, allowed: [{ title: Positive }], mayHold: [unordered-list] }
            - { purpose: heading, level: 3, allowed: [{ title: Negative }], mayHold: [unordered-list] }
```

An `### Option B` written under `## Decision` is not counted toward `Options`: the headings under
`## Options` end at `## Decision`. Nesting is the only way to say where a heading belongs: there is no form that admits a
title at a level wherever it sits.

_Done when_ every heading that belongs under another heading is in that entry's nested list,
and every nested entry is deeper than its parent.

## 6. Say what a section may hold

A **section** is the blocks under a heading, up to the next heading of any level. A heading entry of
either purpose may carry **`mayHold`**, the kinds of block its section may hold. There are three
kinds, `prose` (a paragraph), `ordered-list` and `unordered-list`. The list is an **allowed set**: any
mix, any order, any count of the kinds named, and a block of a kind not named is a violation.
**Leave `mayHold` off a section the Operator leaves permissive**: an omitted key holds anything, and
that is the default every existing Rule relies on. On an enumeration it applies to each repeat.

```yaml
body-structure:
  rules:
    - ruleId: adr-contract
      folders: [docs/adr/]
      types: [adr]
      intent: 'An ADR has a title and six sections in a fixed order: its context is prose, its decisions are numbered anchors each holding a numbered list, its do and dont blocks are numbered lists, its consequences and compliance sections mix prose with numbered lists, and its references are a bulleted list.'
      undefinedHeadings: forbid
      headings:
        - { purpose: heading, level: 1, intent: 'The decision, as a short noun phrase.' }
        - { purpose: heading, level: 2, pattern: '^Context$', mayHold: [prose], intent: 'Why the decision is needed.' }
        - { purpose: heading, level: 2, pattern: '^Decision$', intent: 'The numbered anchors, each a subsection.' }
        - {
            purpose: enumeration,
            level: 3,
            pattern: '^[0-9]+\. ',
            minCount: 1,
            mayHold: [ordered-list],
            intent: 'One numbered anchor per decision.',
          }
        - { purpose: heading, level: 2, pattern: "^Do's and Don'ts$", intent: 'The rules in short form.' }
        - { purpose: heading, level: 3, pattern: "^Do's$", mayHold: [ordered-list], intent: 'What to do.' }
        - { purpose: heading, level: 3, pattern: "^Don'ts$", mayHold: [ordered-list], intent: 'What not to do.' }
        - {
            purpose: heading,
            level: 2,
            pattern: '^Consequences$',
            mayHold: [prose, ordered-list],
            intent: 'What gets easier and harder, under a bold label per list.',
          }
        - {
            purpose: heading,
            level: 2,
            pattern: '^Compliance and Enforcement$',
            mayHold: [prose, ordered-list],
            intent: 'How the decision is held, in paragraphs and numbered lists.',
          }
        - {
            purpose: heading,
            level: 2,
            pattern: '^References$',
            mayHold: [unordered-list],
            intent: 'Where to read more.',
          }
```

That is a prose template turned into a Rule: an ADR contract that says "context is prose, each decision
is a numbered list, references are bullets" is this list, and the spine and the block kinds are
declared once, so the agent that writes an ADR reads both before it writes.

What the Operator should hear before approving a `mayHold`:

- **A bold label is prose.** `**Positive:**` ahead of a list is a paragraph, so a section that lists
  only `ordered-list` fails on it, and a section with captioned lists lists both kinds, as
  `Consequences` does above.
- **Fences, tables, quotes, HTML, thematic breaks and link definitions are neither allowed nor refused.**
  The kinds have no name for them, so a section that lists only `ordered-list` may still hold a fence or
  a table without a finding.
- **A list inside a list item belongs to the outer list.** A paragraph at the left margin splits one
  list into two, and the paragraph is reported.
- **An empty section passes**: `mayHold` is a permission, not a requirement. `mayHold: []`
  is `CONFIG_EMPTY_CONSTRAINT` and a kind outside the three, `code` included, is `CONFIG_INVALID_VALUE`
  at the element. A section meant to hold nothing but subsections, such as `## Decision` above, has
  no spelling, so it carries no `mayHold` and a paragraph there passes.
- **A section answers to the entry that claimed its heading.** A section no entry claims stays
  unconstrained, a parent's `mayHold` stops at the parent's own blocks, and each anchor's section
  belongs to the anchor's entry. Blocks before the first heading sit outside every section.
- **Item shape stays with the Contributor.** The contract's `**DO**` prefix on every item is a
  convention inside a list, and no key reads it.

A section that holds a block of an unlisted kind is one `BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED` per
kind, with `entry`, `content`, `kind` and `found`, the count of blocks of that kind in the section. A
list counts once however many items it has.

_Done when_ every section the Operator wants held to a kind has a `mayHold`, every permissive section
has none, and the Operator has heard each caveat above, the bold label and the blocks no kind names
included.

## 7. Decide open or closed

By default a spine is **open**: the entries are an ordered subsequence of the document's headings, and
a heading no entry matches is permitted. That default lets the section join a knowledge base that
already exists without a finding on every page. Two Rule keys change it:

- **`maxLevel`** (1 to 6) is the deepest level allowed in an open spine. Headings deeper than it are
  one `BODY_STRUCTURE__LEVEL_TOO_DEEP` per level.
- **`undefinedHeadings`** is `allow` (the default, written out) or `forbid`, which **closes** the
  spine at every depth. A heading no entry matches at its position, at any level and the title
  included, is then one `BODY_STRUCTURE__HEADING_UNDEFINED` carrying its `level` and `content`, so a
  closed spine needs a level 1 entry. At its position means an entry of the Rule's own list, or of a
  nested list walked under a heading it sits under. Any other value, `closed` or `Forbid` included, is `CONFIG_INVALID_VALUE`.

Only `forbid` excludes `maxLevel`: `allow` beside `maxLevel` is valid, and `maxLevel` beside `forbid`
is `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE` at `maxLevel`. Either repair works, and the Operator chooses:
delete `maxLevel`, since a closed spine already forbids every depth it does not name, or write `allow`
to keep the depth limit. A Rule that writes `allow` and nothing else asks nothing of a body and is
`CONFIG_EMPTY_CONSTRAINT`; `forbid` alone is legal and says the kind has no headings.

```yaml
body-structure:
  rules:
    - ruleId: decision-records
      folders: [docs/decisions/]
      types: [decision]
      intent: 'A decision record states its status, context and decision, and no other section.'
      undefinedHeadings: forbid
      headings:
        - { purpose: heading, level: 1, intent: 'The decision, as a short noun phrase.' }
        - { purpose: heading, level: 2, allowed: [{ title: Status, intent: 'Proposed, accepted or superseded.' }] }
        - {
            purpose: heading,
            level: 2,
            allowed: [{ title: Context, intent: 'The forces that made the decision necessary.' }],
          }
        - { purpose: heading, level: 2, allowed: [{ title: Decision, intent: 'What was decided, and why.' }] }
        - {
            purpose: heading,
            level: 2,
            allowed: [{ title: Consequences, intent: 'What gets easier and what gets harder.' }],
            presence: optional,
          }
```

A heading some entry matches at its position (step 5) is not undefined. A second `## Decision` is `HEADING_REPEATED` and a
misplaced `## Context` is `HEADING_OUT_OF_ORDER`, each reported by its entry. In a closed spine an
enumeration's run holds its repeats and nothing else. `mh --query` copies `undefinedHeadings` into its
answer, so an agent about to write the file hears that no other heading is welcome.

**Closing is the Operator's choice, and open is where to start.** A closed spine reports one violation
per stranger, so its report grows with the document. It fits a templated kind. A kind whose authors add
sections of their own stays open.

_Done when_ the Operator has said open or closed for this Rule, and a closed Rule has no `maxLevel`.

## 8. Propose the Rule, and wait

Put the Rule in front of the Operator in their terms before the file changes: which paths or types it
governs, the spine as a numbered list (level, what the heading says, absent or repeated, and the block
kinds it holds when it has a `mayHold`), each nested list under the heading it belongs to, whether it is open or
closed and what that means for a document with an extra section, and the `intent` sentence. Do not
write it to the config until the Operator approves it.

_Done when_ the Operator has approved this Rule in words, and you have written it.

## 9. Verify, then read what the check says

```sh
mh --query docs/decisions/anything.md --config markdown-harness.config.yaml
```

Read the candidates back: the `types`, `undefinedHeadings` and every entry at every depth, `allowed`
and `mayHold` included, should be what the Operator approved. Exit 2 names the key to fix in `location`, as `authoring-a-config.md` step 4 says, and
`mh --audit` (step 5 there) shows whether the Rule wins the files meant.

Then run `mh --check`. It takes no path and reads the whole corpus, so read the findings for the files
the new Rule governs, filtered by `ruleId`; when the report is large, group it by code before deciding
anything. Each spine violation names its `entry`, the path of zero-based indexes from the Rule's
`headings:` down (`[1]` is the second top-level entry, `[1, 0]` the first entry of its nested list), and
a violation inside a nested list also names `under`, the raw text of the heading the list was checked
under, so the Contributor knows which release to fix. `HEADING_UNDEFINED` names a `level` and the
`content` found instead, and `LEVEL_TOO_DEEP` a `level` and a `found` count. `BLOCK_KIND_NOT_ALLOWED`
names the `entry` that claimed the heading, its `under` when nested, the section's `content`, the `kind`
and how many were `found`.

`SKILL.md`'s line holds here: the tool reports, and the Operator decides, one finding at a time. A
finding means the document is wrong and a Contributor fixes it, or the Rule is wrong and the Operator
changes it (a missing entry, an optional title, `allow` instead of `forbid`), or it waits. Edit a
document only when the Operator asks, and never to turn a count green.

_Done when_ `--query` shows the approved Rule, and the Operator has decided what to do about each
finding the Rule's files carry.
