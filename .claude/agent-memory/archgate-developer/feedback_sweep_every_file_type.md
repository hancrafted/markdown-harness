---
name: feedback-sweep-every-file-type
description: A rename or delete sweep must grep every file type — an --include filter reports CLEAN while stale paths survive in YAML, config and test files
metadata:
  type: feedback
---

When a change moves or deletes a path, sweep for surviving references across **every** file type.
Never narrow the sweep with `--include`.

**Why:** on the phase-5 migration (2026-09-02) the first sweep was
`grep -rn "src/config" --include="*.md"` and reported clean. Four live stale references survived
it, because none of them were in Markdown:

| file                                          | what survived                                                    |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `fixtures/conformance/valid-test-config.yaml` | two comments, one with **broken `../../` relative paths**        |
| `eslint.config.mjs`                           | a hazard comment citing two files the same diff had just deleted |
| `GEN-003-…rules.test.ts`                      | a fixture path constant naming the deleted Package               |

A sub-agent found one of them; chasing that one surfaced the other three. Docs are the file type
you _remember_ to check, which is exactly why the filter felt safe.

**How to apply:** grep with no `--include`, then subtract the directories that are _supposed_ to
hold dead paths rather than pre-selecting the ones that are not:

```bash
grep -rn "<old-path>" . | grep -v node_modules | grep -v "^\./\.git/" \
  | grep -v "^\./\.worktrees/" | grep -v "docs/research/" | grep -v "docs/workshop/" \
  | grep -v "\.claude/agent-memory/"
```

Historical records (`docs/research/`, `docs/workshop/`, workshop transcripts) keep old paths on
purpose — those are the only legitimate survivors. Also verify that any **relative** path you
rewrite actually resolves (`[ -e "$dir/../../$rel" ]`), since a moved file changes the depth and a
broken `../../` looks identical to a working one in a diff.

Sibling failure, one level down: [[feedback_evaluate_arrays_never_grep_them]] — grep undercounting
a `.map()`-built array. Both are the same mistake, that grep's answer is only as wide as its scope.
