---
type: design-adr
status: accepted
---

# The integrated tier freezes the cross-Module gaps as contract, and per-Module invocation stays unbuilt

Two Modules that know nothing of each other (tenet 12) leave gaps between them that no Module can see
and no validation closes. This record states which gaps the integrated tier freezes as deliberate
behaviour, so the next person to find one reads a decision and not a bug, and records why
per-Module invocation is not part of this round.

## The gaps, frozen

1. **A silent type miss.** A file that a `type`-gated Rule of `body-structure` would govern, whose
   `type` is missing, misspelt, or unreadable because the frontmatter does not parse, selects no such
   Rule and passes through `body-structure` without a word. It is reported only where
   `frontmatter-harness` happens to constrain `type`. This is the design of
   [`0012-body-structure-is-a-second-module-selected-by-type.md`](./0012-body-structure-is-a-second-module-selected-by-type.md),
   and one case in each failure mode freezes it, plus one where nothing reports it at all.
2. **Satisfying one Module un-governs the other.** Where the first Module forbids frontmatter in a
   folder and the second selects on a `type` only frontmatter can carry, a file with a block fails
   the first and is judged by the second, and the same file with the block removed passes the first and
   is passed by the second. Both behaviours are frozen.
3. **The `type` vocabularies may disagree.** The value the second Module selects on may be a value the
   first Module refuses, in which case the files it governs already fail, and the value the first
   accepts may never be selected. Nothing compares the two lists. This is the cross-Module
   validation the instruction places out of scope.
4. **An exclusion belongs to one Module.** A file the first Module's `excludeFiles` removes is still
   governed by a second-Module Rule that writes none.
5. **Rule ids belong to their Module.** Two Modules may each name a Rule `research`; the block names
   the Module, so the response is unambiguous, and a duplicate id is a fault only inside one section.
6. **Block order is the declared Module set's, never the config's.** The integrated config writes
   `body-structure:` first so that the frozen response can only be right by the declared order.

## Per-Module invocation is deferred, and additive

The four commands stay as they are and run every Module. A way to run one, whether `mh body …` and
`mh frontmatter …` or a `--module` filter, is not built in this round. It does not need to be, to
freeze the contract: the `modules:` nesting of every response already addresses a Module by name, so a
filter is a composition over blocks that already exist and not a change to any block, any code or any
exit code. Adding it later breaks no adopter and no reimplementation, which is what lets the freeze
happen without it. Measured against the two vision tests: it serves the Operator and not the
Contributor, it crosses no boundary, and it is aimed past the current horizon, so it competes with
nothing now.

## Consequences

1. The integrated tier is adversarial by construction, and a case there that begins to pass for a
   different reason than its argument states is a signal to reread the argument.
2. A future cross-Module validator changes cases 1 to 3 on purpose, as a contract change, and may not
   alter them quietly.
