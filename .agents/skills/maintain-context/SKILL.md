---
name: maintain-context
description: Verify a project glossary entry by entry — measure where each term actually occurs, put the case for keeping it and the case for deleting it in front of a human, and record the ruling so the file can honestly declare itself verified. Use whenever CONTEXT.md or another glossary reports stale, when someone asks whether a term still earns its place or whether two entries collide, before moving a `stale_after` date or writing a `verified:` frontmatter field, and whenever a half-finished glossary pass needs resuming. Reach for it even when the request sounds like tidying prose — "clean up the glossary", "is this term still used?", "does anyone say this any more?" — because those questions are answerable by measurement and are usually answered by guesswork instead.
compatibility: Node 18+ and git. The stamping step assumes markdown-harness governs the glossary; everything before it works without markdown-harness.
---

**Being handed this skill is a request to run a pass, or to resume one.** Find the record, say
where the pass stands, and open the next section — in your first reply.

## Why a pass exists

A glossary is the one document every agent reads before naming anything, and the one document
nothing checks. A linter cannot tell whether a definition is still true, whether a term is still
used, or whether two entries quietly ban the same word in different senses. So a glossary rots in
place while every reader keeps trusting it.

A pass replaces trust with measurement plus a human ruling. What comes out is not just a tidier
file — it is a file that can carry a `verified:` field without that field being a lie.

## The one thing that outranks everything else here

**You do not rule on entries. The human does.** Not because you would rule badly, but because the
whole output of a pass is a human's name attached to a claim about a shared vocabulary. An agent
verdict, however good, converts that into a claim nobody can stand behind when it is challenged
six months later.

Your job is to make the human's ruling _fast_ and _well-founded_: measure precisely, present both
cases at equal strength, surface every consequence before the decision rather than after, and
write down what they said and why. If asked directly — "what would you do?" — answer, then note in
the record that the reasoning was yours and the decision was theirs.

## Step 1 — Orient

Look for a dated record under `docs/housekeeping/`. If one exists and its inventory is unfinished,
you are resuming: read its resume block and continue from `next`, without needing the conversation
that produced it. If none exists, start one from `assets/record-template.md`.

Then report, in three lines: which glossary, how many entries and sections the script found, and
where the pass stands.

## Step 2 — Open a section, whole

Read the entire section before measuring anything in it.

This is not politeness toward the document. In most glossaries, entries constrain each other —
an `_Avoid_` or "don't call it X" line bans a spelling _for one sense_, and two entries may ban
the same spelling for different senses. A collision between two entries is only visible with both
in view. Entry-at-a-time reading finds every problem except the one the convention exists to
manage.

## Step 3 — Measure

```
node <skill>/scripts/occurrences.mjs --list                    # inventory only
node <skill>/scripts/occurrences.mjs --section "The product"   # measure a section
node <skill>/scripts/occurrences.mjs --entry Module            # one entry
node <skill>/scripts/occurrences.mjs --entry Rule --pattern '\*\*Rule\*\*|`Rule`'
```

The script derives its inventory from the glossary itself, so the list of entries cannot drift
from the file. Take that seriously: a hand-written inventory will disagree with the file and you
will not notice. It also reports any bold-led line it could not parse — read those, because a
parser that silently matched 42 of 43 hands you a complete-looking pass with an entry missing.

Run it per section rather than once up front. The pass edits the file as it goes, and a rename
landing in section 2 changes the counts in section 5.

### Reading the output honestly

The script splits every count two ways, and both splits exist because a naive total is worse than
no total.

**By position in the markup** — whether a line _names_ the concept (bold, backticked, a heading,
an `_Avoid_` line) or merely _uses_ the word. A glossary that bans by sense cannot be measured by
spelling: a governed term like `Rule` or `check` returns four figures of ordinary English. Loose
prose is reported but quarantined out of the headline, never dropped — a silently discarded 1500
is a bad number wearing a clean one's clothes.

**By whether the file is on an agent's reading path** — instruction files, ADR bodies and skills
are marked `>`. A term with weight there carries it where nobody chose to look it up. A term whose
only hits are inside the one document that defines it is a term explaining itself to itself.

Two numbers deserve a sentence of their own in the dossier whenever they are surprising:

- `case-exact N of M` — how many hits match the glossary's own spelling. `0 of M` means the
  glossary capitalises or hyphenates a term differently from every real use of it. That is a
  finding, not noise, and it is invisible to a case-sensitive search, which reports zero and reads
  as "unused".
