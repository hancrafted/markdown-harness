---
type: agent-guide
---

# Wayfinder Branches

Where a map's work lands. Every map owns one **map branch**; ticket work stacks on it, and `main` sees the effort once, when the map's own pull request merges.

This **adds** to the wayfinder skill, which says nothing about branches beyond a throwaway `research/<name>`. It is lock-managed and gets overwritten on skill update, so the rule lives here instead. It applies to every session on a map — charting, resolving, research subagent — and to every checkout: the repo root, `.worktrees/<name>`, or a Host-harness worktree under `.claude/worktrees/`. Where the session is checked out is not the question. What its pull request is **based on** is.

## The map branch

`map/<map-number>-<slug>`, derived from the map issue so any later session names it without a lookup. Map #63, _Map: folders-and-files — the second Module, …_, gives `map/63-folders-and-files`.

The charting session cuts it, once the map issue has a number and before the research subagents fire — they need a base to push against. Seed it with an empty commit: a pull request needs a diff, and charting produces none, since the map lives on the tracker rather than in the repo.

```bash
git switch main && git pull
git switch -c map/63-folders-and-files
git commit --allow-empty -m "chore(map): open the folders-and-files map branch (#63)"
git push -u origin map/63-folders-and-files
gh pr create --base main --draft --title "Map: folders-and-files (#63)" --body "..."
```

**Draft, and it stays draft** for the life of the map. That is the guard: a draft cannot be merged or auto-merged, so no half-walked route reaches `main` while tickets are still open. The body opens with a link to the map issue and is otherwise the running summary of what has landed.

## Resolving a ticket

Branch from the map branch, never from `main`, and target the map branch explicitly:

```bash
git fetch origin
git switch -c feature/<slug> origin/map/63-folders-and-files
gh pr create --base map/63-folders-and-files --title "..." --body "... (map #63)"
```

Keep the prefix the repo already uses — `feature/<slug>`, `research/<name>`. The prefix is cosmetic; the base is load-bearing.

`--base` is not optional. Without it `gh` falls back to `branch.<name>.gh-merge-base`, and with that unset, to the repository's default branch — so an omitted flag opens a pull request against `main` silently, with no error to read. A worktree cut from `main` also has no `map/*` ref until it fetches, which is why `git fetch origin` comes first.

## Closing a ticket

A ticket that produced a diff closes **after** its pull request merges into the map branch, and closes **by hand**:

```bash
gh pr merge <n> --squash --delete-branch
gh issue close <ticket> --comment "<the answer>"
```

`Closes #<ticket>` in the body does nothing here. GitHub only auto-closes a linked issue when the pull request merges into the repository's **default branch**, and a map branch never is one — the link renders in the UI and then the merge passes it by. `gh pr create --help` states the behaviour without that condition, so the help text is not the thing to trust. Write the keyword anyway for the visible link, and close the issue yourself.

A ticket that produced no diff — most grillings, most research reaching a decision rather than a file — has no pull request to wait on and closes exactly as the skill says.

Either way the resolution comment and the map's Decisions-so-far entry are unchanged, except that a ticket with a diff links its merged pull request as the asset.

## Landing the map

When no tickets remain, the map branch holds the whole effort and its pull request is the one review that matters:

```bash
gh pr ready <map-pr>
gh pr merge <map-pr> --squash --delete-branch
gh issue close 63 --comment "..."
```

Take the draft off last. Between `ready` and `merge` the branch is mergeable by anyone, so close that window rather than parking a map in review-ready state for days.

Merge before closing the map issue, and merge with every child closed: GitHub retargets open pull requests onto `main` when their base branch is deleted, so a ticket left open at this point lands on `main` behind you.
