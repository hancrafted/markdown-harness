# Authoring a `body-structure` section

Reference for the `Convert a document template into a rule` row of `SKILL.md`, and for any
`body-structure:` rule added or changed from `authoring-a-config.md`. The design-ADR numbers below
name decision records in the `markdown-harness` repository, under `docs/design-adr/`.

A kind of document usually keeps its template as prose: a docs template, a skill asset, a sentence
saying "a decision record has Status, Context and Decision". Nothing checks it. The `body-structure:`
section moves it into the config, so one declaration steers the agent that writes the file and checks
the file afterwards (design-ADR 0012).

The workflow is `authoring-a-config.md`'s, with one Rule at a time and `mh --query`, `mh --audit` and
`mh --check` as the loop. This file holds what differs. The **Operator** is the person who approves
the Rule; the **Contributors** are the people and agents who write the documents it governs.

## 1. Find the template

Look where a template hides: `docs/templates/`, a skill's assets, an `AGENTS.md` section, the first
page of a folder of look-alikes. Read two or three real documents of the kind and list their
headings. The Operator confirms which headings are the template and which are one author's habit.

_Done when_ you can state the template as a numbered list: each heading's level, what it may say,
whether it may be absent, whether it repeats, and what the kind is called in its `type` or its folder.

## 2. Choose what the Rule selects

A Rule selects on three axes, and every axis it writes must match: `folders:` and `fileNames:` (the
literal axes `authoring-a-config.md` step 2 describes) and `types:`, a list of frontmatter `type`
values compared exactly, case included. At least one axis is required, and an absent axis means every.
Rules are ordered and the first match is the complete set of constraints, so a narrow Rule goes above a
broad one.

**`type` is a selector here, never a constraint.** A missing, empty or misspelt `type` selects
nothing, so the file is ungoverned rather than wrong (design-ADR 0012). Prefer `folders:` when the kind
lives in a folder. When the kind is known only by its `type`, pair the Rule with a `frontmatter:` Rule
that requires `type` and lists `allowed` values, since the two sections never read each other.

**`--query` answers with candidates.** The winner can depend on a `type` the file does not have yet, so
the answer lists every Rule that could win, in config order, each with the `types` it needs.

_Done when_ the Operator has named the paths or types the Rule governs, and a `types:` Rule has a
`frontmatter:` Rule beside it or the Operator has said why not.

## 3. Write the spine

The Rule's `headings:` list is its **spine**: the ordered headings a document of the kind has. Beside
`ruleId`, a mandatory `intent` and the selector, a Rule carries `headings`, `maxLevel` and
`undefinedHeadings` (step 5). A Rule with none of `headings`, `maxLevel` and `undefinedHeadings: forbid`
asks nothing of a body and is `CONFIG_EMPTY_CONSTRAINT`. Each entry is one of two purposes:

- A **`heading`** is a fixed part of the spine, exactly one heading.
- An **`enumeration`** is a repeating heading whose text is not known ahead, counted by `minCount`
  and `maxCount`.

| Key                    | `heading`                             | `enumeration`                              |
| ---------------------- | ------------------------------------- | ------------------------------------------ |
| `purpose`, `level`     | both mandatory, `level` is 1 to 6     | both mandatory                             |
| `pattern`              | optional; none matches any heading    | optional, and never a pinned title         |
| `presence`             | `required` (default) or `optional`    | not allowed; `minCount: 0` is its spelling |
| `minCount`, `maxCount` | not allowed; a `heading` is exactly 1 | at least one of the two                    |
| `intent`               | optional                              | optional                                   |

A pinned title such as `^Findings$` on an enumeration is `CONFIG_ENUMERATION_PINS_TEXT`: write a
`heading`. Write an `intent` on every entry that carries a `pattern`. A violation shows the Contributor the
entry verbatim, so an entry without one shows a raw regular expression (design-ADR 0019).

An entry matches a heading by `level` and `pattern` together. Only a document's top-level headings
count: a `#` inside a fence, a blockquote, a list item or the frontmatter is not a heading. A
heading's content is its raw source, so `## **Findings**` is `**Findings**` and `^Findings$` misses
it (design-ADR 0014). The spine is flat, and an enumeration ends at the first heading a later entry
matches, so a Conclusion entry placed after a run of Sources keeps the run from swallowing it.

