---
type: agent-guide
---

# Maintaining CONTEXT.md — the method

Draft of the `maintain-context` skill. Method only: how a glossary pass is run and why each
step is shaped the way it is. What was ruled on which entry lives in the dated record under
`docs/housekeeping/`, never here.

Written at each section close, and only when a section taught something. A file with one
entry per section is padding.

## After § Dependency governance (1 entry, rehearsal)

**Rehearse on the smallest section.** One entry surfaced two measurement defects and one
report-format change before any of it was repeated fourteen times. The cost of the rehearsal
was one entry; the cost of skipping it would have been fourteen rulings resting on numbers
that were wrong.

**Derive the inventory; never hand-count it.** A hand count of the glossary said 43 entries.
The parser said 44. The extra one used a variant line shape (`**Floor** —` rather than
`**Term**:`) and was invisible to the eye and to a naive grep alike. A derived inventory
cannot disagree with the file it describes — and the parser must report what it failed to
parse, because a parser that silently matched 42 of 43 hands back a complete-looking pass
with an entry missing from it.

**Measure case-insensitively, then report the case split.** The first real entry measured
`naming 0` — "occurs nowhere outside CONTEXT.md" — while the ADR that owns the concept used
the term nine times in lowercase. The glossary capitalises as house style; usage does not.
A case-sensitive default turns that difference into a zero, and a zero reads as evidence of
absence rather than as evidence of nothing being in scope. Report `case-exact N of M`
instead: when it reads `0 of M`, the glossary's own spelling has drifted from every use of
the term, which is a finding in its own right.

**Position classes are only as good as their tightness.** Classifying any code span
containing the term as "the term being named" inflated one term's headline from 29 to 92.
The span has to _be_ the term. The distinction the classes exist to draw — naming the
concept versus using the word — collapses the moment a class is generous.

**Spread samples across buckets.** With samples taken in bucket order, a term with 92 naming
hits never showed a single quarantined line. The quarantine is only honest if it stays
visible, so take a few from each bucket rather than the first few overall.

**Patch scripts with assertions.** Two edits silently matched nothing after the formatter had
reflowed the file, and the only reason it surfaced was a missing line in the output. A
string replacement that finds no match must fail loudly; otherwise the script keeps running
with the defect the patch was written to remove.

**Put second-order consequences in the dossier, not after the verdict.** Whether a deleted
term leaves a retired stub, and what happens to a section heading that held only that entry,
were raised after the ruling and forced a second round. They belong in the initial dossier,
written as questions with numbered options and a recommendation, so one reading produces one
decision.

**A delete includes the entry's `_Avoid_` bans.** Removing an entry removes the spellings it
outlawed. Measure whether those spellings are in live use before dropping them: here all
three were dead, one surviving only in a pinned transcript that predated the ban, so nothing
was lost — but that was a measurement, not an assumption.

**Prove the governance check guards what you just wrote.** A new document under `docs/`
passed `mh --check` immediately. Passing proves nothing until the field it requires is
removed and the check goes red on that exact path. It did.