- Hits inside the term's own defining document versus outside it. Concentration inside is the
  strongest single argument that a glossary entry is a second copy of something already said
  better elsewhere.

## Step 4 — Put one entry in front of the human

Use this shape. It exists so that one reading produces one decision.

```markdown
## **<Term>** — <file>:<line>

<the entry's current text, verbatim, including any _Avoid_ line>

<the measurement table>

`case-exact ...` — <one line, only if it says something>

**Keep**

1. <most consequential reason first, one line>
2. ...

**Delete**

1. <most consequential reason first, one line>
2. ...

<second-order questions, numbered options, a recommendation each>

Your ruling?
```

Both cases get written at full strength, and neither gets recommended. A thin case for one side
makes the decision before the reasoning does, and unlike a stated recommendation, it does so
invisibly. Balance is checkable; neutrality is not.

Keep the reasons short and ordered by weight. This is a decision aid, not an essay — the human is
reading forty of these.

**Consequences belong here, not after the ruling.** Anything the verdict would set in motion goes
into the dossier as a numbered question with a recommendation: does a deletion leave a retired
stub, does a section heading survive losing its only entry, are the spellings this entry bans in
live use anywhere, does a rename collide with open branches. Raising these afterwards forces the
human to rule twice on one entry.

## Step 5 — Apply the ruling

Verdicts: **keep**, **reword**, **rename**, **move**, **split**, **delete**.

- **Delete is the default disposition** for an entry that fails. A retired stub is worth offering
  only where the term still occurs outside the glossary, so a reader who meets the word can
  resolve it. Offer it; never take it. A glossary that only grows is the rot a pass exists to
  reverse.
- **A fact stripped out of an entry is deleted by default too.** Offer a destination — measured
  behaviour to wherever the project records measurements, mechanics to the architecture docs, a
  promise to the vision docs, otherwise a filed issue — and name it in one line. The human decides
  whether it is worth saving.
- **A delete takes the entry's bans with it.** Before dropping an `_Avoid_` line, measure whether
  anything still uses the spellings it outlaws. Usually nothing does, and saying so costs one
  command; assuming it is how a live ban disappears.
- **A rename's blast radius is branches, not history.** History is immutable and nobody reads it
  for vocabulary. Open branches are where a rename is re-typed by hand or silently reverted at the
  next merge, so sweep them and report the list before the rename lands.

If an entry ruled on earlier gets dragged back into view, reopen it: keep both rulings in the row,
let the later one win, and record what forced the reopen. Collisions across sections are the
mechanism working, not an accident, and the next pass needs to know which entries are entangled.
If the collision points into a section outside this pass's scope, record it as a deferred
collision and rule on what is visible.

## Step 6 — Close the section

Four things, then stop and let the human look:

1. Update the record — every row with its verdict, the human's reason in their words, any reopen
   or deferred collision, and the section marked closed with a timestamp.
2. Update the resume block's inventory and `next`, so a cold session could continue from the file
   alone. Test that claim once, mid-pass, by actually resuming cold.
3. Stage the edits and propose a commit message. **Do not commit.** The section boundary is the
   only point where the working tree, the record and the log say the same thing, which is what
   makes resumption real rather than claimed — and the human signing the pass is the one who
   should close it.
4. If the section taught something about the _method_, append it to the skill's own notes and
   propose the edit. If it taught nothing, write nothing; a note per section is padding, and
   padding at the point of maximum leverage is the worst place for it.

## Step 7 — The stamp

Only when every in-scope entry carries a verdict, every reopen is closed, a closing full
measurement has been written to the record, and the project's own gate is green.

Until all four hold, do not ask. Name what is missing instead. This inverts who chases whom: the
count blocks the stamp, rather than the pass ending when it happens to feel finished.

Then ask explicitly, and write nothing until answered. Where the project uses OKF-style
provenance, the shape is a `{ by, at }` mapping — `verified: { by: human:<name>, at: <ISO> }` —
alongside the new `stale_after`. Set the interval from the file's own churn rather than a round
number: a long freshness claim on a file that changes weekly is false most of the time it is
displayed.

One thing to say out loud rather than bury: a green frontmatter check proves the fields are
present and well-formed, not that a single definition is correct. The only thing standing behind
correctness is every entry ruled on with a human's name against it.

## When the method fails you

It will. Append what happened to the record, propose the fix to this skill, and keep going. The
measurement defects most likely to bite are all silent ones — a zero that meant "nothing was in
scope", a position class generous enough to count the wrong thing, a sample list ordered so that
the quarantined bucket never appears. Before trusting any check that guards this work, break what
it guards and watch it go red.
