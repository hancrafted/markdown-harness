---
type: agent-guide
---

# Grilling Format

How a grilling round is written in this repo. It covers every round: `/grill-me`, `/grill-with-docs`, and the grilling Wayfinder runs while charting a map or resolving a `wayfinder:grilling` ticket.

This **overrides** the grilling skill's "ask the whole frontier in one round". The frontier still decides which questions are askable; the cap below decides how many of them ship this round.

## The opening

A session usually starts on a ticket id, and the user is not carrying what that ticket was about. Write an orientation before Q1 — once when a `/grill-me` or `/grill-with-docs` session starts, and again each time the Wayfinder picks up a new `wayfinder:grilling` ticket mid-map.

Three lines, no more:

1. **The purpose** — what the ticket exists to settle, named by title.
2. **The end result** — what the user is holding when the session closes: a design-ADR on disk, a rewritten doc, a set of filed issues.
3. **An `Analogy` block** for the session, in the form the next section fixes.

The orientation is not a question and takes no answer. Write it, then ask Q1.

## The analogy

An analogy lives in an **`Analogy` block** and nowhere else. It appears in exactly two places:

- **At the opening**, where it covers the session.
- **Inside a question**, where it covers that one decision — write it only when the session's analogy does not reach the decision.

The block is a blockquote, labelled, and one paragraph:

> **Analogy** — Packages are trades on a building site. The plumber, the carpenter and the electrician each own one part of the same building, and each reaches another's work through a fitting both agreed on, never by cutting through the wall.

Everything outside the block stays literal. The wh-question, the options, the examples, their inline comments and the recommendation carry the real terms and nothing borrowed. Mixed together, the user has to sort the figure from the fact before they can answer; kept apart, the block can be read or skipped and the question still stands on its own.

Reach for something the user has stood inside: a building, a kitchen, a post office, a library. The domain does not matter; being able to picture it does. Map the parts that carry the decision, and leave the rest of the scene alone.

## Round size

- **Five questions at most** in a normal round.
- **Three at most** when the round turns on an architectural decision — one that fixes structure the later work has to sit on: a data shape, a boundary, a file layout, a dependency.

When the frontier is wider than the cap, ask the questions the rest of the frontier hangs on and leave the others for the next round.

## Question shape

Keep the grilling skill's markers (`❓ **Qn**`, `➡️`) and fill each question out in this order:

1. **A full wh-question** as the headline, ending in a question mark and naming its own subject, so it reads on its own with nothing above it. "Which Package should own the violation renderer?" — not "Where the violation renderer lives". A noun phrase makes the user reconstruct the question before they can start answering it.
2. **An `Analogy` block**, only when this decision needs one the session's analogy does not already give.
3. **Options** as a numbered list, one literal line each.
4. **An example per option**, showing what the decision looks like once taken — the file it writes, the config it changes, the directory layout it produces. Show the effect; don't describe it.
5. **A recommendation** under the options, naming the option it picks and why it wins.

Every example gets the same shape, the same depth, and a literal inline comment. Write each one as though you were about to recommend it — a thin example under the option you are arguing against makes the recommendation before the reasoning does.

## Language

Write the question in plain words and keep the technical terms exact. A term is exact when `CONTEXT.md` or the surrounding docs already establish it — reach for that one rather than a synonym.

Coin nothing silently. Where a concept genuinely has no name yet, say so in the question ("no name for this yet, calling it a _lesson bundle_ here"), so a fresh word is never mistaken for established vocabulary.

## Refer by name

No bare id ever reaches the user. Every id-like handle travels with its name or slug:

- `GEN-001-adr`, never `GEN-001`.
- An architectural tenet by its name, never `tenet 4`.
- Maps and tickets by their title, which is the Wayfinder skill's own rule.

The id alone is unreadable; the name carries the meaning while the id keeps the trail.

## A round in this format

**Opening `wayfinder:grilling — where rendering lives`.** This ticket settles which Package owns the code that turns violations into text, and where that choice is written down. You leave with one decision record on disk.

> **Analogy** — Packages are trades on a building site. The plumber, the carpenter and the electrician each own one part of the same building, and each reaches another's work through a fitting both agreed on, never by cutting through the wall.

---

❓ **Q1** — **Which Package should own the code that renders a `FileViolations` list as text?** Two can hold it.

1. **`cli`** — the renderer sits with the surface that prints it.
2. **`response-contract`** — the renderer sits beside the shape it renders.

Option 1 writes:

```
src/packages/cli/lib/render/
└── violations.pure.ts     # renderer inside the printing surface
```

Option 2 writes:

```
src/packages/response-contract/lib/
└── render.pure.ts         # renderer inside the contract
```

➡️ **Option 1.** `ARCH-004-folders-and-files` Decision 3.1 lets outside code reach a Package only through its entry point, so option 2 buys a renderer that `cli` cannot call until `response-contract` widens its entry point to export it. Rendering is a CLI concern; the contract holds the shape.

---

❓ **Q2** — **Where should the placement decided in Q1 be recorded, in an ADR or a design-ADR?** It outlives this session, so it needs a home.

> **Analogy** — an ADR is a building regulation. It holds on every site, and an inspector fails the job when the work drifts from it. A design-ADR is the site notebook: it records why this wall went here, and binds nobody.

1. **An ADR under `.archgate/adrs/`**, which can carry a companion `.rules.ts` that fails `npm run verify` when a file drifts.
2. **A design-ADR under `docs/design-adr/`**, which records the reasoning and enforces nothing.

Option 1 adds:

```
.archgate/adrs/
├── ARCH-008-render-placement.md       # the decision
└── ARCH-008-render-placement.rules.ts # the check that enforces it
```

Option 2 adds:

```
docs/design-adr/
└── 0007-render-placement.md           # the reasoning, unenforced
```

➡️ **Option 2.** `GEN-001-adr` reserves an ADR for "one universal constraint on how code is written, at an altitude no future feature can invalidate", and sends feature- and contract-shaped reasoning to a design-ADR. A second Module could move where rendering belongs, so the altitude is wrong for an ADR. Note that ADRs are created and edited only by `archgate:adr-author` — other skills delegate to it.
