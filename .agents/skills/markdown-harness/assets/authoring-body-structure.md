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
whether it may be absent, whether it repeats, and how the kind is told apart, by its folder or by
its `type`.

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

## 5. Decide open or closed

By default a spine is **open**: the entries are an ordered subsequence of the document's headings, and
a heading no entry matches is permitted. That default lets the section join a knowledge base that
already exists without a finding on every page. Two Rule keys change it:

- **`maxLevel`** (1 to 6) is the deepest level allowed in an open spine. Headings deeper than it are
  one `BODY_STRUCTURE__LEVEL_TOO_DEEP` per level.
- **`undefinedHeadings`** is `allow` (the default, written out) or `forbid`, which **closes** the
  spine. A heading no entry matches, at any level and the title included, is then one
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

A heading some entry matches is never undefined: a second `## Decision` is `HEADING_REPEATED` and a
misplaced `## Context` is `HEADING_OUT_OF_ORDER`, each reported by its entry. In a closed spine an
enumeration's run holds its repeats and nothing else. `mh --query` copies `undefinedHeadings` into its
answer, so an agent about to write the file hears that no other heading is welcome.

**Closing is the Operator's choice, and open is where to start.** A closed spine reports one violation
per stranger, so its report grows with the document. It fits a templated kind. A kind whose authors add
sections of their own stays open.

_Done when_ the Operator has said open or closed for this Rule, and a closed Rule has no `maxLevel`.

## 6. Propose the Rule, and wait

Put the Rule in front of the Operator in their terms before the file changes: which paths or types it
governs, the spine as a numbered list (level, what the heading says, absent or repeated), whether it is
open or closed and what that means for a document with an extra section, and the `intent` sentence. Do
not write it to the config until the Operator approves it.

_Done when_ the Operator has approved this Rule in words, and you have written it.

## 7. Verify, then read what the check says

```sh
mh --query docs/decisions/anything.md --config markdown-harness.config.yaml
```

Read the candidates back: the `types`, `undefinedHeadings` and every entry should be what the Operator
approved. Exit 2 names the key to fix in `location`, as `authoring-a-config.md` step 4 says, and
`mh --audit` (step 5 there) shows whether the Rule wins the files meant.

Then run `mh --check`. It takes no path and reads the whole corpus, so read the findings for the files
the new Rule governs, filtered by `ruleId`; when the report is large, group it by code before deciding
anything. Each spine violation names its `entry`, the zero-based index in `headings:`, except
`HEADING_UNDEFINED`, which names a `level` and the `content` found, and `LEVEL_TOO_DEEP`, which names a
`level` and a `found` count.

`SKILL.md`'s line holds here: the tool reports, and the Operator decides, one finding at a time. A
finding means the document is wrong and a Contributor fixes it, or the Rule is wrong and the Operator
changes it (a missing entry, an optional title, `allow` instead of `forbid`), or it waits. Edit a
document only when the Operator asks, and never to turn a count green.

_Done when_ `--query` shows the approved Rule, and the Operator has decided what to do about each
finding the Rule's files carry.
