---
name: adr-prose-compression-not-relocation
description: To fit an ADR under its character budget, compress prose to terse imperative one-liners in place — do not relocate content to a reference file
metadata:
  type: feedback
---

When an ADR is over its character budget, **compress it where it stands**. Reduce each item to a
one-line instruction: imperative mood, no pronouns, no reasoning-first preamble, no worked example,
no restated test. Relocating content to a non-ADR reference file is the _last_ resort, not the first.

**Why:** Han rejected moving `GEN-001`'s §5 prose standard (Root/Altitude/History/Density/
Machinery/Audience) out to `docs/agents/` to buy 3,000 characters (2026-08-27): "preferably don't
cut but reduce it to a oneline instruction without special reasoning first. Save tokens on removing
pronouns, using imperativ style". An ADR loads into agent context on Read via `.claude/rules`, so
content that leaves the ADR stops steering the author. Compression keeps the instruction on the
authoring path; relocation trades the budget for reach. Note this cuts against
`docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md` consequence 3, which names
delegation-to-a-reference-file as the proven budget technique — Han prefers compression first.

**How to apply:** Any ADR over budget, and any ADR being authored from scratch. Before proposing a
split or a relocation, price the compression: strip pronouns, articles where they carry nothing,
"which is"/"so that"/"in order to", the justification clause after the instruction, and any test or
example restating the rule. Only when compression plus a legitimate concern-split still misses the
budget should content leave the ADR. Applies to the whole document, not just the section that
overflows. See [[grilling-format-prose-not-picker]] and [[han-operator-author]].
