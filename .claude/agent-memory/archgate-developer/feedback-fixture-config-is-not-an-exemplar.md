---
name: feedback-fixture-config-is-not-an-exemplar
description: fixtures/valid-test-config.yaml is a coverage device, not a model of a real config — never generalise its conventions into claims about what adopters will write
metadata:
  type: feedback
---

Do not reason about product behaviour from the conventions in
`fixtures/valid-test-config.yaml`. It exists to reach every key in the vocabulary, and its own
header says so. What it happens to do is not what a real config does.

**Why:** arguing about `--query` on a folder path, I claimed folder queries were near-useless
"under a well-written config", because every rule in the fixture config uses a `*.md`-suffixed
glob and no such glob matches a bare directory. The user pushed back with a two-rule example
using `docs/**` and `docs/research/**`. Measuring it showed `docs/**` matches
`docs/research/survey.md` as well as `docs/research`, so directory-shaped globs serve file
governance and folder queries at once — the trade-off I had argued for did not exist. The
`*.md` suffixes were an artifact of a coverage fixture, and I had promoted them to a norm.

**How to apply:** when a design argument rests on the shape of the config, measure the shape
you are claiming rather than reading it off the fixture — and say which config the claim is
about. Same caution for `fixtures/`' 14 files: they are chosen to exercise clauses, not to
resemble a repo. Related: [[feedback-no-invented-prose]].
