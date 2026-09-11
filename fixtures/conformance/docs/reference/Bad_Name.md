---
type: reference
description: A reference page whose file name and whose frontmatter are both wrong.
status: stable
slug: bad-name
reviewedBy: nobody
---

<!-- expect: FAILS -->

TWO MODULES REPORT ON ONE FILE, which is the shape `FileViolations.modules` exists to carry
and the case that could not be expressed at all before this Module existed.

`reviewedBy` is a key the `reference` rule does not name under `unknownKeys: forbidden`, so
the frontmatter Module reports `UNKNOWN_KEY_FORBIDDEN`. The stem `Bad_Name` is not
kebab-case, so the naming Module reports `FILE_NAMES__FORMAT_MISMATCH`. Each block carries
its OWN winning rule and intent — `reference` and `reference-page-names` — because
first-match holds within a Module and says nothing across them.

The blocks appear in the order `MarkdownHarnessConfig` declares its keys, frontmatter then
file-names, never the order the YAML mapping happened to use.

Note the codes. A bare `FORMAT_MISMATCH` in both Modules could not tell an agent whether to
rename the file or edit the frontmatter — opposite repairs — which is why every code this
Module reports carries its Module in its spelling.
