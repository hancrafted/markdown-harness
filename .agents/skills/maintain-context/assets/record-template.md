---
type: housekeeping
---

# <Glossary> housekeeping — YYYY-MM-DD

> Snapshot of the YYYY-MM-DD pass. Every count below was true when it was taken and is
> **not a claim about the present**. Re-measure before relying on any number here.

Ruled by: `human:<name>`. Measured by: `<skill>/scripts/occurrences.mjs`.

## Resume

    workflow   section read whole → dossier per entry (table + balanced cases +
               second-order questions) → human rules → row written
    measure    node <skill>/scripts/occurrences.mjs --section "<name>"
               defaults: case-insensitive, plural-tolerant, loose prose quarantined
               overrides: <recorded per row, or none>
    scope      <which sections this pass covers, and what happens to the rest>
    landing    edits applied per entry, staged at each section boundary, never committed
               by the agent
    stamp      blocked until every in-scope entry carries a verdict, reopens are closed,
               the closing re-run is written here, and the project gate is green

    inventory  (opened at <N> entries / <M> sections)
      <Section>                      0/<n>
      ...

    deferred collisions   (none yet)
    next       § <section>, entry <i> of <n> — <term>

## § <Section> — closed <timestamp>

### <Term> — <file>:<line>

<measurement table>

`case-exact <n> of <m>` — <only if it says something>

**Case for keep:** <one paragraph>

**Case for delete:** <one paragraph>

**Verdict: <verdict> — <name>, <timestamp>.** Reason given: _"<their words>"_.
<what the verdict set in motion: stub or clean removal, heading kept or dropped,
anything evicted and where it went>

Reopened: <no, or by what and when>
