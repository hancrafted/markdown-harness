---
type: housekeeping
---

# CONTEXT.md housekeeping — 2026-09-13

> Snapshot of the 2026-09-13 pass. Every count below was true when it was taken and is
> **not a claim about the present**. Re-measure before relying on any number here.

Ruled by: `human:han`. Measured by: `.agents/skills/maintain-context/scripts/occurrences.mjs`.
Runs alongside `#137 Map: CONTEXT.md housekeeping — a glossary that carries no facts, bans
by sense, and declares its own freshness`.

## Resume

    workflow   section read whole → dossier per entry (table + balanced cases +
               second-order questions in grilling format) → han rules in chat → row written
    measure    node .agents/skills/maintain-context/scripts/occurrences.mjs --section "<name>"
               defaults: case-insensitive, plural-tolerant, loose prose quarantined
               overrides recorded per row; none used yet
    scope      this pass covers ~1/3 of the file by hand; the rest runs under the
               `maintain-context` skill, now installed at
               .agents/skills/maintain-context/
    landing    edits applied per entry, staged at each section boundary, never committed
               by the agent
    stamp      blocked until every in-scope entry carries a verdict, reopens are closed,
               the closing re-run is written here, and npm run verify is green

    inventory  (opened at 44 entries / 8 sections; now 43 / 7)
      Dependency governance          1/1  ✓ closed — section removed
      The product                    0/14 ← next
      Decision records               0/5   out of this batch
      How the code is written        0/7   out of this batch
      The pinned spec                0/2   out of this batch
      What `markdown-harness` checks 0/6   out of this batch
      What is promised               0/5   out of this batch
      The Conformance suite          0/4   out of this batch

    deferred collisions   (none yet)
    next       § The product, entry 1 of 14 — `markdown-harness`

## § Dependency governance — closed 2026-09-13T19:29:28Z

### Admission bar — CONTEXT.md:344 (before removal)

Measured:

|     | where                              | naming | prose | comments | files |
| --- | ---------------------------------- | -----: | ----: | -------: | ----: |
| >   | AGENTS.md / CLAUDE.md              |      0 |     0 |        0 |     0 |
| >   | ADRs (.archgate/adrs)              |      2 |    10 |        0 |     2 |
| >   | ".claude/rules" mirror — same text |      2 |     8 |        0 |     1 |
| >   | skills                             |      0 |     0 |        0 |     0 |
|     | other docs (design-adr)            |      0 |     2 |        0 |     2 |
|     | code & config                      |      0 |     0 |        1 |     1 |
|     | TOTAL outside CONTEXT.md           |      4 |    20 |        1 |     6 |
|     | CONTEXT.md itself                  |      1 |     0 |        0 |     1 |

`case-exact 0 of 4` — the glossary wrote `Admission bar`; every occurrence in the wild
writes `admission bar`.

The `_Avoid_` line banned `dependency policy`, `vetting checklist` and `approval gate`.
Measured before removal: one hit, in `docs/workshop/grill/vision/raw.md`, a pinned
transcript predating the ban. No live enforcement was lost.

**Case for keep:** carries posture rather than mechanics; the term travels into
`0004-compiled-entry-and-bounded-tarball` and `0005-host-dependent-glob-case-matching`
without being defined there; `ARCH-001-dependency-admission-bar` is globbed to
`package.json` and so never loads for a design-ADR reader.

**Case for delete:** every posture sentence already sits in
`ARCH-001-dependency-admission-bar`, harder and with thresholds attached, making the entry
a weaker second copy and a second place to update; zero hits on the instruction path;
both design-ADR sightings name the ADR in the same sentence; the four signals are a fact,
in a glossary that carries none.

**Verdict: delete — han, 2026-09-13T19:29:28Z.** Reason given: _"Admission bar is self-explanatory enough."_
Clean removal rather than a retired stub, and the `### Dependency governance` heading
removed with it, since it held nothing else. Nothing evicted — no content was unique to
the entry.

Not reopened.
