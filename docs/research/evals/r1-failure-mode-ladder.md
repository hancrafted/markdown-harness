---
type: research
---

# R1 — The failure-mode ladder for a Steering query's answer

## Open research question

When an Operator's `intent` sentence is supposed to change what a Contributor's agent writes and the file comes back unchanged, where on the path did it die? The aim is a ladder of rungs such that a null result names exactly one of them, instead of collapsing into "no steering".

Scope is level one only: does the answer arrive, get trusted, get consumed, and change the file. Wording quality is level two and out of scope. Grading is deterministic: a plausible intent first half plus a low-prior marker instruction, and an eval regex over the file the agent wrote.

Vocabulary note: this document says "steering answer" for what `mh query` returns. CONTEXT.md's **Signal** means a document's statement about its own trustworthiness, an unrelated thing, so the bare word "signal" is avoided here (see Glossary gaps).

## Findings

### What the delivery surfaces are today (read from code, 2026-10-07)

| Surface                                                | Exists?                             | Evidence                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mh query <path>` run by the agent on its own          | Yes, as a CLI command.              | `USAGE` in `src/packages/cli/lib/argv/usage.pure.ts`; README step 3 calls it "the authoring loop". Returns JSON; never exits 1.                                                                                                                                                                                                                                                 |
| An AGENTS.md line telling the agent to call it         | Not shipped.                        | No file under `.agents/skills/markdown-harness/` writes an AGENTS.md line about `query`. The only AGENTS.md mention there is an unrelated template-hunting hint in `assets/authoring-body-structure.md:21`. The brief's "one line in AGENTS.md" is an eval arm to be constructed, not a product artefact.                                                                       |
| Claude Code `PostToolUse:Read` hook, `assess-hook.mjs` | Yes, wired by `init.mjs`.           | Speaks `assess.stale` sentences only. It is a different layer (an Assessment, not a Steering query), and it never carries body-structure or frontmatter intent. Out of scope except as the control for "hook mechanics work".                                                                                                                                                   |
| Claude Code `PreToolUse:Write` hook, `query-hook.mjs`  | Yes as a script; **wired nowhere**. | Header calls it a "stretch prototype of mechanism 1 from issue #221". `grep` finds it only in itself and `src/packages/cli/tests/query-hook.test.ts`. `init.mjs` writes only the `PostToolUse` entry. It handles `Write` of a new `.md` file under the `body-structure` Module only, speaks via `hookSpecificOutput.additionalContext`, never denies, exits 0 on every refusal. |
| A `frontmatter` Module equivalent of that hook         | No.                                 | `MODULE = 'body-structure'` is hard-coded in `query-hook.mjs`.                                                                                                                                                                                                                                                                                                                  |
| An activity-log row for the `query-hook`               | No.                                 | `query-hook.mjs` does not import `activity-log.mjs`; `assess-hook.mjs` does. So today a `query-hook` that ran and chose silence is indistinguishable from one that never ran (trap 10's exact shape).                                                                                                                                                                           |

Consequences for the eval design:

- The product has exactly two real delivery arms: **pull** (agent calls `mh query` because an instruction told it to) and **push** (`query-hook.mjs` injects on first `Write`). Both must be built or wired by the eval harness; neither is on by default.
- Push covers only the `Write` tool and only new `.md` files. An agent that creates a file with `Bash` (`cat > f.md`, `tee`) or `Edit` never triggers it. This is trap 10's second leg (a matcher is an exact tool-name match) and it is an in-product coverage hole, not a model failure.
- The reply is JSON (`QueryResult` in `src/packages/response-contract/lib/query.types.ts`: `governance: governed|invisible`, `modules[]` each with `rule.{ruleId,intent}` and `requirements`). Nothing tells the agent how to read it; `query-hook.mjs` is the only place the JSON is rendered as prose for an agent.
- Intent carriers (my term, not in the glossary): Rule `intent` (always present, `CONFIG_EMPTY_INTENT` refuses blanks), spine-entry `intent` (optional), `allowed[].intent` (optional), `assess.stale` (Assessment only). Which carriers survive each stage differs, and that difference is itself a rung (R3).

### The path

```
config --(1)--> mh computes answer --(2)--> rendered text --(3)--> delivery surface
  --(4)--> Host harness injects --(5)--> model context --(6)--> parsed --(7)--> trusted
  --(8)--> consumed --(9)--> applied fully --(10)--> file --(11)--> grader reads it
