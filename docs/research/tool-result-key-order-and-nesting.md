# Key Order and Nesting Depth in Small Tool-Result JSON: What the Evidence Actually Supports

Research question: a CLI tool returns a small JSON object (~10 top-level keys, a few hundred
tokens total) to an AI coding agent mid-task, and the object carries a directive the agent is
expected to notice and follow. Does (a) the **order** of the top-level keys, or (b) the
**nesting depth** at which the directive-carrying key sits, measurably affect how reliably the
agent acts on it? Three sub-questions, using **primary sources only** (model-provider
engineering docs, official tool-use guidance, arXiv/peer-reviewed papers — not blog aggregators
or secondary write-ups):

1. Does the serial-position / "lost in the middle" positional-bias literature — canonically
   Liu et al., [_Lost in the Middle: How Language Models Use Long Contexts_](https://arxiv.org/abs/2307.03172) — apply **within** an object this small, or was it measured
   at a scale (many thousands of tokens, dozens to hundreds of list entries) that does not
   obviously transfer down?
2. Do Anthropic, OpenAI, or Google give explicit guidance on structuring tool-**result** JSON —
   key order, flat-vs-nested, "put the instruction first" — as distinct from guidance on the
   schema a model must **generate** to call a tool?
3. Does any study isolate nesting depth of a directive-carrying key, inside a small tool-result
   object, as an independent variable against directive-following reliability as the dependent
   one?

This document does not adjudicate the competing consideration raised alongside the question —
uniformity with three existing sibling CLI commands has value of its own, independent of any
measured effect on reliability. It reports only what primary sources say, and states plainly
wherever the closest available evidence was measured at a different scale, or addresses a
different half of the tool-use loop, than the question actually asked.

Probed 2026-09-09. Every claim below carries the URL it was read from and, where feasible, a
verbatim quote. Evidence is tagged **[on-point]** when it addresses the actual question (a
directive inside a small, already-generated tool-result object the agent must read and act on);
**[different scale]** when the mechanism may be related but was measured only at a much larger
size; **[different direction]** when the guidance concerns the opposite half of the tool-use
loop (schemas a model must generate, not results it reads); and **[near miss]** when a source
uses the same word — "depth" — for a structurally unrelated thing.

## Direct answers

**Q1 — no, not at this scale, and the paper's own numbers say why.** Liu et al.'s smallest
tested condition is 10 retrieved passages of ≤100 tokens each (multi-document QA) or 75
key-value pairs of 128-bit UUIDs (key-value retrieval). Both are far larger, in entry count and
in total token footprint, than a ~10-key / few-hundred-token object. The U-shaped
primacy/recency curve the paper reports is a finding about _that_ scale; the paper neither
measures nor claims anything about whether the effect holds an order of magnitude smaller. See
§1.

**Q2 — no such guidance exists for tool-result shape; the guidance that does exist runs the
opposite direction.** Anthropic's engineering guidance on tool design explicitly declines to
prescribe a response format ("there is no one-size-fits-all solution") and states no rule on key
order or nesting depth for what a tool _returns_. OpenAI's o3/o4-mini function-calling guide and
Google's Gemini function-calling docs do discuss flat-vs-nested and nesting depth — but only for
the JSON **schema the model must fill in when it calls a tool**, which is the opposite side of
the loop from a directive the model must read out of a tool's result. No vendor was found
stating a key-order rule for either side. See §2.

**Q3 — no.** No primary-source study was found that isolates nesting depth of a
directive-bearing key inside a small tool-result object as an independent variable against
compliance as a dependent one. The closest candidates in the current literature either measure
JSON nesting depth as a **generation/extraction-difficulty** axis (not a
reading-and-acting-on-a-directive axis), or use the word "depth" for an unrelated construct —
position in a multi-turn tool-call sequence, not structural nesting inside one JSON object. See
§3.

## 1. Lost in the Middle: what was actually measured, and the scale gap

Source: Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni, Liang. [_Lost in the Middle: How
Language Models Use Long Contexts_](https://arxiv.org/abs/2307.03172) (arXiv:2307.03172; full
text read via [the HTML rendering](https://arxiv.org/html/2307.03172v1)).

| Task                | Sizes tested                                          | Entry format                                                                                         | Notes                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-document QA   | 10, 20, or 30 documents ("2.7K examples each")        | Wikipedia passages, "chunks [of] most 100 tokens" each                                               | Exactly one document contains the answer; the rest are Contriever-retrieved distractors "presented in order [of] decreasing relevance"; position of the answer-bearing document and total document count are both varied. |
| Key-value retrieval | 75, 140, or 300 key-value pairs ("500 examples each") | Keys and values are "128-bit UUIDs"; task is "to return the value associated [with a] specified key" | Exactly one pair is relevant, the rest are distractors; natural language was deliberately stripped out "to avoid linguistic confounders"; input is a single serialized flat JSON object.                                  |

Main finding, quoted directly: "[We] find [that] performance [is] often highest [when]
relevant information occurs [at the] beginning or end [of the] input context, [and]
significantly degrades [when] models must access relevant information in [the] middle [of]
long contexts." For the QA task specifically: "Performance [is] generally highest when relevant
information is positioned [at the] very start [or] end [of the] context, [and] rapidly degrades
[when] models must reason over information in [the] middle [of the] input context." The
key-value task shows the same shape, with one exception worth carrying forward as balance
against over-applying the effect: "Claude models were 'nearly perfectly' accurate at all lengths
tested."

Magnitude, to make "significantly degrades" concrete: GPT-3.5-Turbo's mid-context open-book
accuracy on the QA task fell _below_ its no-document (closed-book) baseline of 56.1% — 52.9% at
20 documents with the answer at position 10, and 49.5% at 30 documents in the 16K-context
variant. Averaged over position, accuracy also declines as the context lengthens, and "models
[with] longer maximum context windows [are] not necessarily better at using [the] extended
context." The authors attribute the shape to the psychological serial-position effect, and rule
out instruction-tuning as the sole cause (base, non-instruction-tuned MPT-30B shows the same
curve). They also find that "query-aware contextualization" (repeating the query after the
data, not just before it) essentially fixes the key-value task at all tested lengths but "barely
shifts" the QA task's U-shape — i.e. even within the paper's own scale, the effect is sensitive
to prompt construction, not a fixed law of transformer attention.

**Why this does not transfer cleanly to the question asked.** Two independent gaps, not one:

- **Scale.** The paper's smallest key-value condition (75 pairs of UUID strings) is roughly 7–8×
  the entry count of a ~10-key object, and — because UUIDs are long tokens — almost certainly
  exceeds "a few hundred tokens" on its own, before the surrounding prompt. The smallest QA
  condition (10 documents of ~100 tokens) is ~1,000 tokens of document text alone. Neither
  condition is close to the object size asked about; the paper has no data point there, and
  states no claim about what happens below its tested range.
- **Task shape.** Liu et al.'s tasks always tell the model explicitly which key or fact to look
  for ("return the value associated with this specified key"); the model's job is targeted
  retrieval on an already-named target. The scenario in the research question is different in
  kind: the agent must _notice_ an embedded directive it was not told to look for and then act
  on it. Positional-retrieval accuracy and unprompted-directive noticing are related but
  distinct capabilities, and the paper measures only the former.

Tagged **[different scale]** in both dimensions above. No primary source was found that reruns
either task at object sizes as small as ~10 entries / a few hundred tokens.

## 2. Vendor guidance on tool-result shape: what exists and what does not

### 2.1 Anthropic

[Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
gives one shaping rule for _results_, about signal density, not order or depth: "Design tool
responses to return only high-signal information... Bloated responses waste context and make it
harder for Claude to extract what matters." No key-order or nesting-depth rule for tool results
appears anywhere on the page. Nesting is presented as unremarkable on the _schema_ side: complex
`input_schema` objects with "nested objects" are used without comment throughout the page's
examples.

[Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)
contains Anthropic's one binding ordering rule near this topic, and it is important to separate
it from the question asked: "In the user message containing tool results, the tool_result
blocks must come FIRST in the content array. Any text must come AFTER all tool results." This
governs the order of **message content blocks** (a `tool_result` block versus a `text` block) —
the wrapper around a tool result — not the order of **keys inside** one tool_result's JSON
payload. Conflating the two would overstate what Anthropic actually specifies. The same page
also frames tool-result content as something Claude reads and can be steered by, which is
relevant background but not evidence about position or depth: "Tool results often carry content
from sources outside your control... Treat that content as untrusted... Keep untrusted content
inside `tool_result` blocks rather than `system` prompts or plain user `text` blocks."

Anthropic's engineering post ["Writing effective tools for agents"](https://www.anthropic.com/engineering/writing-tools-for-agents)
is the most direct treatment of tool-result shaping and is explicitly non-prescriptive: "Even
your tool response structure — for example XML, JSON, or Markdown — can have an impact on
evaluation performance," but "there is no one-size-fits-all solution," because "the optimal
response structure will vary widely by task and agent." Its concrete recommendations are about
signal density and token economy — preferring natural-language identifiers over "cryptic
identifiers" like `uuid`, returning "only high signal information," and offering
`response_format` levers (`"concise"` vs `"detailed"`) — not about key order or nesting depth.
The one ordering claim in the essay concerns the agent's _own_ generated output, not a tool
result: instructing agents to emit reasoning/feedback "_before_ tool call and response blocks
may increase LLMs' effective intelligence by triggering chain-of-thought (CoT) behaviors." That
is a different artifact (the agent's own turn) than the tool-result JSON the question is about.

### 2.2 OpenAI

The [function-calling guide](https://developers.openai.com/api/docs/guides/function-calling)
confirms nesting is unremarkable on the schema-generation side: "you can leverage many of its
rich features like property types, enums, descriptions, nested objects, and recursive objects."
For what a tool call actually **returns**, the guide leaves the shape fully open: the value
passed back is "typically a string, [and the] format is up to you (JSON, error codes, plain
text, etc.)," and "the model will interpret [the] string as needed." No key-order or
nesting-depth guidance is given for results. (Note: the fetched page text showed signs of
compression/dropped connective words in places; quotes above preserve the page's own wording
where unambiguous.)

The [o3/o4-mini function-calling guide](https://developers.openai.com/cookbook/examples/o-series/o3o4-mini_prompting_guide)
directly answers a flat-vs-nested question, but for the opposite half of the loop — **[different
direction]**. Asked "Is it OK to have deeply nested params within tools or should I 'flatten' out
the schema?", it answers: "There [is] again no hard guidance. However, even if [a] nesting
structure [is] technically supported, deeply layered argument trees [can] impact performance
[and] reliability," and its default recommendation is "we recommend you err on the side of
making arguments flat." This concerns the JSON **arguments the model itself must construct** to
call a tool, not a value the model reads out of a tool's result — the reverse direction from the
research question.

### 2.3 Google

The [Gemini function-calling docs](https://ai.google.dev/gemini-api/docs/function-calling) give
one depth-adjacent caution, again on the schema-generation side — **[different direction]**:
"For `any` mode, the API may reject very large or deeply nested schemas." Function _responses_
(what gets returned to the model) are structured only at the wrapper level — as one or more
typed content blocks inside a `function_result` step's `result` field, each block specifying its
`type` (e.g. `"text"`, `"image"`) — with no stated rule about key order or nesting depth of the
payload itself. Stated best practices concern type strength and description clarity ("Strong
Typing: Use specific types (integer, string, enum)"; "Function and Parameter Descriptions: Be
clear and specific"), not structure or depth.

**Cross-vendor summary.** All three vendors that discuss nesting depth at all (OpenAI, Google) do
so only for schemas the model must populate when _calling_ a tool. None of the three gives any
stated rule — for either direction — about the order of keys within a single JSON object. No
vendor was found addressing the consumption-side question this task asks about.

## 3. Studies using "nesting depth" or "directive in a tool result": near misses, not matches

Three candidate papers were checked directly against their arXiv abstract pages (not taken from
search-engine summaries) because they looked, from search snippets alone, like they might be
on-point. None isolates the variable the research question asks about.

**[arXiv:2509.25922](https://arxiv.org/abs/2509.25922) — "DeepJSONEval: Benchmarking Complex
Nested JSON Data Mining for Large Language Models."** Uses nesting depth as a difficulty axis
inside a data-comprehension/extraction benchmark: "2100 multi-domain instances [with] deep
nested structures, categorized by difficulty," reporting "significant performance gaps [among]
LLMs in handling complexity." This is evidence that nesting depth correlates with difficulty in
JSON comprehension generally — directionally adjacent to "deeper nesting could plausibly be
harder to act on" — but it measures extraction/comprehension **accuracy** on a data-mining task,
not directive-**compliance** on a tool-result-reading task, and its difficulty tiers bundle depth
together with other complexity factors (field count, value types) rather than isolating depth on
its own. Tagged **[different task shape]**; cannot be used to quantify a depth-specific
compliance effect.

**[arXiv:2605.30686](https://arxiv.org/abs/2605.30686) — "Depth-Dependent Indirect Prompt
Injection in Tool-Calling ReAct Agents: Injection Depth, Payload Framing, and Turn-Budget
Sensitivity."** This is the closest-sounding title found, and it is a **[near miss]** precisely
because its "depth" means something else: position in the sequence of tool-call turns an agent
has already made (payload planted at tool observation #1 versus #4 or #5), not structural
nesting inside one JSON object. Its 460-trial evaluation (20 scenarios, GPT-4o-mini and Claude
Haiku) does establish, as a real measured fact, that agents act on directives embedded in a
tool's return value at all — that's the premise of the attack — and that compliance is
strongly sequence-position-dependent: "ASR [for] GPT-4o-mini decays [from] 60% [at] depth 1
[to] 0% [at] depths 4-5," while Claude Haiku "achieves 0% ASR [at any] depth." That is a genuine
"position affects compliance" finding, but the position being varied is _which turn in a
multi-turn conversation_ the instruction arrives in, not _how deeply nested inside a single
JSON object_ the instruction sits. Citing this paper as support for a nesting-depth claim would
be borrowing its vocabulary rather than its finding.

**[arXiv:2608.01056](https://arxiv.org/abs/2608.01056) — "Control Under Compression:
Reliability Frontiers for Tool-Using Agents."** Not on point at all: it measures how compressing
persistent system-side "agent control contexts" affects task-completion reliability across three
Qwen models and 15,525 runs, finding "a nonlinear, method-dependent reliability frontier" and
that "compression primarily surfaces as tool-execution and action-parsing errors." Nothing in it
concerns JSON structure, key order, or nesting depth. Included only to record that it was
checked and ruled out.

None of the three substitutes for a study that would actually answer sub-question 3: vary only
the nesting depth of a directive-carrying key inside an otherwise-fixed, small tool-result
object, and measure directive-compliance rate as the outcome. That study was not found.

## 4. What could not be established

- Whether a "few hundred token" tool result is large enough for any positional-bias mechanism to
  engage at all. Liu et al.'s smallest tested conditions are larger in both entry count and
  token footprint; no smaller-scale replication of either task was found.
- Whether the U-shaped curve, if it exists at very small scales, would express itself as
  sensitivity to **key order** in a serialized JSON object. Liu et al. manipulate the position of
  the answer-bearing item within a linearly serialized context, which is a plausible proxy for
  "key order in a small JSON object," but no primary source was found that tests this
  equivalence directly.
- Whether Claude in particular inherits the effect at all. Liu et al.'s own key-value results
  note Claude models were "nearly perfectly accurate at all lengths tested" — one data point
  from a 2023 paper, working against (not for) a strong effect for this specific model family,
  and not something this document treats as settling the question either way.
- Any vendor statement, from any of the three surveyed, about **key order** specifically (as
  opposed to flatness/nesting) for either tool schemas or tool results. None was found.
- Whether the competing consideration raised alongside this question — uniformity with three
  existing sibling CLI commands — outweighs a plausible-but-unmeasured reliability effect. That
  is a design judgment this evidence review does not have the material to settle, and it takes
  no position on it.
