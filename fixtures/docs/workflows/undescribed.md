---
type: workflow
title: Publish the package
---

FAILS `allOf: [title, description]`. One arm is satisfied and the other is not,
so the satisfied set is `['title']` and the repair is to add what is missing.
`allOf` fails one way only — there is no such thing as satisfying too many arms
of it — so it carries one code, like `anyOf` and unlike `exactlyOneOf`.
