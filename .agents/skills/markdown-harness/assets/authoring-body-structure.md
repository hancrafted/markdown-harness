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
whether it may be absent, whether it repeats, which kinds of block sit under it (paragraphs, a
numbered list, a bulleted list), and how the kind is told apart, by its folder or by its `type`.

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

An entry matches a heading by `level` and `pattern` together, and an entry with no `pattern` matches
any heading at its level. Only top-level headings count: a `#` inside a fence, a blockquote, a list
item or the frontmatter is not a heading. The spine is flat. An enumeration ends at the first heading a
later entry matches, so a Conclusion entry written after a run of Sources keeps the run from taking it.

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

_Done when_ every line of the template from step 1 is an entry, or the Operator has dropped it.

## 4. Anchor every title

**When a pattern names a fixed title, anchor it: `^Decision$`, with any regular-expression
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

_Done when_ every fixed title is anchored, and each unanchored pattern is one the Operator asked for.

## 5. Choose a vocabulary or a pattern

Two keys decide which titles a heading may carry, and each answers a different question.

- **A `pattern`** on an entry says what the heading at that place in the spine looks like, so use it
  for a fixed title (`^Decision$`), a shape (`^Source: `), or whenever order or count matters.
- **A `vocabulary`** says which exact titles a level may take wherever it sits in the document, so use
  it when the same few titles repeat under every section, as `### Added` and `### Fixed` do under
  every release of a changelog.

A vocabulary is a Rule key beside `headings:`, a list of `{ level, allowed }` items with one item per
level. It is a **set**: any order, any number of times. "`Added` before `Changed`" and "one `### Added`
per release" cannot be said, and an Operator who wants either has asked for a convention this key does
not hold. A title matches whole, exactly and case-sensitively, so `### added` fails against `Added`,
and a title is compared as the heading's raw source, so `### **Added**` is `**Added**`.

```yaml
body-structure:
  rules:
    - ruleId: changelog
      folders: [docs/changelog/]
      intent: 'A changelog has one title and a heading per release, and the headings under a release come from one fixed set, in any order and any number of times.'
      headings:
        - { purpose: heading, level: 1, pattern: '^Changelog$', intent: 'The file is the changelog.' }
        - {
            purpose: enumeration,
            level: 2,
            pattern: '^\[',
            minCount: 1,
            intent: 'One section per release, newest first.',
          }
      vocabulary:
        - { level: 3, allowed: [Added, Changed, Deprecated, Removed, Fixed, Security] }
```

A third-level heading outside the list is one `BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY`, carrying
its `level`, its `content` and the `requirement`, which is the vocabulary item, so the Contributor
reads the six titles in the finding that names the seventh. It is never `HEADING_OUT_OF_ORDER`.

**A level is walked by entries or held to a vocabulary, never both.** An entry at level 3 beside a
vocabulary for level 3 is `CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES` at the vocabulary's `level`, and
`allowed:` written on an entry is `CONFIG_UNRECOGNISED_KEY`: the list belongs to `vocabulary:`. The
workaround an enumeration invites, six enumerations each pinned to one title as `^Added$`, is
`CONFIG_ENUMERATION_PINS_TEXT`, which is why a vocabulary exists. A vocabulary heading's section is
judged by nothing: `vocabulary` carries no `mayHold`.

_Done when_ each level whose titles are a fixed set is a vocabulary item, each fixed title elsewhere is
an anchored `pattern`, and no level is in both.

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
            intent: 'What gets easier and harder, with a bold label ahead of each list.',
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
  `Consequences` and `Compliance and Enforcement` do above.
- **Fences, tables, quotes, HTML, thematic breaks and link definitions are neither allowed nor refused.**
  The kinds have no name for them, so a section that lists only `ordered-list` may still hold a fence or
  a table without a finding.
- **A list inside a list item belongs to the outer list.** A paragraph at the left margin splits one
  list into two, and the paragraph is reported.
- **An empty section passes**, because `mayHold` is a permission and never a requirement. `mayHold: []`
  is `CONFIG_EMPTY_CONSTRAINT` and a kind outside the three, `code` included, is `CONFIG_INVALID_VALUE`
  at the element. A section meant to hold nothing but subsections, such as `## Decision` above, has
  no spelling, so it carries no `mayHold` and a paragraph there passes.
