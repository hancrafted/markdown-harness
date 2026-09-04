---
type: workflow
title: Go
description: Tagging a commit once the release notes are written.
---

<!-- expect: FAILS -->

`title` is two characters against `minLength: 3`, so `VALUE_TOO_SHORT` fires.
`allOf: [title, description]` is satisfied — a too-short title is still present and
non-empty — which is what keeps the two constraints distinguishable: one asks whether
the field is there, the other asks what is in it.
