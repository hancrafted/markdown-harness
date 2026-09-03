---
name: self-describing-over-inherited-jargon
description: For script and file names Han takes the longer self-describing name over continuity with prose jargon, even when the jargon has real provenance — then record the translation
metadata:
  type: feedback
---

When naming a script, file, or command, prefer the longer self-describing name over a short
term inherited from the surrounding prose — even when that term has genuine provenance.

**Why:** for the ablation scaffold I traced "stamp" to two frozen Decisions rows on map #18
("one fresh repo per run, stamped by script", "stamped into every scaffold at a recorded
SHA") and recommended `stamp-run.sh` to keep continuity with the map, the ticket and the
scoring ticket. Han asked "what is stamp.sh and what does it do? can we have a more
descriptive and longer name?" and chose the zero-jargon pair, `build-arm-templates.sh` and
`create-run-repo.sh`. The test he applies is whether a newcomer can tell what the thing does
from its name alone; shared vocabulary with existing prose does not outweigh that.

**How to apply:** still trace the provenance first and still offer the jargon-preserving
option — he wants the fact, and the argument, before he overrides it. But expect it to lose,
and when it does, record the translation explicitly ("read 'stamp a run' in the tickets as
`create-run-repo.sh`") wherever the old term survives, because the prose is not being
rewritten to match.

Distinct from [[vocabulary-over-migration-cost]], and worth holding both: that one is about
**domain nouns**, where the better term wins even at the cost of renaming every quote site.
This one is about **artifact names**, where self-description beats shared vocabulary.
