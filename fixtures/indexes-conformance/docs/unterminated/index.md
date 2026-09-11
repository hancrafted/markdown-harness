---
description: A start marker that never closes.
---

# Unterminated

The line below opens an HTML comment and never closes it. Per CommonMark it is an HTML block of
type 2, which runs to the end of the document, so it never matches the marker literal and is
therefore never recognised. That makes it a reportable state rather than a healable one: there
is no recognised survivor to delete, and deleting an unrecognised comment is the judgement the
generator does not make.

<!-- indexes:start

- [swallowed](swallowed.md) - Everything from the line above is inside one HTML block.