```yaml
body-structure:
  rules:
    - ruleId: research-report
      folders: [docs/research/]
      intent: 'A report has one title, a Findings section and one section per source, so a reviewer finds the evidence without hunting.'
      maxLevel: 3
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

_Done when_ every line of the template from step 1 is an entry, or the Operator has dropped it.

## 4. Anchor every title

A pattern is **searched**, the way `RegExp.test` runs it: it matches anywhere in the heading, and
nothing anchors it for you (design-ADR 0018). `Decision` matches `Decision`, `Decisions` and
`Decision record`. Write what the entry means:

1. A fixed title is `^Decision$`.
2. A prefix is `^Source: `, a suffix ` Report$`.
3. A substring is `Decision`, left unanchored on purpose.

A forgotten anchor loosens a title and nothing reports it. Run both spellings on a heading that only
_contains_ the title, `## Decision record`: `Decision` passes the file, `^Decision$` reports
`BODY_STRUCTURE__HEADING_MISSING` for that entry.

The dialect is ECMAScript with the `u` flag and no other. Matching is case-sensitive, so
`^[Ff]indings$` accepts both; a title is a pattern, so `^.{1,40}$` is a length. **Single-quote every
pattern**: `^Source: ` unquoted carries a `: ` and the config is rejected as `CONFIG_NOT_YAML`.

_Done when_ every pattern is anchored the way its entry's `intent` reads, and the Operator has seen
which entries are substring matches.

## 5. Decide open or closed

By default a spine is **open**: it is an ordered subsequence of the document's headings, and a
heading no entry matches is permitted. That default exists so the Module can join a knowledge base
that already exists without a finding per page. Two keys change it, and they exclude each other:

- **`maxLevel`** (1 to 6) is the depth floor of an open spine. A heading deeper than it is one
  `BODY_STRUCTURE__LEVEL_TOO_DEEP` per level, never per heading.
- **`undefinedHeadings: forbid`** closes the spine. A heading no entry matches, at any level and the
  title included, is one `BODY_STRUCTURE__HEADING_UNDEFINED` carrying its `level` and `content`, so a
  closed spine needs a level 1 entry (design-ADR 0025). `allow` is the default written out, and a Rule
  that writes it behaves as one that does not. Any other value, `closed` or `Forbid` included, is
  `CONFIG_INVALID_VALUE` at the key.

```yaml
body-structure:
  rules:
    - ruleId: decision-records
      folders: [docs/decisions/]
      types: [design-adr]
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

A heading some entry matches is never undefined: a second `## Decision` is `HEADING_REPEATED` and a
misplaced `## Context` is `HEADING_OUT_OF_ORDER`, each reported by its entry. Under a closed spine an
enumeration's run holds its repeats and nothing else. `mh --query` copies the key into the answer, so
the agent about to write a file hears that no other heading is welcome.

**Closing is the Operator's choice, and the open spine is where to start.** A closed spine reports
one violation per stranger, so its report grows with the document; it fits a templated kind, and a
kind whose authors add sections of their own stays open. `forbid` with no `headings:` is legal and says
the kind has no headings. `maxLevel` beside `forbid` is `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE` at
`maxLevel`: delete it, since a closed spine already forbids every depth it does not name.

_Done when_ the Operator has said open or closed for the Rule, and a Rule that closes has no
`maxLevel`.

## 6. Propose the Rule, and wait

Put the Rule in front of the Operator in their terms, before the file changes: which paths or types it
governs, the spine as a numbered list (level, what the heading says, absent or repeated), whether it is
open or closed and what that means for a document with an extra section, and the `intent` sentence. Do
not write it to the config until the Operator approves it. Rules are authored one at a time, so
propose one.

_Done when_ the Operator has approved this Rule, in words, and you have written it.

## 7. Verify, then check the governed folder

```sh
mh --query docs/decisions/anything.md --config markdown-harness.config.yaml
```

Read the candidates back: the `types`, `undefinedHeadings` and each entry should be the ones the
Operator approved. Exit 2 names the key to fix in `location`, as `authoring-a-config.md` step 4 says.
Then `mh --audit` (step 5 there): `won: 0` marks a dead Rule, here as there.

Run `mh --check` over the governed folder and read the findings to the Operator. Each names its spine
entry by `entry`, the zero-based index in `headings:`. **The tool reports and the Operator decides**,
one finding at a time, between the three honest answers: the document is wrong and the Contributor
fixes it, the Rule is wrong and the Operator changes it (a missing entry, a title that should be
optional, `allow` instead of `forbid`), or the finding stays for now. Edit a document only when the
Operator asks, and never to turn a count green.

_Done when_ `--query` shows the approved Rule, `--audit` shows it winning the files meant, and the
Operator knows what `mh --check` reports and has decided what to do about each finding.
