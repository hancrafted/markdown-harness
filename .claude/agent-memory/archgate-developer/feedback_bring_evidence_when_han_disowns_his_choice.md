---
name: bring-evidence-when-han-disowns-his-choice
description: When Han answers a design question by calling his own stated preference ungrounded and offering to adjust given research, dispatch the research — and a defensible "no evidence either way" is an acceptable answer
metadata:
  type: feedback
---

When a closed design ticket and the existing code conflict, and you put the conflict to Han as a
two-option choice, he may **decline to choose and disown his own option instead**. On 2026-09-09
(`--assess` response shape, [#56](https://github.com/hancrafted/markdown-harness/issues/56)) his
answer to "flat object or envelope?" was that the flat shape "was based on the assumption that we
need to move the important signals at the beginning… It was not grounded on my research. If you can
somehow add your research to which format is more suitable, I would be willing to adjust it."

**The move is to go and measure, not to re-ask.** Dispatch a research subagent against primary
sources, and tell it explicitly that **"no evidence either way" is a valid finding** — otherwise it
will manufacture support for whichever side it thinks you want. That framing paid: the report found
the canonical positional-bias paper (`arXiv:2307.03172`) measures 10 passages or 75 key-value pairs,
an order of magnitude above a ten-key object, and claims nothing at that scale; that no vendor states
a key-order rule for tool _results_ (the flat-vs-nested guidance that exists is for the schema a
model _fills in_ — the opposite side of the loop); and it surfaced one data point running _against_
his instinct, that paper's own note that Claude models were "nearly perfectly accurate at all lengths
tested".

**When the evidence underdetermines, the tiebreaker is the other consideration, and you say so.**
Here that was uniformity with three sibling commands plus one shape for both an answer and a
rejection. Ship it, name it as the tiebreaker rather than as a finding, and price the reversal —
"reversible in one commit" is what makes shipping-before-agreement legitimate.

**How to apply:** any round where he answers a question by explaining the _reasoning_ behind his
preference rather than defending it. That is the tell. Also expect him to be right that the CLI
output may not be the final surface — he noted an MCP or abstraction layer could denormalise later,
which is a real argument for keeping the tool's shape uniform and letting a consumer reshape.
See [[han-operator-author]] and [[vocabulary-over-migration-cost]].