- **A section no entry claims is judged by nobody**, and a parent's `mayHold` never reaches its
  subsections: each anchor's section belongs to the anchor's entry. Blocks before the first heading
  belong to no section.
- **Item shape is not checkable.** The contract's `**DO**` prefix on every item is a convention inside
  a list, and no key reads it.

A section that holds a block of an unlisted kind is one `BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED` per
kind, with `entry`, `content`, `kind` and `found`, the count of blocks of that kind in the section. A
list counts once however many items it has.

_Done when_ every section the Operator wants held to a kind has a `mayHold`, every permissive section
has none, and the Operator has heard the bold-label and transparent-block limits.

## 7. Decide open or closed

By default a spine is **open**: the entries are an ordered subsequence of the document's headings, and
a heading no entry matches is permitted. That default lets the section join a knowledge base that
already exists without a finding on every page. Two Rule keys change it:

- **`maxLevel`** (1 to 6) is the deepest level allowed in an open spine. Headings deeper than it are
  one `BODY_STRUCTURE__LEVEL_TOO_DEEP` per level.
- **`undefinedHeadings`** is `allow` (the default, written out) or `forbid`, which **closes** the
  spine. A heading no entry matches and no vocabulary admits, at any level and the title included, is then one
  `BODY_STRUCTURE__HEADING_UNDEFINED` carrying its `level` and `content`, so a closed spine needs a
  level 1 entry. Any other value, `closed` or `Forbid` included, is `CONFIG_INVALID_VALUE`.

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
        - { purpose: heading, level: 2, pattern: '^Status$', intent: 'Proposed, accepted or superseded.' }
        - { purpose: heading, level: 2, pattern: '^Context$', intent: 'The forces that made the decision necessary.' }
        - { purpose: heading, level: 2, pattern: '^Decision$', intent: 'What was decided, and why.' }
        - {
            purpose: heading,
            level: 2,
            pattern: '^Consequences$',
            presence: optional,
            intent: 'What gets easier and what gets harder.',
          }
```

A heading some entry matches, or a vocabulary admits, is never undefined, and a heading outside a
vocabulary is reported as that and never also as undefined. That is how a closed spine governs a
changelog: the release headings are claimed by an enumeration and the interleaved third-level headings
by the vocabulary from step 5, so `undefinedHeadings: forbid` beside it adds only the strangers at
other levels. A second `## Decision` is `HEADING_REPEATED` and a
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
kinds it holds when it has a `mayHold`), each vocabulary as its level and titles, whether it is open or
closed and what that means for a document with an extra section, and the `intent` sentence. Do not
write it to the config until the Operator approves it.

_Done when_ the Operator has approved this Rule in words, and you have written it.

## 9. Verify, then read what the check says

```sh
mh --query docs/decisions/anything.md --config markdown-harness.config.yaml
```

Read the candidates back: the `types`, `undefinedHeadings`, every `vocabulary` item and every entry,
`mayHold` included, should be what the Operator approved. Exit 2 names the key to fix in `location`, as `authoring-a-config.md` step 4 says, and
`mh --audit` (step 5 there) shows whether the Rule wins the files meant.

Then run `mh --check`. It takes no path and reads the whole corpus, so read the findings for the files
the new Rule governs, filtered by `ruleId`; when the report is large, group it by code before deciding
anything. Each spine violation names its `entry`, the zero-based index in `headings:`, except
`HEADING_UNDEFINED` and `HEADING_NOT_IN_VOCABULARY`, which name a `level` and the `content` found, and
`LEVEL_TOO_DEEP`, which names a `level` and a `found` count. `BLOCK_KIND_NOT_ALLOWED` names the `entry`
that claimed the heading, the section's `content`, the `kind` and how many were `found`.

`SKILL.md`'s line holds here: the tool reports, and the Operator decides, one finding at a time. A
finding means the document is wrong and a Contributor fixes it, or the Rule is wrong and the Operator
changes it (a missing entry, an optional title, `allow` instead of `forbid`), or it waits. Edit a
document only when the Operator asks, and never to turn a count green.

_Done when_ `--query` shows the approved Rule, and the Operator has decided what to do about each
finding the Rule's files carry.
