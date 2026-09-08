---
name: two-corpus-governance-test
description: After v0.0.1, Han is proving markdown-harness on two real corpora at once — ai-coaching-hub (greenfield, leads) and this repo's docs/ (brownfield, the proof obligation) — under a workshop and all-hands deadline
metadata:
  type: project
---

Since publishing `0.0.1`, the work is no longer building the CLI. It is proving the CLI on **two
real corpora**, tracked from one central map:
[Map: govern two corpora](https://github.com/hancrafted/markdown-harness/issues/54).

- **Greenfield leads** — `~/Developer/ai-coaching-hub`, an LLM-wiki knowledge base for coaching
  content. Its own tickets live in `hancrafted/ai-coaching-hub` and are linked back from map #54's
  **Cross-repo tickets** section, because GitHub sub-issues cannot span repositories.
- **Brownfield follows** — this repo's `docs/`. It carries `product.md`'s proof obligation: _"a
  governance tool whose author does not govern their own knowledge base with it has no standing in
  a room full of people being asked to adopt it."_

**Why:** Han's framing — the frontmatter harness is "like inventing a language", and what is missing
are the "structures to create great poems". The deadlines are real and short: build day
**2026-09-09**, team workshop **2026-09-10**, company-wide AI all-hands **2026-09-15**. That last
date is literally the horizon row in `docs/vision/product.md`.

**How to apply:** Two things shape any suggestion here.

1. **Conformance is not the demo.** `--check`, `--query` and `--audit` all serve the tier
   `product.md` calls "the lowest and the least interesting". **Signal** is the named differentiator,
   and measured 2026-09-08 _zero_ documents in either repo carried `stale_after`, `verified` or
   `generated`. Anything that only exercises Conformance is not moving the thesis.
2. **Greenfield leads for a reason** — the workshop is trainees setting up _their own_ LLM-wiki, so
   ai-coaching-hub is the rehearsal of the path they walk, not just the cleaner test bed.

Map #54's **Out of scope** deliberately parks the eight
[Map: mh-cli](https://github.com/hancrafted/markdown-harness/issues/29) cleanup tickets (#38–#45).
They are real work competing for one build day; do not pull them into this effort.

Note the map's decay risk: everything above is dated. Re-read #54 before assuming the frontier is
where this memory left it. See [[han-operator-author]] and
[[split-vision-into-channel-and-condition]].
