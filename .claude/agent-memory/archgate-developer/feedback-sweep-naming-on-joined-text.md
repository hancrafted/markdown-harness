---
name: sweep-naming-on-joined-text
description: Before committing, sweep for bare "harness" and the banned product synonyms over JOINED text, because a line-based grep structurally cannot see a wrapped sentence
metadata:
  type: feedback
---

Before every commit that touches prose — doc comments, markdown, YAML comments — sweep the
changed files for bare `harness` and the product synonyms `CONTEXT.md` bans (`the harness`,
`tool`, `framework`, `plugin`, `template`). **Do the sweep over text with newlines and comment
leaders collapsed**, never line by line.

**Why:** six consecutive commits on `feature/prototype` carried this defect, and each time it
survived a check. A line-based `grep` cannot match a sentence that WRAPS — `the` ends one line
and `harness` begins the next — so the most common occurrence is exactly the one it misses. Two
independent passes proved the point: a self-grep found one of two, and a delegated review agent
found three of eight. The five it missed were all wrapped or in files nobody thought of as prose
(`fixtures/*.yaml` comments).

Two aggravating causes worth knowing:

- **Renaming a file carries its sentences forward unread.** Every occurrence in the sixth
  commit predated the session and rode through a rename.
- **Comments in `fixtures/` and `*.yaml` count.** They are prose and they are read.

**How to apply:** run the sweep as a script over `git diff --name-only <base>..HEAD` plus
unstaged files, collapsing `\s*\n\s*(?:\*|//|#)?\s*` to a single space first. Allow only
`markdown-harness`, `frontmatter-harness` and `Host harness`. Note that a passing sweep is not
the same as a passing eye — but a failing eye plus a passing sweep has never happened, and the
reverse has happened six times.

The durable fix is an instrument, not more care: an Archgate ADR with a companion `.rules.ts`,
which only `archgate:adr-author` may write. See [[feedback-no-invented-prose]] for the related
rule about not hand-writing prose about config, and
[[feedback-fixture-config-is-not-an-exemplar]] for why `fixtures/` still gets read closely.
