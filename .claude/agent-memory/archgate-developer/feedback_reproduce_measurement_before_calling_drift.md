---
name: reproduce-measurement-before-calling-drift
description: Before reporting a recorded number as stale, reproduce the measurement method that produced it — a tool mismatch, a flip that never landed, a probe of a mangled path, and a relative git ref that moved under you all look exactly like drift
metadata:
  type: feedback
---

When a record (map, ticket, ADR) states a number and the tree seems to disagree, **reproduce the
original measurement method before calling it drift**. Two numbers differing is not evidence of
staleness until you have ruled out measuring differently.

**Why:** on 2026-08-31, auditing #5, I read four ADR sizes with `wc -c` and reported all four as
drifted (11,782→11,852 etc.), twice, confidently, in a table. Every map figure was exact:
`AGENTS.md:59` documents that the ADR budget counts **characters, not bytes** and that `wc -c`
overstates by two per em dash. I had to retract publicly. In the same audit I also reported
`archgate check` moving 15/15→16/16 as drift; the total is purely a function of `--base`
(`6e30962`→16, `18186c0`→15, `b1915be`→13), so that was wrong too. Both errors shared one shape:
I compared my fresh measurement against a recorded one without checking we measured the same way.

**How to apply:** any "the record says X, the tree says Y" claim. First ask what produced X. For ADR
size use `wc -m` or trust `archgate check`'s own figure over the shell's. For any
changed-files-scoped tool, a count is meaningless without its base — quote the base alongside it or
don't quote the number. Only after the methods match is a delta drift. A false drift report is worse
than none: it sends the reader to fix a record that was already right, and it burns the credibility
of the real findings sitting next to it — here, the genuine ones (an unticketed ADR invisible to the
map, a decision applied at one site out of six, an ADR clause under-reaching its own rationale) were
the ones at risk of being discounted. Related: [[audit-the-tree-not-the-ticket]] for the surrounding
workflow, and [[measure-before-keeping-a-constraint]].

**Second failure mode, worse than a mangled read: the flip that never landed.** On 2026-09-03,
testing whether `tsPreCompilationDeps` was load-bearing for the new dependency-cruiser rules, I
flipped it with a `replace('tsPreCompilationDeps: true', ..., 1)`. The first occurrence in the file
was **inside a comment I had just written mentioning the flag** — so the option never changed, both
runs returned identical output, and the honest-looking reading was _"the flag makes no difference"_.
That conclusion would have gone into a config comment as a measured fact. `grep -n` showed two
occurrences at lines 86 and 133; targeting line 133 by index gave the real result (8 dependencies
cruised with it on, 3 with it off, green either way on the checkmark).

**How to apply:** when you toggle a setting to prove it is load-bearing, assert the toggle landed
before reading the result — print the line back, or match on the full line including indentation and
trailing comma. Two identical measurements across a supposed flip is evidence the flip failed, not
evidence the setting is inert. Same session, a subagent independently found the context compressor
dropping `to:` keys and brackets from that same config, so a rendered read of it is never a source.

**Third failure mode: probing a path the render invented.** Same day, a lossy render turned
`docs/evals/ablation/implementation-spec.md` into `docs/evals/adr-ablation-spec.md`. I then ran my
existence checks **on the mangled string**: `git show HEAD:<phantom>` said "NOT in HEAD" and a
`git status` render showed `?? docs/evals/`. I read that as "untracked, nothing has hashed it, safe
to reformat" and told Han so in writing. The truth was the opposite — the directory is tracked and
clean, and the phantom name appears in no file in the repo. A probe of a wrong name returns
"absent", which is indistinguishable from "untracked", so it confirms whatever you already believed.

**How to apply:** verify a path by **listing its parent** — `find <dir> -type f`,
`git ls-files <dir>` — never by probing the filename you were handed. "Tracked?" is
`git ls-files <path>`; "untracked?" is `git ls-files --others --exclude-standard <dir>`. A failing
`git show HEAD:<path>` proves only that _that string_ is absent, never that the artifact is. And
after any write you justified as safe, run `git diff --stat -- <path>` to confirm you changed what
you meant to and nothing else.

**Fourth failure mode: the relative ref that moved under me.** On 2026-09-03, working #8, I ran
`npx archgate check --base HEAD~2` and got `total: 13`. Minutes later the same command in the same
session returned `total: 0`. I began writing it up as a `--strict` interaction, because I had added
`--strict` in between. It was neither: **a concurrent session had landed two commits**, so `HEAD~2`
now labelled a different commit (`ff5bc66` → `0becfab`) and the changed set no longer contained a
single ADR. `git log --oneline -4` showed the two new commits immediately.

**How to apply:** `HEAD~N`, `@{u}`, branch names and `origin/main` are _labels_, not measurements. In
a repo where other sessions commit — the wayfinder skill says to expect exactly that — resolve the
label to a sha (`git rev-parse HEAD~2`) and quote the sha, or the number you report is unreproducible
by the next reader. When two runs of one command disagree within a session, suspect the inputs moved
before you suspect the flag you just added; the same session's `git log` is the cheapest way to tell.
Same day, the working tree also went from "3 modified ADRs + untracked `ARCH-007`" to clean for the
same reason, which would have read as someone reverting the work.

**Fifth failure mode: the stash that mimics a file never written.** On 2026-09-03, resuming the
`prepare-ablation-run` build, I checked whether `docs/evals/ablation/scaffold-design.DRAFT.md`
still existed. `ls` did not show it and `git status --porcelain` was empty, so I reported — in
writing, as a correction to a _true_ earlier statement — that the file "was never written,
contrary to what I reported earlier." Han replied that he had stashed it. `git stash list` had one
entry carrying the record **and four memory files I had authored that session**. A clean tree plus
an absent `ls` entry does not mean unwritten; it means unwritten _or stashed_ — and a stash is
invisible to every check I ran. Worse, the file had been `git add`ed before stashing, so it lived
in the stash's own tree, not a third parent: `stash@{0}^3` was `fatal: Not a valid object name`,
and my first read of it was `2>/dev/null | shasum`, which quietly hashed the empty string to
`e3b0c442…b855` and would have read as "the stashed copy is empty" if I had not recognised that
constant.

**How to apply:** before concluding a file does not exist, run `git stash list` — and if it is
non-empty, `git stash show --include-untracked --name-status stash@{N}`. Treat `e3b0c442…b855`
(SHA-256 of nothing) and `d41d8cd9…e427` (MD5 of nothing) as sentinels meaning _my command produced
no output_, never _the artifact is empty_; never pipe a `git show` into a hasher with stderr
suppressed. And the deeper rule: **correcting yourself is a claim like any other and earns the same
evidence bar.** Retracting a true statement is a worse outcome than the original uncertainty,
because it spends the credibility that self-correction is supposed to buy. Related:
[[audit-the-tree-not-the-ticket]].
