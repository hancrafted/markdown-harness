---
type: agent-guide
---

# Grilling Format

How a grilling round is written in this repo. It covers every round: `/grill-me`, `/grill-with-docs`, and the grilling Wayfinder runs while charting a map or resolving a `wayfinder:grilling` ticket.

This **overrides** the grilling skill's "ask the whole frontier in one round". The frontier still decides which questions are askable; the cap below decides how many of them ship this round.

## Round size

- **Five questions at most** in a normal round.
- **Three at most** when the round turns on an architectural decision — one that fixes structure the later work has to sit on: a data shape, a boundary, a file layout, a dependency.

When the frontier is wider than the cap, ask the questions the rest of the frontier hangs on and leave the others for the next round.

## Question shape

Keep the grilling skill's markers (`❓ **Qn**`, `➡️`) and fill each question out with three parts:

1. **Options** as a numbered list, one line each.
2. **An example per option**, showing what the decision looks like once taken — the file it writes, the config it changes, the directory layout it produces. Show the effect; don't describe it.
3. **A recommendation** under the options, naming the option it picks and why it wins.

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

❓ **Q1** — **Where the violation renderer lives**: the CLI has to turn a `FileViolations` list into text. Two Packages can hold it.

1. **`cli`** — the renderer sits with the surface that prints it.
2. **`response-contract`** — the renderer sits beside the shape it renders.

Option 1 writes:

```
src/packages/cli/lib/render/
└── violations.pure.ts
```

Option 2 writes:

```
src/packages/response-contract/lib/
└── render.pure.ts
```

➡️ **Option 1.** `ARCH-004-folders-and-files` Decision 3.1 lets outside code reach a Package only through its entry point, so option 2 buys a renderer that `cli` cannot call until `response-contract` widens its entry point to export it. Rendering is a CLI concern; the contract holds the shape.

---

❓ **Q2** — **Where the choice in Q1 is recorded**: the placement outlives this session, so it needs a home.

1. **An ADR under `.archgate/adrs/`**, which can carry a companion `.rules.ts` that fails `npm run verify` when a file drifts.
2. **A design-ADR under `docs/design-adr/`**, which records the reasoning and enforces nothing.

Option 1 adds:

```
.archgate/adrs/ARCH-008-render-placement.md
.archgate/adrs/ARCH-008-render-placement.rules.ts
```

Option 2 adds prose only:

```
docs/design-adr/0007-render-placement.md
```

➡️ **Option 2.** `GEN-001-adr` reserves an ADR for "one universal constraint on how code is written, at an altitude no future feature can invalidate", and sends feature- and contract-shaped reasoning to a design-ADR. A second Module could move where rendering belongs, so the altitude is wrong for an ADR. Note that ADRs are created and edited only by `archgate:adr-author` — other skills delegate to it.
