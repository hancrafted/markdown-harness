---
name: feedback-sweep-every-file-type
description: A rename or delete sweep must grep every file type and follow symlinks — an --include filter or an un-followed .claude/skills symlink reports a false CLEAN while stale paths survive
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

**`-r` does not cross a symlink, and this repo is full of them.** Skills live in `.agents/skills/`
and every `.claude/skills/<name>` is a **symlink** into it (`code-review -> ../../.agents/skills/code-review`).
So `grep -rn <term> .claude/skills/…` and `find .claude/skills/… -type f` both return **nothing at
all** — not a partial answer, an empty one. On 2026-09-03 that printed `CLEAN` for a sweep I had
already seen a hit in ten minutes earlier, which is the only reason I caught it. Use `grep -R`
(capital) or `find -L`, and when a sweep of a directory you know has files comes back empty, run
`ls -l` before believing it.

Sibling failure, one level down: [[feedback_evaluate_arrays_never_grep_them]] — grep undercounting
a `.map()`-built array. All three are the same mistake: grep's answer is only as wide as its scope,
and it reports a narrow scope and an empty subject identically.
