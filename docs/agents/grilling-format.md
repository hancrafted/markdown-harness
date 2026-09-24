---
type: agent-guide
---

# Grilling Format

How a grilling round is written in this repo. It covers every round: `/grill-me`, `/grill-with-docs`, and the grilling Wayfinder runs while charting a map or resolving a `wayfinder:grilling` ticket.

This **overrides** the grilling skill's "ask the whole frontier in one round". The frontier still decides which questions are askable; [classification](#classification) decides which of them reach the user.

## The opening

A session usually starts on a ticket id, and the user is not carrying what that ticket was about. Write an orientation before Q1 — once when a `/grill-me` or `/grill-with-docs` session starts, and again each time the Wayfinder picks up a new `wayfinder:grilling` ticket mid-map.

Two lines, no more:

1. **The purpose** — what the ticket exists to settle, named by title.
2. **The end result** — what the user is holding when the session closes: a design-ADR on disk, a rewritten doc, a set of filed issues.

The orientation is not a question and takes no answer. Write it, then ask Q1.

## Classification

The user's attention belongs on contracts and architecture. Classify every candidate question before it is asked — in every grilling round, and at Wayfinder charting, including the grilling that names the destination. Each question gets exactly one bucket: the first row below that fits.

| Bucket         | The answer changes                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `contract`     | everything at a seam or boundary, the config contract, the response contract, the command surface, or the exit codes |
| `architecture` | software architecture, design pattern, communication pattern, an ADR Discipline or a design-ADR, or needs a new one  |
| `conformance`  | the Conformance suite, which serve as deterministic specs/acceptance tests                                           |
| `workflow`     | what a future agent session does — an agent-guide, a skill, `AGENTS.md`                                              |
| `neither`      | none of the above: every reasonable answer leaves them as they were                                                  |

The first four are **asked**. `neither` is **decided**.

### Asked questions

- **One decision per question.** A question that needs "and" is two questions.
- **No cap on count.** A cap compresses several decisions into one question, and then they can no longer be answered separately. The filter is what keeps rounds short; if fifteen questions are genuinely asked, the user wants all fifteen.
- **Most consequential first**, so time running out costs the cheap end.
- The frontier rule stands: a question whose answer hangs on another open question waits for a later round.

### Decided questions