```

Each rung below is a transition that can fail. Rungs are ordered by position; rung N can only be observed if rungs below it passed, which is what makes the decision procedure work.

### The ladder

Conventions. **Held** = identical across the compared pair. **Varied** = the single difference. **Marker** = the low-prior string the intent tells the agent to write (for example a distinctive trailing heading or a fixed token), chosen so the agent would not produce it unprompted. **Neutral arm** = same Rule with its `intent` replaced by a marker-free sentence of equal length. Replace, never remove. Grading is a regex on the written file and on named transcript events, with no judge.

#### Rung 1 — Never emitted

- **Definition.** `mh query` for the path returns `governance: invisible`, or a claim whose carrier does not contain the marker. The config's selector does not reach the path, the Module block is missing, or the config is rejected (fault object instead of a result).
- **Distinguishes from rung 2.** Marker absent from raw `mh query` stdout, before any rendering.
- **Experiment.** Held: config, path, installed CLI. Varied: nothing; this is a precondition probe run once per cell. Record: stdout, exit code. Pass: stdout parses, `governance == 'governed'`, marker present exactly once in the carrier under test. Fail: any other.
- **Fix.** Mechanical, and not a product fix: the eval fixture is wrong (selector, `types`, folder). Sources: `src/packages/config-contract/` for the selector grammar; the witness-case idea in CONTEXT.md exists for exactly this.
- **Bare endpoint.** Not LLM-dependent. Runs with no model at all.

#### Rung 2 — Emitted, then lost in rendering

- **Definition.** The marker is in raw `mh query` stdout but not in the text the agent is shown, because a renderer dropped or reshaped the carrier. Candidates today: `query-hook.mjs` renders `rule.intent` and `entry.intent` and `allowed[].intent`, but drops anything it does not name; it renders every candidate Rule, so a long config makes a long notice; Claude Code may cap injected hook text (to verify, see open decisions).
- **Distinguishes from rung 1.** Present in raw stdout, absent in the rendered `additionalContext`. **From rung 3.** Rendered text is complete; loss is in transport.
- **Experiment.** Held: config, path. Varied: carrier position (Rule `intent`; spine-entry `intent`; `allowed[].intent`; the Nth candidate Rule; the last spine entry of a long spine). Record: raw stdout, hook stdout, character counts. Pass: marker in rendered text for each position. Fail: the position that loses it localises the renderer branch.
- **Fix.** Mechanical: `entryLines`, `candidateBlock`, `notice` in `.agents/skills/markdown-harness/scripts/query-hook.mjs`, or the output shape in `src/packages/response-contract/lib/query.types.ts`. The sweep should include a Rule shadowed by a catch-all (`shadowed` in `query-hook.test.ts`), to learn whether a never-applying Rule is rendered and could mislead.
- **Bare endpoint.** Not LLM-dependent; run the hook script with a hand-built payload.

#### Rung 3 — Rendered, not delivered (surface absent or never fired)

- **Definition.** The rendered answer exists but nothing carried it to the agent: the AGENTS.md line is absent from the loaded context, the hook entry is not in the session, the matcher did not match the tool the agent chose, or the hook errored and the Host harness swallowed it.
- **Distinguishes from rung 4.** No hook invocation or no `mh query` tool call appears in the transcript or probe log at all. **From rung 2.** The renderer, run by hand, is fine.
- **Experiment, push arm.** Held: config, prompt, model. Varied: the hook wiring present or absent, and the agent's file-creation tool (`Write` versus `Bash cat >`). Record: an out-of-band probe that logs every hook payload and stdout, passed with `claude --settings` rather than written into the run repo, the pattern in `.agents/skills/prepare-ablation-run/scripts/lib/observe-hook.sh` (written because a tool-call-only metric missed 5 of 9 arrivals). Also record `/hooks` listing and the tool name of the creating call. Pass: probe has a row for this session with the marker in its stdout. Fail variants are distinct: no row plus `Write` used = not wired or watcher missed it; no row plus `Bash` used = coverage hole; row plus empty stdout = rung 1 or 2.
- **Experiment, pull arm.** Held: the AGENTS.md line. Varied: line present versus absent. Record: whether any tool call whose command contains `mh query` (or `markdown-harness query`) occurs before the file-creating call. Pass: it does. Fail: no call = instruction ignored (a model-side failure, but distinct from rung 8).
- **Fix.** Mechanical for wiring: `init.mjs` (writes only `PostToolUse`), `assets/wiring-the-hook.md`, add an activity-log row to `query-hook.mjs`. Not mechanical for "agent never ran `mh query`": that is the AGENTS.md line's wording or a skill, and it crosses into level two.
- **Traps.** Trap 10: written is not wired, wired is not running, and a `Read` matcher never sees `Bash cat`; verify from the probe, never from a step's own `wired` report. The `query-hook` has no activity row, so the probe is the only evidence.
- **Bare endpoint.** Cannot exercise. It has no hooks and no tools, so this rung is invisible to it.

#### Rung 4 — Delivered too late

- **Definition.** The answer reaches the agent after the content was already decided. Push fires on `Write` only, so an agent that drafted in its head and then wrote still sees it first, but an agent that wrote the file once and now edits it never gets another push (`existsSync(file)` silences the hook by design). Pull has the same shape: the agent calls `mh query` after writing, or only after `mh check` fails.
- **Distinguishes from rung 5.** Ordering. The answer is in context, but its position in the transcript is after the first file-creating call.
- **Experiment.** Held: everything. Varied: pull-line wording is out of scope, so vary only the task so that the agent plans before writing (long task) versus writes immediately (short task). Record: transcript index of the answer's arrival and of the first creating tool call. Pass: arrival index < creation index. Fail: reversed, and the marker may be present in a later revision only.
- **Fix.** Partly mechanical (hook event choice: `PreToolUse` fires before the write; `PostToolUse` after, and `additionalContext` there cannot change the write that just happened). Otherwise it is where the AGENTS.md line says to call it.
- **Bare endpoint.** Cannot exercise; no tool-call ordering exists.

#### Rung 5 — Delivered against the wrong path

- **Definition.** `mh query` ran and answered, but for a path other than the one then written: a relative path from the wrong working directory, a `--config` mismatch, a name the agent changed after asking, a worktree (the hooks find the root from the file, not `CLAUDE_PROJECT_DIR`, by design).
- **Distinguishes from rung 1.** The query was run and matched in isolation; the path differs from the written file's path after normalisation.
- **Experiment.** Held: config. Varied: whether the agent is told the target path before or after asking, or a task that makes it rename. Record: query argument versus written path. Pass: equal after normalisation. Fail: unequal, with the answer's `path` field showing which was asked.
- **Fix.** Mechanical if it is cwd or normalisation (`path-governance.pure.ts`); otherwise the AGENTS.md line.
- **Bare endpoint.** Partially: a bare endpoint can be given a query reply for the wrong path and asked to write, but cannot reproduce the agent choosing it.

#### Rung 6 — Delivered, unparsed

- **Definition.** The text is in context and the model does not extract the carrier from it: JSON with nested `modules[].requirements.headings[]` buried under structure, with no instruction on how to read it. Distinguishes pull (raw JSON) from push (the prose rendering in `query-hook.mjs`).
- **Distinguishes from rung 7.** Evidence the model understood the structure but refused it (a stated objection) separates 7 from 6; silence on the content with no objection is 6 or 8.
- **Experiment.** Held: answer content including the marker. Varied: the encoding: raw `mh query` JSON; the hook's prose rendering; the same intent as the only field (`rule.intent` alone). Record: the file marker (primary), plus a probe question variant: after writing, ask "which Rule governed this file?" and regex `ruleId` (secondary, optional). Pass: marker written in the arm under test. Fail: marker only in the simpler encodings localises to format.
- **Fix.** Mechanical: output format in `src/packages/response-contract/lib/query.types.ts` or the renderer in `query-hook.mjs`, or a one-line reading instruction beside the AGENTS.md line (level two wording, but the existence of it is level one).
- **Bare endpoint.** Exercises it fully, and this is the rung where a bare endpoint is the cheapest instrument: paste the answer into a user turn, ask for the file.

#### Rung 7 — Rejected as untrusted content (prompt-injection reflex)

- **Definition.** The model reads the answer and refuses to act because it looks like instructions embedded in tool output. Real in two forms: a hook's `additionalContext` presented as system-ish context; and a tool result (`mh query` stdout) that contains imperative text such as "Headings must follow...". Models trained to resist injection may quote it, flag it, or ignore it.
- **Distinguishes from rung 8.** Transcript contains an explicit refusal, flag, or "tool output instructs me to" phrasing. Rung 8 shows no acknowledgement.
- **Experiment.** Held: marker, carrier. Varied: channel (system-level hook context versus tool result versus user turn) and imperative versus descriptive phrasing of the same constraint (the marker instruction as "the Operator requires X" versus as a bare requirement). Record: the file marker, and a regex over assistant text for injection-flagging phrases (`prompt injection`, `instruction.*tool result`, `ignor`). Pass: marker written, and no flag phrase. Fail with flag phrase present: rung 7. Fail without it: rung 8.
- **Fix.** Mostly mechanical: attribute and frame the text (a header naming the Operator as author; descriptive rather than imperative phrasing) in `notice()` in `query-hook.mjs`, or move it to a channel the Host harness treats as trusted (the AGENTS.md line carries authority; the tool result does not).
- **Bare endpoint.** Exercises it, and it is where a bare endpoint is most misleading: injection posture differs with a tool-use system prompt and hook-channel framing the endpoint lacks, so a bare result is necessary and not sufficient.

#### Rung 8 — Trusted, then ignored

- **Definition.** Neither misparsed nor rejected: the model had it, understood it, and did not apply it. Competing instructions, a task that pulls elsewhere, or the marker being low-prior so it loses to the model's own defaults.
- **Distinguishes from rung 9.** Marker absent entirely; rung 9 has it partially.
- **Experiment.** Held: everything. Varied: marker salience only via the neutral arm and a marker-bearing arm; plus a transcription guard (marker absent from the repository and the task text, reachable only through the query path, so a hit is attributable). Record: marker in file; grep of the task and repo for the marker (must be zero hits). Pass: marker in the live arm, absent in the neutral arm. Fail: absent in both arms = rung 8 if rungs 1 to 7 all passed.
- **Fix.** Not mechanical. A wording or placement change; level two. Mechanical only to the extent that the answer can be put nearer the decision.
- **Bare endpoint.** Exercises it for the "ignored in favour of task" form; not for competition with a long session context.

#### Rung 9 — Acted on partially

- **Definition.** The file shows some carriers applied and others not: the Rule `intent` honoured, a nested spine entry's `intent` not; the marker present in the first Rule's output but the agent chose the wrong candidate Rule (the hook lists candidates "first whose type matches"), or applied it and later reverted.
- **Distinguishes from rung 8.** At least one carrier's marker present. **From rung 10.** The intent made it; it is the file's final state that is wrong.
- **Experiment.** Held: answer. Varied: several distinct markers, one per carrier (Rule intent, spine-entry intent, `allowed` intent, each at a different nesting depth and candidate-Rule index). Record: which markers appear in the file. Pass: all. The subset that appears is the partial-action profile, which names the carrier or depth that decays.
- **Fix.** Mechanical where the profile is positional (render order and depth in `entryLines`); otherwise level two.
- **Bare endpoint.** Exercises fully.

#### Rung 10 — Acted on, then destroyed or misplaced

- **Definition.** The marker was written then removed or never reached the file under test: the agent rewrote the file, a formatter stripped it, a later `mh check` fix pass deleted the content, or the agent wrote it to a different file. A grader-side hazard as much as a model-side one.
- **Distinguishes from rung 9.** Transcript shows a write containing the marker, and the final file lacks it.
- **Experiment.** Held: all. Varied: nothing; this is a recording requirement. Record: every file-creating tool call's content, not only the final file. Pass: grade the union of writes, then compare with the final file; a divergence is rung 10.
- **Fix.** Mechanical in the grader (read transcript tool inputs, not just disk). Trap 14 applies: the grader must read file contents with a program, never eyeball them.
- **Bare endpoint.** Cannot exercise.

### What a bare endpoint can and cannot reach

| Rung     | Bare endpoint                                                                                 |
| -------- | --------------------------------------------------------------------------------------------- |
| 1, 2     | Not model-dependent at all; run the CLI and the hook script.                                  |
| 3, 4, 10 | Cannot; needs a Host harness, hooks, and an ordered transcript.                               |
| 5        | Partial.                                                                                      |
| 6, 8, 9  | Yes, and cheaply; answer pasted into a turn.                                                  |
| 7        | Yes but unfaithful: channel framing is the variable and the endpoint lacks the real channels. |

So a bare-endpoint pass certifies rungs 6, 8, 9 only. It says nothing about whether the answer ever arrives.

## Decision procedure

Read evidence **bottom-up** (deterministic precondition checks first), then **top-down** only to confirm.

1. Run `mh query` on the path with the marker config. No marker, or `invisible`: **rung 1**. Stop.
2. Run the rendering step on the same payload. Marker in raw output, not in rendered text: **rung 2**.
3. Read the probe log, never the settings file and never the `wired` report (trap 10). No probe row for the session (push), or no `mh query` call before the first write (pull): **rung 3**. Within it: tool used `Bash` rather than `Write` is a coverage hole, tool `Write` is wiring.
4. Compare the transcript indices of arrival and first creating call: arrival after: **rung 4**.
5. Compare queried path and written path: differ: **rung 5**.
6. Marker absent in live arm and neutral arm. Assistant text contains injection-flag phrasing: **rung 7**. Contains a wrong reading of the structure: **rung 6**. Neither: **rung 8**.
7. Some carrier markers present, some absent: **rung 9**. Marker in a write call but not the final file: **rung 10**.
8. All pass and live arm differs from neutral arm: level-one success.

Reading is cheap in this order because rungs 1 to 3 are deterministic and need no model call, so their failures never cost a model run. A null result that survives steps 1 to 5 is a model-side null (rungs 6 to 10) and the transcript tests discriminate within it.

Checks on the evidence itself:

- Trap 14: read transcripts and written files with a program, or in windows of thirty lines. A whole-file read can silently lose a quarter of a transcript, and a marker lost that way fakes rung 8.
- Trap 10: the probe must be independent of the thing it observes, and an exit 0 hook script is evidence about the script, not the layer.

## What spec agents must decide

1. **Pull, push, or both as arms.** The product ships a pull CLI and an unwired push script. Does the eval measure what ships (pull plus a hypothetical AGENTS.md line), or the prototype (push), or both, and does `query-hook.mjs` get an activity-log row so rung 3 is observable in production and not only under a probe?
2. **How the probe is installed.** `claude --settings` observer hook (precedent in `prepare-ablation-run`) versus transcript parsing alone. The transcript path cannot see hook stdout at all if the Host harness does not write it; confirm what Claude Code persists for `additionalContext` before relying on it.
3. **Marker design versus rung 8.** A low-prior marker is the grader's lever and also what makes ignoring cheap for the model. Whether one marker per carrier (rung 9 profile) or one per cell, and how many repetitions separate rung 8 from sampling noise.
4. **Host cap on injected text.** Whether Claude Code truncates long hook `additionalContext` (I recall a character cap but did not verify here), which would move rung 2 from the renderer to the Host harness.
5. **Out of scope but tripping the ladder.** The Assessment path (`assess-hook`) reuses the hook mechanics; whether it is the positive control for rung 3.
6. **Issue sources.** I could not retrieve issue #221 and #222 comments in this session (`gh` returned nothing), so nothing above is taken from them beyond what `query-hook.mjs`'s header says. Spec agents should read them.

## Glossary gaps

Terms used above that CONTEXT.md lacks or conflicts with: **eval suite**, **arm** (live versus neutral versus pull versus push), **intent carrier**, **marker**, **neutral arm** (intent-neutralised), **transcription guard**, **failure rung**, **probe**, **rubric line**, **cohort row**. **Signal** exists but means a document's trustworthiness statement, so it cannot name the steering answer here. **Intent** appears in CONTEXT.md only inside other entries and has no entry of its own. **Steering query** exists and fits. **Authoring path** fits where the steering answer is delivered.
