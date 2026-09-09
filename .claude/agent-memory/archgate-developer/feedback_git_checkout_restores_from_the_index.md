---
name: git-checkout-restores-from-the-index
description: `git checkout <file>` restores from the index, so with changes staged it silently discards unstaged work — use a .bak copy to undo an ablation mid-commit
metadata:
  type: feedback
---

`git checkout -- <file>` restores that file **from the index, not from `HEAD`**. With changes already
staged, it therefore discards unstaged edits and leaves the staged version in place — silently, with
no output.

**Why:** it bit on 2026-09-09. Mid-commit, with the whole change staged, an ablation was run to prove
a fixed assertion could still fail, then `git checkout <file>` was used to undo the ablation. It undid
the ablation _and_ the fix, which had been written after staging. The lost work was only noticed
because a `grep -c` for the new identifier returned `0`.

**How to apply:** ablation is a constant habit here — break a thing, watch the check go red, restore.
When anything is staged, restore from a **file copy** (`cp x x.bak` … `mv x.bak x`) rather than from
git. And after any restore, verify with a grep for a token unique to the work you expected to survive;
the restore itself reports nothing either way. Same shape as [[rtk-filtered-output-lies]]: the tool's
silence is not confirmation. See [[vacuous-green]] for the sibling habit of proving a check can fail.