Decide every `neither` question yourself and list it at the end of the round under **Decided without asking**, one line each: the decision, then its reason, naming the design principle where one applies — cohesion, coupling, blast radius. The reason is what lets the user spot a misclassification at a glance. A line the user leaves uncontested when answering the round is settled. A contest is recorded under [Classification cases](#classification-cases).

## Question shape

Keep the grilling skill's markers (`❓ **Qn**`, `➡️`) and fill each question out in this order:

1. **The bucket and a full wh-question** as the headline: `❓ **Q1** · contract — **Which …?**`. The bucket lets the user contest the classification. The wh-question ends in a question mark and names its own subject, so it reads on its own with nothing above it. "Which Package should own the violation renderer?" — not "Where the violation renderer lives". A noun phrase makes the user reconstruct the question before they can start answering it.
2. **Options** as a numbered list, one sentence each, with at most one `because` reason.
3. **A recommendation** under the options, naming the option it picks and why it wins.
4. **An example per option**, showing what the decision looks like once taken — the file it writes, the config it changes, the directory layout it produces. Show the effect; don't describe it.

Every example gets the same shape, the same depth, and inline comments giving the why in a few words — a design pattern or a reason. Write each one as though you were about to recommend it — a thin example under the option you are arguing against makes the recommendation before the reasoning does.

## Language

Write the question in plain words and keep the technical terms exact. A term is exact when `CONTEXT.md` or the surrounding docs already establish it — reach for that one rather than a synonym.

Coin nothing silently. Where a concept genuinely has no name yet, say so in the question ("no name for this yet, calling it a _lesson bundle_ here"), so a fresh word is never mistaken for established vocabulary.

## Refer by name

No bare id ever reaches the user. Every id-like handle travels with its name or slug:

- `GEN-001-adr`, never `GEN-001`.
- An architectural tenet by its name, never `tenet 4`.
- Maps and tickets by their title, which is the Wayfinder skill's own rule.

The id alone is unreadable; the name carries the meaning while the id keeps the trail.

## Wayfinder

This section overrides three rules of the vendored Wayfinder skill and nothing else. The skill is lock-managed and overwritten on update, so the repo carries the smallest override that holds.

**Charting files by bucket.** A ticket whose decisions all come out `neither` is filed `wayfinder:grilling` plus `afk`. A ticket with any asked question, or with a bucket still unclear, is filed `wayfinder:grilling` alone — an unclear call errs toward asking. Each ticket line on the map ends with its bucket and the reason: `— contract: exit codes`.

**An `afk` ticket is decided by a subagent.** At the start of every Wayfinder session, fire one subagent per unblocked, unclaimed `afk` ticket, the way research tickets are fired, and name this file in its prompt. Each subagent claims its ticket first, grills it against this file, posts **Decided without asking** as its closing comment, and closes it. A decision that needs a diff goes to a worktree, with its pull request on the map branch (`docs/agents/wayfinder-branches.md`). Fire one layer per session: a ticket that an `afk` close unblocks waits for the next session, so the user can reopen a decision before anything builds on it.

**An asked question stops the subagent.** A subagent that reaches a question in an asked bucket removes `afk`, posts the question in this format, and leaves the ticket open for the user.

**A HITL session with nothing to ask closes itself.** A `wayfinder:grilling` session whose frontier comes out all `neither` posts the list and closes the ticket. The user contests by reopening.

Against the skill's own text:

- **Ticket Types** says a grilling agent that answers its own questions has broken HITL. That still holds for asked questions; `neither` questions and `afk` tickets are the agent's to decide.
- **"Never resolve more than one ticket per session"** gains a second exception beside research: `afk` tickets.
- **"Fire the research subagents"** extends to `afk` tickets, at every session start rather than only at charting.

## A round in this format

Opening `wayfinder:grilling — where the payment contract lives`. This ticket settles which directory owns the payment interface every provider implements. You leave with one decision record on disk.

---

❓ **Q1** · architecture — **Where should the common payment interface definition live in our project directory?**

1. In `src/core/` because high-level business rules should never depend on external vendor libraries.
2. In `src/integrations/stripe/` because keeping the contract right next to the current implementation makes it easy to find.
3. In a standalone workspace package `packages/payment-contracts` because multiple applications might need to share the same types.

➡️ **Recommendation: Option 1 (`src/core/`)**  
It enforces clean architecture boundaries: high-level business rules never import low-level third-party tools, keeping code simple without the maintenance burden of a multi-package repo.

#### Concrete Examples

**Option 1: Inside `src/core/`**

```text
src/
├── core/
│   └── payments.ts         # Dependency Inversion: business domain owns the contract with zero 3rd-party imports
└── integrations/
    └── stripeAdapter.ts    # Adapter Pattern: implements the core contract while importing vendor SDKs
```

**Option 2: Inside `src/integrations/stripe/`**

```text
src/
├── integrations/
│   └── stripe/
│       ├── interface.ts    # Colocation Pattern: packages the contract directly alongside the primary vendor driver
│       └── adapter.ts      # Implementation: couples directly with local interface and vendor SDK
```

**Option 3: In `packages/payment-contracts`**

```text
packages/
├── payment-contracts/
│   └── interface.ts        # Shared Kernel Pattern: isolates interface for reuse across independent microservices
└── backend-api/
    └── adapter.ts          # External Consumer: imports versioned contract from local workspace package
```

## A classified round

The payment round shows the question shape; this one shows classification, in this repo's buckets. The ticket _Decide the filesystem gate's contract — failure policy, containment, and the builtin guard's carve-outs_ listed five decisions, two of them compound. Classified, they become four asked questions and three decided lines.

Opening `wayfinder:grilling — the filesystem gate's contract`. This ticket settles what the one gate to the filesystem promises its callers, and which files may still import a platform builtin. You leave with a design-ADR on disk.

---

❓ **Q1** · contract — **What should the tree walk do with a file symlink that resolves outside the repository root?**

1. Collect it, because a symlinked file is usually a real document, like `CLAUDE.md` pointing at `AGENTS.md`.
2. Skip it silently, because symlinked directories are already skipped.
3. Refuse the whole tree, because a corpus that reaches outside itself is a corpus nobody stated.

➡️ **Recommendation: Option 3.** Collecting puts another repository's bytes behind a path in this one's report; skipping answers clean about a corpus it never read. A refusal changes the exit code, which is what makes this `contract`.

**Option 1: collect**

```text
docs/shared.md -> ../../other-repo/notes.md
result: checked, reported as docs/shared.md      # trust the link: in-tree path, out-of-tree bytes
exit:   0
```

**Option 2: skip**

```text
docs/shared.md -> ../../other-repo/notes.md
result: skipped, nothing reported                # symmetry with directories: silent omission
exit:   0
```

**Option 3: refuse**

```text
docs/shared.md -> ../../other-repo/notes.md
result: tree refused, the link named             # fail closed: an unstated corpus gets no answer
exit:   non-zero
```

---

❓ **Q2** · architecture — **What shape should the gate's read return to its caller?** _(options, recommendation and examples as in Q1)_

❓ **Q3** · architecture — **Which files may keep importing a platform builtin once the gate lands?** _(as in Q1)_

❓ **Q4** · architecture — **Do `node:os` and `node:url` count as platform builtins for the guard?** _(as in Q1)_

---

**Decided without asking:**

- A symlink chain that raises `ELOOP` is caught at the gate and ignored like a broken link — one policy for every unresolvable entry: cohesion.
- The gate caches failed reads as well as successful ones — otherwise a missing file is stat'd once per rule that names it, and no contract sees the difference.
- The guard is proven by planting a forbidden import and watching it go red — `docs/agents/verification.md` already requires this, so nothing is left to decide.

## Classification cases

When the user pulls a **Decided without asking** line back into a question, or waves an asked question off as mechanics, add one line here: the question, the bucket it was given, the bucket the user gave it, and why. The filter sharpens from these instead of staying general.

_None yet._
