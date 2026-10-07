---
type: research
---

# R5: marker design for steering-effectiveness evals

This note answers how to build the marker tokens that the steering-effectiveness eval greps for. It is written for the spec agents. A marker is a low-prior instruction written into the second half of an `intent`. The eval regexes the produced file for it, so compliance is boolean and no judge is involved. Level one is the question: does the signal reach the agent and change what it writes?

## Sources and what they settle

- Issue #222 (the eval-suite prototype spec) fixes the vocabulary: `as-written` and `intent-neutralised` arms, the transcription guard as a deterministic check on task text, `intent` carriers addressed by Module, Rule id and entry or field, three trials per arm, and a threshold of two of three for a rubric line. It replaces every carrier with one constant filler in the neutralised arm. This note replaces the judge with a marker regex but keeps that arm structure.
- The retired ablation study (map #18, issue #18, deleted in `a425162`, read from `a425162^:docs/evals/ablation/`) measured one thing that matters here. Its frozen acceptance gate saturated: all four runs reached `24/15/22`, so it discriminated nothing between arms. Its held-out suite existed because "a test a run can read is a test it can satisfy without understanding, which measures transcription rather than comprehension". Neither document measured marker base rates or any marker family, so there is no prior measurement to reuse for this question. Everything below on base rates is reasoning plus one small probe, and the suite must measure the rest itself.
- The shipped intent carriers are short, plain sentences of roughly 40 to 120 characters, for example `'Findings gathered to settle a question, with sources.'` on an `allowed` value, `'Research says what it is and what it is about, so an agent can choose it without opening it.'` on a frontmatter Rule, and `'What the note adds.'` on a spine `allowed` entry (`fixtures/conformance/integrated/`). A marker half has to fit that register and length or the config stops looking like an Operator's.
- CONTEXT.md has no "Glossary gaps" section in this worktree. The terms used here are Operator, Contributor, Host harness, Steering query, intent carrier (the spec's word) and `markdown-harness` written in full.

## Probe

Three single-shot `claude -p --model sonnet` runs in `/private/tmp/claude-501/r5probe/`. The steering text was pasted into the prompt, so this is not the hook path. The task was a 120-word note on feature flags with a `## Findings` section. Arms: no steering, a coined-word marker (`quillon`, "use the word quillon once"), and a code marker (`ZX9-QQ-7741`, "append the token verbatim to the section").

- The no-steering arm produced neither marker. That is one run and proves nothing about a rate; it only shows the harness works.
- Both marker arms complied. The coined-word run wove `quillon` into a metaphor ("a flag works like a quillon, a guard between blade and hand"). The code-token run appended `ZX9-QQ-7741` as a bare line after the section. Neither agent treated the instruction as injection.
- Both marker arms also invented numbers to satisfy the plausible first half ("about 7x", "31 stale flags"). That is a reminder that the first half is also steering, so it can change output independently of the marker.

Three runs support exactly two claims: prompt-delivered markers of both families are followed by this model, and a real word marker gets rationalised into the prose in a way that harms coherence while a code marker stays visibly bolted on. Do not generalise beyond that. The probe did not test the hook delivery path or any other model.

## 1. Choosing a marker with low prior

The property needed is that the unprompted emission rate on the real task is effectively zero across every model in the cohort, and that nothing else in the context supplies the token. Prior is a property of the token and the task together. A token is only low-prior for tasks where it is off-topic.

| family                                | example                                  | prior                                                                                                                       | coherence cost                                                                    | spelling and tokenizer drift                                                                                                                       | verdict                                                           |
| ------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Rare real word                        | `quillon`, `sesquipedalian`, `verdigris` | very low if off-topic, but not zero across models, since an uncommon word still occurs in some trained text                 | The agent must rationalise it into prose, as the probe showed; reads as an oddity | Pluralisation and capitalisation vary (`quillons`, sentence-initial `Quillon`); tokenizer splits it into several pieces, which raises miscopy risk | Good second choice; needs a tolerant regex                        |
| Coined pseudo-word                    | `brindlewick`, `quelmar`                 | lowest; no model has seen it, so a hit is steering                                                                          | Same rationalisation cost; also looks like a typo, so an agent may "correct" it   | Highest miscopy and "correction" risk, because the model may normalise it toward a real neighbour                                                  | Good if the regex allows one edit of tolerance, otherwise fragile |
| Nonce compound                        | `amber-lantern`, `tidewater-ledger`      | Very low as a pair, though each half is common, and a hyphenated compound can be split, reordered or rewritten as two words | Moderate; reads like a project code name, which docs legitimately contain         | Hyphenation drift is the main hazard: `amber lantern`, `amber-lantern`, `AmberLantern`                                                             | Best when the regex is `amber[-_ ]?lantern`, case-insensitive     |
| Specific numeric or alphanumeric code | `ZX9-QQ-7741`, `ticket 48213`            | Lowest of all for a long code; a bare number is weaker because documents contain numbers                                    | Low if the intent frames it as a reference id; visibly bolted on otherwise        | Digits and hyphens survive exactly; the main drift is the agent dropping the code as noise or reformatting it                                      | Most reliable for grading; most likely to read as a test          |
| Unusual casing or punctuation         | `qUiLlOn`, a literal `§§`                | Very low                                                                                                                    | High; the agent may normalise it                                                  | High; the regex becomes brittle                                                                                                                    | Avoid                                                             |

Recommendations:

1. Prefer a nonce compound or a long alphanumeric code for the primary marker, and a coined pseudo-word as a secondary. The aim is to minimise the rate at which the model emits the token unprompted and to maximise the rate at which it reproduces the token exactly when told to.
2. Marker tokens must be lowercase-insensitive in the regex and tolerate the separators `-`, `_` and space between compound parts. Pluralisation should be tolerated only for words, never for codes. Over-tolerance raises the base rate by matching ordinary words, so each regex is itself measured in the neutralised arm.
3. A regex must never be shorter than the marker's distinctive core. `lantern` alone would match organic text.
4. Pin the exact form in the intent, with the regex tolerance the grader will apply recorded beside the case and never shown to the agent. Telling the agent "verbatim" reduces drift for codes. For words, "once" or "exactly" invites quotation marks, so accept a quoted or backticked form.
5. Draw every marker from a generator, not from the author's head, so the family is uniform and the author cannot unconsciously write plausible ones. See the procedure below.

Cross-model note: a rare word may be better known to a larger model than a smaller one, so a word that is low-prior for the cohort's smallest model may not be for the largest. This is a reason to measure the base rate on every model in the cohort, not once.

## 2. Verifying the base rate

The neutralised arm is the base-rate measurement. It is the same config with every carrier replaced by a filler, the same task, the same hook. Every run in that arm is a Bernoulli trial for "marker emitted without being asked". Three consequences follow.

- Rule of three: if the marker appears in 0 of n neutralised runs, the 95% upper confidence bound on the unprompted rate is about 3/n. With n = 3 trials per arm, as #222 proposes, the bound is 100%, which is no bound at all. Three trials bound nothing; they only find gross leaks. To claim a base rate under 5% you need 60 zero-hit runs, and under 1% you need 300. A suite cannot afford that per marker per model, so the base rate is bounded once, cheaply, by a pre-screen (below) and not by the live matrix.
- The neutralised arm over a whole suite pools across cases. If a single marker is reused across k cases the pooled n is k times the trials, but pooling is only valid when the markers have the same prior on every task. Do not pool across different markers.
- A hit in the neutralised arm is not noise to average away. It means the marker leaked, the filler carried it, or the transcription guard failed. Treat it as a defect in the case, not as a low rate.

Pre-screen (cheap, per marker, per model):

1. Sample the bare endpoint with the task text alone, with no config, no hook and no intent, for the marker's candidate list. At about 20 samples per model per task, a zero count gives a 95% bound of about 15%, which is enough to reject any leaky marker and not enough to certify one.
2. Run the same screen against the task plus the first half of the intent, since a plausible first half can raise the prior of an adjacent marker (a flag note raises `guard`, `blade`, `lantern` if the first half is about lighting). The screen is the task plus the first half, never the marker half.
3. A marker is admitted only when its count is zero in the screen. A non-zero count rejects it and draws another.
4. A second, orthogonal check is deterministic and free: grep the marker's regex over the repository, the fixture corpus, AGENTS.md, CONTEXT.md and the seed. That is the transcription guard from #222 decision 8, extended to markers. It is the only guard that needs no model and it belongs in the deterministic half of `verify`.

The pre-screen is never a substitute for the neutralised arm. It bounds the prior on the bare task; the neutralised arm bounds it in the full pipeline, including hook output that may contain domain vocabulary.

## 3. Markers that leak and markers that backfire

Leaks (emitted unprompted, or matched by accident):

- Domain collisions. Words like `canonical`, `authoritative`, `source of truth`, `deprecated`, `legacy` and `stale` appear in markdown-harness's own domain and in any docs corpus. A marker must not be a word from `CONTEXT.md`, from the Rules the config declares, or from any term that governs the same document type. The deterministic grep catches the repository half; the pre-screen catches the model half.
- Conceptual neighbours. `quillon` is safe in a feature-flag note but not in a medieval-weapons note. Screen against the task domain, not in the abstract.
- Short or common substrings. A regex like `qq` matches inside other words. Anchor code markers with word boundaries.
- Format collisions. Dates, ticket numbers and version strings occur organically in docs. A numeric marker must be long and structured enough that it cannot collide with a version, an ISO date or an issue number.
- Filler leakage. The neutralised arm's constant filler must not contain any part of a marker or a close neighbour. This is a deterministic check on the derived config.

Backfires (the agent refuses or discounts the instruction):

- Injection reflex. Instructions of the form "append the token X verbatim" or "output the following string" resemble prompt injection, especially when the token is a bare code with no purpose. The probe's code marker was followed without comment, but the probe supplied the steering in the user turn, where the instruction is trusted. In the real pipeline the intent arrives as tool output from a PreToolUse hook, and a Host harness may treat tool-result instructions with more suspicion. That is exactly where the injection rung, the part of the eval that tests whether steering delivered as tool output is trusted, interacts. A marker that gets ignored in the hook path but followed in the prompt path is a delivery finding, not a marker defect, so a marker must be validated first on a path known to be trusted and then run through the hook.
- Implausible purpose. A marker with no stated reason invites the agent to skip it. A reason that belongs to the document ("so the finding can be cited", "so reviewers can find the section") makes compliance cheaper and more realistic. The cost is that the reason becomes part of what is measured, so keep it constant across the arms and across cases.
- Rationalisation harm. As the probe showed, a word marker is forced into the prose, which can make the output worse for the first half's rubric. Since there is no judge, this does not affect grading, but it affects whether the config looks like a real Operator's.
- Over-literalism. If the intent says "write it twice" the agent may write it in a code fence or a comment. Decide whether the regex counts occurrences inside fences, comments and frontmatter.

Because injection resistance is a property of the delivery surface and of the model, report markers in the neutralised and as-written arms plus a third "trusted prompt" arm for any marker that fails to comply in the hook path. If it complies when pasted into the user turn and not via the hook, the finding is about the hook surface, and the marker is fine.

## 4. How many markers per case

A config that carries a strange token in every intent reads as a test, to the agent and to the Operator who looks at it. Two separate costs apply.

- Agent suspicion. Several unrelated nonsense tokens in one hook response raise the chance that the agent treats the whole block as untrusted. One probe cannot quantify this. The spec agents should measure it by varying marker count in a pilot and checking whether compliance on the first marker drops as the count rises.
- Operator realism. The prototype's first suite is a cut of the integrated tier's config, and the realistic carrier lengths are 40 to 120 characters. A marker half of a dozen words doubles that.

Recommendations:

1. One marker per intent carrier that a case tests, never two. Each carrier has a distinct marker so a hit attributes to one carrier. Distinct markers are the whole reason the design works: a shared marker could not tell you which carrier reached the agent.
2. Per case, at most the carriers the case's rubric anchors, which for the three prototype cases is two (the research steer case: two spine-entry intents; the repair case: a Rule intent and a `pattern` sibling intent; the assess case: one sentence). Carriers that no case tests carry no marker and stay in their ordinary plain wording.
3. Per suite, closure still holds as #222 decision 6 requires: every carrier is anchored in some case. A marker is therefore a property of a carrier within a suite, drawn once and rotated across suites. A carrier that must appear in several cases keeps the same marker in all of them, which also lets the pooled neutralised arm bound its base rate.
4. Do not mark every carrier in the config; do not mark a Rule intent and every field intent under it in one case, as a competitive effect between them confounds attribution. If a case needs both a Rule intent and a field intent, give each its own marker and add a second case that marks only one.
5. Keep unmarked carriers in the config with realistic wording, so the ratio of marked to unmarked looks like an Operator who put one unusual instruction somewhere.

## 5. Presence versus repetition

| instruction           | graded as                 | strengths                                                                                                          | weaknesses                                                                                                                             |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| "use X once"          | present at least once     | Simplest regex; least coherence harm; compliance maps to "signal got through"                                      | Cannot tell attention from luck; ceiling effect, so a strong model hits 100% and discriminates nothing between two wordings            |
| "write X twice"       | count equals or exceeds 2 | Needs the agent to carry a quantity, which a half-processed instruction rarely does; partial compliance shows as 1 | More coherence harm; agents round to "once" or "several"                                                                               |
| "exactly three times" | count equals 3            | Highest discrimination of partial compliance                                                                       | Brittle: the agent may write three and the file's code fence or a repeated heading adds a fourth; false negatives from over-compliance |

Findings and recommendation:

1. Presence is the reliable primary grade. It has the lowest false-negative rate, because any occurrence counts, and it measures exactly what level one asks. The retired study's lesson that a frozen gate saturates applies here too: a presence-only suite on a strong model may saturate at 100% in the as-written arm. That is not a defect but it means the neutralised-versus-as-written gap is the entire signal, and a wording comparison between two as-written intents has no room to discriminate.
2. Count is the discriminator for partial compliance and for wording comparisons, and is worth adding only to cases where presence has already saturated. Use a bounded rule, never equality: `>= n` for "at least twice", and record the raw count so the report can show a distribution (0, 1, 2 or more) rather than one boolean.
3. A count marker must say how and where, for example "once in the first sentence and once in the last". Otherwise the agent satisfies the instruction by listing the word.
4. Count-based grading must define what is counted: occurrences in prose only, or also in code fences, link text and frontmatter. State it in the case, apply the same regex to both arms, and never count a match inside the intent text the agent could have quoted back (the file can quote the hook's text, which is why the neutralised arm needs the marker absent from the config entirely).
5. If both are used, keep presence as the pass criterion and count as a recorded secondary metric, so a count failure never turns a presence pass into a fail.

## 6. Placement grading

Three grains, from weakest to strongest evidence.

1. Anywhere in the file. Proves the marker got through at all. Cannot distinguish "the agent applied the intent where it was addressed" from "the agent saw it and stuck it somewhere". Cheapest; sufficient for the primary level-one grade.
2. Inside the governed section or field. For a spine entry, the marker must appear between the entry's heading and the next heading at or above its level. For a frontmatter field, it must appear in that field's value. This is stronger evidence of correct attribution, because it shows the agent bound the instruction to the carrier it was written under. It is deterministic: the body-structure Module already knows the section boundaries, so the grader can reuse the compiled `mh` parser or a small heading split without an LLM.
3. Inside the governed section and nowhere else. This catches the agent spraying a marker everywhere. It needs a negative regex per other section and raises false negatives for legitimate repetition, so use it only as a secondary metric.

Recommendation: grade presence anywhere as the primary pass, grade in-scope placement as a recorded second boolean, and report both. Only the in-scope boolean should drive a claim of attribution. A marker that is present but misplaced is a distinct, interesting outcome: the signal got through, and the binding failed. Frontmatter fields are easier to place than body sections, since a field's value is a bounded string. Mark frontmatter markers with a value-shaped instruction, because a marker in a `description` is plausible while a marker in `type` would break the `allowed` check, which interacts with the mechanical grader (`mh --check`) that #222 keeps as the one oracle. Never put a marker in a field that has an `allowed` list.

## 7. Rotation and held-out sets

- Markers drawn from a generator are disposable. A fixed list that appears in fixtures, docs, the deleted study or this note becomes a token a future model has seen. Do not commit raw marker strings to files an agent can read in the minted root; the cases directory is held out (#222 decision 3), and the generated marker list belongs there, in the held-out half.
- Rotate per suite version. Redraw every marker when the suite's config digest changes, and re-run the pre-screen. Record the marker set's generator seed in the cohort row, beside the config digest.
- Hold out a second set. Keep a reserve of pre-screened markers never used in development. Tune wording against the development set; report results on the reserve. This is the ablation study's held-out argument transposed: the development set is the thing that can be overfit, the reserve cannot.
- Do not publish a marker list in this repository. Any marker that appears in committed text, including worked examples, must be treated as burned for the live suite. The worked examples below are therefore illustrative only and are not to be used as live markers.
- Rotate across models too. A marker pre-screened on one model must be re-screened for another before it enters that model's cohort.
- Track rotation effects. If a marker's compliance rate changes sharply after a redraw while the wording is unchanged, the earlier result depended on the token. Record per-marker hit rates in the report, never only the pooled rate.

## Recommended marker-construction procedure

1. Write the plausible first half of the intent for the carrier, in the register and length of the shipped config, so that without the second half it is a good intent.
2. Draw a candidate from the generator: a nonce compound of two words from disjoint domains, or a coined pseudo-word of 8 to 10 letters, or a code of two letters, two digits and four digits. Reject any candidate that a repository-wide grep matches or that appears in CONTEXT.md, the task text, the seed or AGENTS.md.
3. Write the marker half as one clause giving a document-local reason and the exact form, with presence as the instruction. Add a count only where presence has saturated.
4. Pin the grading regex beside the case: tolerant of case and the separators for compounds, exact for codes, word-bounded, and recording the scope (anywhere, then the governed section or field).
5. Pre-screen on every cohort model: about 20 bare-endpoint samples of the task with the first half only; admit on zero hits.
6. Build the neutralised config from the as-written one by replacing every carrier with the constant filler, and confirm by a deterministic check that the marker and its regex match nowhere in it.
7. Run the live matrix. Report per marker: as-written hits, neutralised hits, placement, and for any marker that fails in the hook path a trusted-prompt control.
8. Burn the marker after the report is filed; redraw for the next suite version.

## Worked examples

These are illustrations of shape. The marker tokens are burned by being written here and must not be used in a live suite.

Frontmatter field, a `description` under a Rule like `research` (carrier: `fields.description` intent). The first half describes the field and the second half carries the marker.

> `intent: 'One sentence saying what the note settles, so an agent can pick it without opening it. End the sentence with the reference tag tidewater-ledger so reviewers can cite it.'`

Regex `tidewater[-_ ]?ledger`, case-insensitive, scope: the value of `description`. Placement is cheap to grade because the field value is one string.

A frontmatter field with a code marker, for a tracking field with no `allowed` list:

> `intent: 'Where the note came from, as a path or a link. Add the tracking id QZ41-8830 so the origin can be audited.'`

Regex `\bQZ41-8830\b`, exact. A hit anywhere in the value passes.

Body-structure spine entry, a heading entry under `^Findings$` (carrier: spine entry intent):

> `intent: 'What was measured, with numbers, and the trade-off those numbers settle. Mention the word brindlewick once in this section so a reader can find where the measurement ends.'`

Regex `brindlewick(s)?` case-insensitive, scope: from the Findings heading to the next heading of level 2 or above. Presence passes; in-scope placement is the second boolean. For a count variant where presence has saturated, change the second sentence to "Mention the word brindlewick in the first and the last sentence of this section" and grade `>= 2` within scope, keeping presence as the pass.

Body-structure entry with `allowed` titles (an `enumeration` entry such as `Added`): the intent on an `allowed` entry is `'What the note adds.'` in the shipped fixture. A marker half would be `'What the note adds. Name the release codename sablewick.'`, and it is graded inside that heading's section only. Place no marker on `Fixed` in the same case, so a hit attributes to `Added`.

## What the spec agents must decide

1. The candidate families the live suite uses, and the generator that draws them. This note recommends nonce compounds and long codes as primary and coined words as secondary, but the cohort-wide base rate is unmeasured.
2. The pre-screen protocol: sample count per marker per model, which prompt it uses (task alone, or task plus the first half), and the admission threshold. This note proposes about 20 samples and zero hits, which only rejects leaky markers.
3. The neutralised-arm run count. Three trials per arm bounds nothing by the rule of three. Decide how many runs the matrix can afford, and whether the base rate is certified by the pre-screen or by a larger neutralised batch run once per suite version.
4. Regex tolerance per family: case, separators, pluralisation, quoted or backticked forms, and whether a match inside a code fence or frontmatter counts.
5. Presence, count or both: whether count is recorded as a secondary metric by default or only added once presence saturates, and the bounded form (`>= n`).
6. Placement: whether in-scope placement is a second recorded boolean or the primary grade, and how the grader finds a section's boundaries, reusing the compiled `mh` parser or a separate heading split.
7. Markers per carrier and per case: confirm one distinct marker per tested carrier, no marker on unanchored carriers, and a ceiling per case. This note suggests at most two for the prototype's cases.
8. Whether a trusted-prompt control arm is part of the suite for any marker that fails through the hook, and how the injection rung consumes that control.
9. Where marker strings live so no agent can read them, how the transcription guard extends from the task text to markers, and how the burned-marker rule is enforced (the held-out half of the cases directory is the proposed home).
10. The rotation and reserve policy: when markers are redrawn, how large the reserve is, and which results are reported on it.
11. Whether the marker half carries a document-local reason, and how that reason is held constant across arms so it is not a confound.
12. Which cohort models the pre-screen runs on, given that prior differs by model, and how the cohort row records the generator seed.
