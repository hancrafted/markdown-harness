---
name: split-vision-into-channel-and-condition
description: When Han expands scope mid-grill with a runtime vision, decompose it into the channel and the condition, price each, ship the channel as a same-day fallback — do not refuse and do not swallow it whole
metadata:
  type: feedback
---

Han answers a grilling round by **adding a vision**, not just picking an option. On 2026-09-08 he
answered "Q2: 1, 3" and then attached a whole new capability: a hook or MCP that forces an agent to
consult the tool at run time and returns a deterministic prompt when a document has gone stale.

Do not refuse it, and do not accept it whole. **Split it into two axes and price them separately:**

- **The channel** — what makes the agent consult the tool at the right moment. Usually cheap, and
  often already possible with what ships. Here, a hook calling the existing `mh --query` and
  injecting the Rule's `intent` needed _zero_ new CLI code.
- **The condition** — what makes the answer depend on state. Usually the expensive half, because it
  moves a contract. Here it needed a new command, new config vocabulary, and Conformance cases.

Then recommend **shipping the channel first as a committed fallback** and gating the condition behind
a design ticket. He took that in full ("Q1: 2"), including the instruction to commit the fallback in
the morning so the demo was safe regardless.

**Two argument shapes that won, both worth reusing:**

1. **Quote his own vision doc's exact words back.** He proposed `--verify-staleness`; the
   recommendation was `--steer`, and the argument that landed was that `product.md`'s horizon row for
   his own presentation date already reads "`init`, `check`, `steer` demonstrable". His own prose
   beat his own proposed name. See [[trace-term-provenance-before-renaming]].
2. **Name the tenet the idea breaks, then hand him the fix that preserves it** — never just the
   objection. A staleness check consults the clock, which breaks tenet 3's "the same tree in gives
   the same result out". The accepted answer was to make `now` an explicit `--now <iso>` input echoed
   in the response, so determinism survives _and_ the demo becomes controllable. He took it over the
   simpler system-clock option.

**Why:** he reasons out loud and expands while deciding. A flat refusal loses the idea; a flat yes
loses the deadline. Decomposition keeps both.

**How to apply:** Any grilling round where his answer grows the scope — especially under a date.
Also check whether the expansion is already recorded as provisional reasoning in
[issue #1](https://github.com/hancrafted/markdown-harness/issues/1); his staleness idea was
substantially A1–A3 there, and citing it turned "new feature" into "graduating a recorded decision".
See [[han-operator-author]], [[grilling-format-prose-not-picker]] and
[[two-corpus-governance-test]].
