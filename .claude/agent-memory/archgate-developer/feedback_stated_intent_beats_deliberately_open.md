---
name: stated-intent-beats-deliberately-open
description: A "Deliberately open" entry in docs/vision/architecture.md is not a design freeze — when Han states concrete future intent, that intent is the design input and outranks the marker
metadata:
  type: feedback
---

`docs/vision/architecture.md`'s **Deliberately open** list records that a question is _undecided_, not that it is unavailable as design input. When Han states concrete intent for one of those items in conversation, treat the intent as settled enough to design against and say so.

**Why:** On 2026-09-04, grilling the `mh` CLI package set, I argued twice from `architecture.md:176` ("the shape of the second Module" is deliberately open) that building for a second Module was speculative generality. The first time was right — Han agreed to drop a feature registry. The second time he reopened the closed question and told me body-governing Modules are coming, which is a concrete second consumer of file enumeration. That flipped the recommendation: enumeration became its own Package (`markdown-file-tree`), because `ARCH-004-folders-and-files` Decision 3.1 makes a `lib/` internal unreachable from a sibling Package.

**How to apply:** The test that separates the two cases is whether a _named, concrete_ second consumer exists — not whether the docs call the area open. A registry for an unknown member is still speculation; a shared reach for a member Han has named is not. When his statement contradicts a vision-doc marker, quote both, say which you are acting on, and record the intent somewhere durable — the doc marker will otherwise keep winning in the next session. Expect him to reopen settled questions with a new premise; that is a legitimate move, not churn.

See [[han-operator-author]] and [[body-governing-modules-planned]].
