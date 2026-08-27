# Naming the Code Roles: Orchestration, Purity, and What the Sources Actually Establish

Research question: this repo intends to classify every TypeScript source file with exactly one
mandatory filename suffix from a closed vocabulary, because each suffix defines a glob and each
glob addresses exactly one governance document that auto-loads into agent context on Read (the
mechanism is established in `file-naming-for-glob-routing.md` §5.1 and `GEN-001-adr.md` §4). The
proposed vocabulary is `index.ts` · `*.types.ts` · `*.adapter.ts` · `*.pure.ts` · `*.procedure.ts`
· `*.test.ts`. The owner accepts `*.pure.ts` and rejects `*.procedure.ts`, and defines the
contested role as: _"procedures contain control flow and execute functions but do not implement
logic on their own."_ Since `*.adapter.ts` already owns the I/O boundary, the role in question is
**orchestration / composition**, which may or may not itself perform I/O.

Probed 2026-08-27. Every claim is quoted from a book, a specification, official documentation,
shipped source, a registry response, or an author's own site. Behavioural claims marked
**[executed]** were reproduced against a real binary and the version is given. Each finding is
tagged **normative** (the source states it as the definition or a requirement, or a tool breaks
without it) or **conventional** (habit, example code, a generator default, or a term attached to
an author by other people), because the two license very different things. Claims that could not
be sourced are marked **UNVERIFIED** rather than smoothed over.

This document does not re-derive anything settled in `file-naming-for-glob-routing.md`: `**`
semantics (§0), the tiers of filename normativity (§1), Angular's v20 reversal of the
`<name>.<type>.ts` rule (§2), suffix-versus-folder selectability (§3), the ESLint mechanisms for
enforcing a filename convention (§4), or the glob-routed-context census (§5). Those are cited, not
repeated.

---

## Direct answers

**Q1 — Which established taxonomy matches the owner's description?** **Normand's, and closer than
the brief supposed: he has a _name_ for the role.** _Grokking Simplicity_'s test is "**Anything that
depends on when it is run, or how many times it is run, or both, is an action**" (book, ch. 1 —
note the book says _run_, his podcast says _called_), and the orchestrating layer is his
"**interaction layer**", defined as the thing that sequences without deciding: "_there's no decisions
anymore… It's simply acting_", "_It's actually dumb, and that's a good thing_". But the owner's role
is Normand's **interaction layer**, not his "action" — an action is a _leaf_ effect. Across all seven
traditions probed, **every one names the pure half confidently and the orchestrating half badly**;
three decline to name it at all (§1.9). Two corrections to common attributions, both verified:
"Functional Core, Imperative Shell" was published as a **screencast on 2012-07-12**, _before_ the
SCNA 2012 talk it is usually credited to, and there is **no published transcript of that talk**;
and "**command handler**" appears **zero times** in Greg Young's own _CQRS Documents_ — his term is
Evans's **Application Service**. "Interactor" is **Jacobson's** word, and Martin says so himself.

**Q2 — Which candidate names are actually used as TypeScript filename suffixes? For orchestration:
none.** The decisive framing: **in TypeScript a role suffix becomes a _rule_ only when some tool does
`filename.includes('.suffix.ts')`.** That is true of `.dto.ts`, `.entity.ts`, `.input.ts`, `.args.ts`,
`.model.ts` and `.controller.ts` — and of nothing else measured. `.service.ts` (35,249,184
downloads/month behind the generator) and `.effects.ts` (1,237,953) are **template filenames with no
document anywhere asking for them**, and `.service.ts` is specifically the one role suffix NestJS's
own tooling does _not_ read. `.usecase.ts`/`.use-case.ts` has **no generator** and appears **0** times
in three of the four most-starred Clean Architecture TypeScript repos. `.workflow.ts` — the most
promising hypothesis — is **refuted**: 0 dotted hits across 4,575 Temporal paths. `.orchestrator.ts`,
`.shell.ts`, `.calc.ts`, `.fn.ts`: effectively zero. And the pattern behind all of it: **where a
framework needs to identify a role it uses a directive (`"use server"`), an export name (`action`,
`handler`), or a config string (`workflowsPath`) — not a filename.**

**Q3 — Is there an established suffix for pure code? No — but the _concept_ is established under
exactly that word, and not in a filename.** `.pure.ts` is the lowest-count token measured
(**15,840**), and **36 of its 39 dotted hits come from one 66-star repository where it marks a
tree-shaking barrel** — the bundler sense. Which is the finding: webpack's `package.json#sideEffects`
already says "**which files in your project are 'pure'**", takes **glob patterns**, and is inverted
(you list the impure ones); Rollup's `@__PURE__` does the same at call granularity. **Purity is
declared at three granularities in JavaScript — call, module, package — and none of them is a
filename.** On `utils`, the counter-evidence the owner needs is **official and filename-level**:
Kotlin's coding conventions say "_you should avoid using meaningless words such as `Util` in file
names_", and Go's own blog has a section headed "**Bad package names**" giving four distinct reasons.
The counterweight is equally hard: **`utils` is a _required_ key in shadcn/ui's published JSON Schema**
(`/properties/aliases.required === ["utils","components"]`, measured), and Nuxt scans `app/utils/` as
an auto-import root. Ousterhout is **not** a witness against it — his ch. 6 argues general-purpose is
_better_ (§4.3).

**Q4 — The purity boundary, and can core ESLint express it? Yes, exactly, with zero new
dependencies — [executed] on this repo's own eslint 10.9.1.** The rule in one sentence: **a member is
admissible in `*.pure.ts` if and only if its result is a function of its arguments alone.** All of
`Math` passes except `random`; `Date` passes only when an instant is supplied _and_ only through the
`getUTC*` accessors, because `getFullYear` resolves through `LocalTime`, whose first step is
`SystemTimeZoneIdentifier()` — an ambient host read the brief did not anticipate. Two spec-level
refinements: **`Math.pow` returns an "implementation-approximated" value** (§6.1.6.1.3), so it is
deterministic within an engine but not across engines — which matters because tenet 4 makes the
fixture corpus a specification; and **`Math.random` is excluded for nondeterminism, not for side
effects** — PostgreSQL §36.7 states the principle outright ("_Even a function with no side-effects
needs to be labeled VOLATILE if its value can change within a single query; some examples are
random()…_"). The minimal config produces **exactly three errors on exactly three lines** with no
false positives; a hardened version flags **ten of thirteen** evasions directly and catches two more at
the alias that creates them. The one hole no core rule can close is an **import**. `eslint-plugin-functional`
is real and maintained (10.0.0, 2026-06-03, 18 marginal packages) and **none of its 21 rules governs
determinism** — take `immutable-data` alone, if anything.

**Q5 — Prior art for a "stop the line" protocol.** **Toyota's own material is fully quotable; every
AI-agent framework probed is a hard null; and the best prior art is already in this repo.** Toyota:
"_the machine or equipment can detect the abnormality and stop automatically, **or** the operator can
stop the line by pulling the stop cord themselves_" — jidoka's own text contains the split this whole
document keeps hitting, an automatic stop where detection is mechanical and a manual cord where it is
not. Probing **agents.md, Cursor rules, the Agent Skills specification, Claude Code's memory docs and
GitHub Copilot's repository-instructions page for nine halt-and-ask phrasings returned zero matches in
all five**; Kiro has one sentence of _product behaviour_, not a directive; Anthropic's best-practices
page documents a _user_ workflow naming the `AskUserQuestion` **tool**. **The mechanism exists; no
vendor documents the directive.** But **the rule itself is written down in two official coding
standards** — Google's C++ Style Guide ("_the absence of a prohibition is not the same as a license to
proceed. Use your judgment, and if you are unsure, please don't hesitate to ask your project leads_")
and PEP 20 ("_In the face of ambiguity, refuse the temptation to guess._") — and in at least one real
`AGENTS.md`: `apache/tinkerpop` has a section headed "**When In Doubt**" whose two rules are "Prefer no
change over an unsafe or speculative change" and "Ask for clarification". **The transferable shape is
two-part — ask, _and_ name the safe default while waiting** — which this repo's `AGENTS.md` line 12
already has: "_Ask which is meant. With nobody there to ask, name both readings and proceed with the
one the current file path implies._" (§6).

**Hard nulls, up front.** **(1)** There is **no established name for the orchestration role**, in the
literature or in TypeScript filenames — the role has been renamed at least six times in thirty years
(interactor → application service → imperative shell → use case → interaction layer → command
handler) without being redefined. **(2)** `*.procedure.ts`: **0 of the top 100 ranked hits are
dotted**, and the word is already spoken for four times over, once by this repo itself. **(3)** The
best-attested name available, `.service.ts`, is **forbidden to this repo by its own
`codebase-design` skill**, by name. **(4)** No suffix for pure code has any precedent, and the one
real-world user of `.pure.ts` means something weaker by it. **(5)** No official TS/JS style guide
prescribes role suffixes. Full list in §7, including the provenance nulls (_Clean Architecture_ 2017
and Vernon ch. 14 body text are **UNVERIFIED**; Evans page numbers here are **manuscript** pages).

**The one collision the brief asked to confirm: "functional core" versus `Core`.** Confirmed, and it
is worse than a shared word. `CONTEXT.md` defines `Core` as "_the parts that know nothing about
markdown frontmatter: config reading, path resolution, the command surface, and reporting_" — which
is the **I/O**. "Functional core" would name the opposite of what the word already names here. Six
further candidates are disqualified by collision, and one already-accepted suffix (`*.types.ts`) is
flagged (§0).

---

## 0. Glossary collisions — checked first, because some of them disqualify

Two vocabularies in this repo bind terms, and a candidate suffix that collides with either is a
liability: the whole point of the suffix is to be read correctly by an agent that has just loaded
`CONTEXT.md` or the `codebase-design` skill. A third source of collisions — the repo's own vision
documents — turned out to matter more than expected, and is the reason `*.procedure.ts` is worse
than merely unprecedented.

### 0.1 `CONTEXT.md` — the product glossary

Every term below is quoted from `CONTEXT.md` in this repo.

**`Core` — the collision the brief predicted, and it is worse than a shared word.**

> **Core**: The parts that know nothing about markdown frontmatter: config reading, path
> resolution, the command surface, and reporting. It owns the config file and hands each Module
> its section.

"Functional core, imperative shell" (§1.2) would put the _pure_ code in the core. This repo's
`Core` is defined as **config reading, path resolution and reporting** — which is precisely the
I/O. So "functional core" does not merely reuse a bound word; **it names the opposite of what the
word already names here.** `Core` in this repo is a _knows-nothing-about-frontmatter_ boundary;
"functional core" is a _performs-no-effects_ boundary. Two orthogonal axes, one word.
**Disqualified**, and so is any `*.core.ts` suffix.

**`Module` — bound twice, differently, and the repo says so itself.**

> **Module**: A named checking domain that owns one section of the config and one family of
> checks; `frontmatter-harness` is the first, and `frontmatter:` is its section. Narrower than the
> general design sense used in `codebase-design`, where a module is anything with an interface and
> an implementation.

A term already carrying two documented senses cannot take a third. **Disqualified.**

**`Rule` — taken, and the file extension is taken too.**

> **Rule**: One entry in a Module's ordered rule list: a selector, a mandatory `intent`, and a
> payload. […] _Avoid_: path rule, matcher, policy

Plus **ADR rule** ("A deterministic check in an ADR's companion `.rules.ts`"). `*.rule.ts` /
`*.rules.ts` is **disqualified** twice over — the second time mechanically, because
`.rules.ts` is already Archgate's companion-file extension.

**`Signal`, `Constraint`, `Preset` — all bound, none of them plausible candidates for this role,
listed for completeness.** `Signal` is "What a document states about its own trustworthiness";
`Constraint` is "One assertion a Rule makes about one frontmatter field"; `Preset` is "A shipped
config an adopter can adopt, amend, or ignore". Each carries an explicit _Avoid_ list.
**Disqualified** as suffixes.

**`Type vocabulary` — a collision the owner may not have noticed, affecting a suffix already in
the proposed set.**

> **Type vocabulary**: The set of document kinds a repo recognises, spelled as `allowed` records
> on the `type` field of the Rules that care.

`*.types.ts` is in the accepted vocabulary, and in this repo "type" is a _frontmatter field name_
with a bound plural. `src/config/types.ts` is genuinely ambiguous between "TypeScript type
declarations" and "the document type vocabulary". Not disqualifying — `.types.ts` has strong
external precedent — but it wants one clarifying sentence in whichever governance document the
glob addresses.

**`command` — bound to the CLI, which compromises `*.command.ts`.** `Core` is defined to include
"the command surface", and `docs/vision/architecture.md` §8 is titled "No mutation without an
explicit command". In this repo a "command" is a CLI verb. A `*.command.ts` file would be read as
"defines a CLI command", not "orchestrates a unit of work". **Flagged, not disqualified** — and
note the two readings could deliberately be made to coincide.

**`Actor` — a near-collision for `*.action.ts`.**

> **Actor**: An identity recorded in frontmatter, written `<producer>/<version>`, `human:<id>`, or
> `process:<id>`.

`Actor` and `action` are one letter apart in a repo where `Actor` is a load-bearing frontmatter
concept. **Flagged.**

### 0.2 `.agents/skills/codebase-design/SKILL.md` — the design vocabulary

This file opens its glossary with an explicit prohibition, which settles one candidate outright:

> Use these terms exactly: don't substitute "component," "service," "API," or "boundary."
> Consistent language is the whole point.

and repeats it inside the `Module` entry:

> **Module**: anything with an interface and an implementation. […] _Avoid_: unit, component,
> service.

**`*.service.ts` is disqualified by this repo's own design skill, by name.** This is the single
most consequential collision in the document, because `.service.ts` is otherwise the
best-attested candidate in the TypeScript ecosystem (§3.2). The prohibition is about the _design
vocabulary_, not filenames — but a suffix is a vocabulary entry the moment it routes a governance
document, and an agent holding both files would be told to avoid the word and to use it as a
mandatory suffix in the same context window.

**`Interface` — and the skill's own "Rejected framings" section rejects the file-suffix reading.**

> **Interface**: everything a caller must know to use the module correctly: the type signature,
> but also invariants, ordering constraints, error modes, required configuration, and performance
> characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).

> **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow:
> interface here includes every fact a caller must know.

So `*.interface.ts` — a common alternative to `*.types.ts` — is **disqualified**: it asserts
exactly the framing the skill lists as rejected.

**`Adapter` — the one proposed suffix that is already bound, compatibly, and it is worth knowing
the drift.**

> **Adapter**: a concrete thing that satisfies an interface at a seam. Describes _role_ (what slot
> it fills), not substance (what's inside).

The skill's `Adapter` is _any_ seam-filler, including in-memory fakes; the proposed
`*.adapter.ts` means specifically the I/O boundary. That is a narrowing, and it is why
`*.adapter.ts` feels solid — it is the only suffix in the proposed vocabulary with an in-repo
definition behind it. But the skill also warns:

> **Seam** _(Michael Feathers)_: […] _Avoid_: boundary (overloaded with DDD's bounded context).

so the governance document behind `**/*.adapter.ts` should say "seam", not "boundary", and should
state that the suffix means the _I/O_ adapter specifically, narrower than the skill's sense.

`*.seam.ts` is **disqualified** on substance rather than collision: a Seam is "the _location_ at
which a module's interface lives", and a location is not a file's contents.

### 0.3 The vision documents — where `procedure` is already spent

This was not in the brief and it is the strongest in-repo argument against `*.procedure.ts`.
The word is already in use in this repo, twice, for a **documented human process**:

`docs/vision/architecture.md`, tenet 7 heading:

> ### 7. Dependencies are admitted by a stated procedure, not a count

> A fixed budget would be a number invented before the scope is known. The procedure, in order:

`CONTEXT.md`, on the pinned spec:

> Moving the pin, and what it means for upstream to have moved on, are procedures rather than
> vocabulary: they live beside the pin in `docs/okf/README.md`.

In this repo, as of today, "procedure" means _a sequence of steps a human follows_. Adopting
`*.procedure.ts` would make the word mean _a sequence of steps a program follows_ in the same
corpus, and the two senses are close enough to be confused and far enough apart to matter. Note
that the collision is _thematically apt_ — which is exactly what makes it dangerous rather than
merely awkward.

Two further vision collisions, both mild:

- **`service`** — `docs/vision/product.md`'s out-of-scope table lists "Run as a service or phone
  home", and tenet 3 says "No network, no model, no external service, no git call." A product
  that disclaims being a service, whose files are named `*.service.ts`, is self-undermining.
  Reinforces §0.2's disqualification on independent grounds.
- **`use case`** — `docs/vision/product.md` has a section heading "## The primary use case",
  meaning the ordinary-English sense. `*.usecase.ts` would compete with it. **Flagged.**
- **`flow`** — `docs/vision/architecture.md` uses "flow collections" in its YAML sense
  ("reformats flow collections (`[a]` becomes `[ a ]`)"). In a product whose config is YAML,
  `*.flow.ts` is a live confusion. **Flagged.**

### 0.4 Collision matrix

| candidate suffix                                                                                          | collides with                                                                               | source                             | verdict                              |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| `*.core.ts`, "functional core"                                                                            | **Core** — and names its _opposite_ here                                                    | `CONTEXT.md`                       | **disqualified**                     |
| `*.module.ts`                                                                                             | **Module**, in two senses already                                                           | `CONTEXT.md`, `SKILL.md`           | **disqualified**                     |
| `*.service.ts`                                                                                            | "don't substitute … 'service'"; **Module** _Avoid_ list; "Run as a service" is out of scope | `SKILL.md`, `product.md`           | **disqualified**                     |
| `*.interface.ts`                                                                                          | **Interface**, and the exact framing in "Rejected framings"                                 | `SKILL.md`                         | **disqualified**                     |
| `*.rule.ts` / `*.rules.ts`                                                                                | **Rule**, **ADR rule**; `.rules.ts` extension in use                                        | `CONTEXT.md`, Archgate             | **disqualified**                     |
| `*.signal.ts`                                                                                             | **Signal**                                                                                  | `CONTEXT.md`                       | **disqualified**                     |
| `*.constraint.ts`                                                                                         | **Constraint**                                                                              | `CONTEXT.md`                       | **disqualified**                     |
| `*.preset.ts`                                                                                             | **Preset**                                                                                  | `CONTEXT.md`                       | **disqualified**                     |
| `*.seam.ts`                                                                                               | **Seam** is a location, not a file's contents                                               | `SKILL.md`                         | **disqualified**                     |
| `*.procedure.ts`                                                                                          | "procedure" = a documented human process                                                    | `architecture.md` §7, `CONTEXT.md` | **flagged, strongly**                |
| `*.command.ts`                                                                                            | "the command surface"; tenet 8                                                              | `CONTEXT.md`, `architecture.md`    | **flagged**                          |
| `*.action.ts`                                                                                             | near-collision with **Actor**                                                               | `CONTEXT.md`                       | **flagged**                          |
| `*.usecase.ts`                                                                                            | "The primary use case" heading                                                              | `product.md`                       | **flagged**                          |
| `*.flow.ts`                                                                                               | YAML flow collections                                                                       | `architecture.md`                  | **flagged**                          |
| `*.types.ts`                                                                                              | **Type vocabulary** (frontmatter `type`)                                                    | `CONTEXT.md`                       | **flagged, in the accepted set**     |
| `*.adapter.ts`                                                                                            | **Adapter**, compatibly but more broadly                                                    | `SKILL.md`                         | **compatible; narrow it in the doc** |
| `*.pure.ts`                                                                                               | nothing in either glossary                                                                  | —                                  | **clean**                            |
| `*.handler.ts`, `*.orchestrator.ts`, `*.workflow.ts`, `*.calc.ts`, `*.fn.ts`, `*.shell.ts`, `*.effect.ts` | nothing in either glossary                                                                  | —                                  | **clean**                            |

One more, from outside the repo: **`routine`** is the SQL standard's umbrella term for functions
and procedures together (§2.3), _and_ Claude Code's name for scheduled cloud agents. In a repo
whose domain is agent harnesses, `*.routine.ts` buys a collision with the Host harness's own
vocabulary. **Flagged.**

---

## 1. The taxonomies that split code by side-effect character

Seven traditions were probed. **All seven name the pure half confidently and the orchestrating half
badly** — three of them do not name it at all. That is the central result of this section, and it is
why §8 ranks on grounds other than establishment.

### 1.1 Eric Normand, _Grokking Simplicity_ — actions / calculations / data, and **he does name the orchestrator**

The brief asked whether this is the closest match to the owner's description. **It is, and closer
than expected: Normand has a noun for the orchestrating layer and defines it as the thing that
sequences without deciding.**

**Provenance note.** Manning's liveBook serves a truncated free extract; quotes below were obtained
from it and **liveBook exposes chapter numbers and section headings but no print page numbers**, so
citations are "ch. N §heading" and no page number is invented. Two slugs serve the same book:
`grokking-simplicity` and `exploring-functional-programming` (the retitled Manning edition).

**The definitional test — and the book and the podcast word it differently.** Book, ch. 1, §"The
three categories of code in FP", item "1. Actions"
(<https://livebook.manning.com/book/exploring-functional-programming/chapter-1>) — **"run"**:

> Anything that depends on when it is run, or how many times it is run, or both, is an action. If I
> send an urgent email today, it's much different from sending it next week. And of course, sending
> the same email 10 times is different from sending it 0 times or 1 time.

Normand's own podcast, "What is an action?" (2019-07-25,
<https://ericnormand.me/podcast/what-is-an-action>) — **"called"**:

> Actions are anything that depend on when they're called, or how many times they're a called.

> If we look at it from our rule of thumb, the rule of thumb says it depends on when it is called,
> or how many times it is called.

("a called" is a transcription artifact in his own published text, reproduced verbatim.) Both
phrasings are his; **quote the book's "run" if precision matters**, because "called" invites the
misreading that the test is about the call site.

**The three categories.** Book, ch. 3 "Distinguishing actions, calculations, and data", §"Actions,
calculations, and data" (<https://livebook.manning.com/book/grokking-simplicity/chapter-3>):

> Functional programmers distinguish between actions, calculations, and data (ACD).

> **Actions** — Depend on how many times or when it is run — Also called _functions with
> side-effects, side-effecting functions, impure functions_ — Examples: Send an email, read from a
> database
>
> **Calculations** — Computations from input to output — [Also called] _pure functions, mathematical
> functions_ — [Examples]: Find the maximum number, check if an email address is valid
>
> **Data** — Facts about events — [Examples]: The email address a user gave us, the dollar amount
> read from a bank's API

And, on why he refuses "pure function" — relevant to a repo about to mint `*.pure.ts`
(<https://ericnormand.me/podcast/what-is-a-calculation>, 2019-08-05):

> As a rule of thumb, I like to say calculations are runnable code. They're computations that do not
> depend on when they are run or how many times they are run.

> Now it can get tricky because calculations aren't always functions. That's why I don't use the term
> "Pure function". […] That is one reason why I call them calculations instead of functions. Is
> because function already has meaning to most programmers.

He is explicit that the vocabulary is his own coinage over a shared practice — so **conventional**
as terminology, **normative** as a definition within his book:

> These are my terms for these categories, but it's something that all functional programmers do, is
> they see actions, calculations and data, they distinguish these things.

**Actions spread — the mechanism that forces a two-suffix vocabulary in the first place.** Book,
ch. 3: "Track actions as they spread throughout your code."; "you'll see how calculations are often
overlooked and how infectious actions can be."; and a section literally headed **"Actions spread
through code"**. Stated as a rule in
<https://ericnormand.me/podcast/dont-overcomplicate-the-onion-architecture> (2021-05-24):

> …mostly because the actions spread. If I have a function that calls an action, that function is an
> action. Any function that calls that one is also an action. If you graph that out, the functions
> at the bottom that don't call actions, those are your calculations.

This is the argument that a `*.pure.ts` / `*.<orchestrator>.ts` split is _forced_ rather than
stylistic: purity is not a local property, so it needs a boundary that a tool can see.

**The orchestrator: Normand calls it the "interaction layer".** Consistent across 2018–2021.
<https://ericnormand.me/podcast/what-is-the-onion-architecture> (2018-11-15), episode summary:

> When we're structuring our functional software, we want to isolate the actions from the
> calculations. We can do that using the Onion Architecture, which has layers like an onion. The
> center of the onion is your domain model, then around that are your business rules. Finally,
> around that is your **interaction layer**, which talks with the outside world, including the
> database, web requests, api endpoints, and the UI.

and — the definition that matches the owner's wording almost word for word:

> Then you have your outer layer, your interaction layer, that's what does the query, it calls this
> business rule that determines the plan for what emails to send. […] It calls that pure function
> that's in the business rule layer. It returns a list of emails to send. **Then the interaction
> layer iterates through that and sends them, but there's no decisions anymore. There's no decisions
> to be made at that point. It's simply acting.**

> **It's actually dumb, and that's a good thing** because you want the business rules to decide what
> happens.

> I'm calling it the **plan then act pattern**. In plan then act, you make a plan, and then you act.

restated in the 2021 episode:

> The outer layer is called the **Interaction Layer**, and this is where all of your actions go. […]
> **If you listed the steps that the interaction layer took, that becomes like a script.** […] It's
> a very simple **script**.

Ch. 18 of the book is titled **"Reactive and onion architectures"** and states the scope: "Onion
architecture operates at the level of an entire service." **UNVERIFIED:** the book's exact
three-layer names could not be read from the free extract, which truncates before the layer list;
secondary book-notes sites claim "Language / Domain / Interaction". The podcast quotes above verify
**"interaction layer"** from Normand's own mouth; the book's own layer list is not verified.

**Verdict on the brief's hypothesis: confirmed, with a correction.** Normand's taxonomy is the
closest match to what the owner described — but the owner's role is Normand's **interaction layer**,
not his "action". An action is a _leaf_ effect (send an email); the interaction layer is the
_sequencing_ of them. And Normand has **no** "shell": a grep of the free extracts of ch. 1, 3, 4, 5,
8, 9 and 18 found no architectural use of the word; where he says "functional core" in the podcast
he is borrowing from Bernhardt.

### 1.2 Gary Bernhardt — "Functional Core, Imperative Shell", and two corrections to the usual citation

**Correction 1: the phrase is his own, and it was published as a _screencast_ on 2012-07-12, before
the talk it is usually credited to.** From his own catalogue page
(<https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell>):

> Functional Core, Imperative Shell was published on **2012-07-12**. It uses Ruby 1.9.3 and Vim 7.3.

and the "Boundaries" talk page itself points _at_ the screencast rather than coining the phrase
(<https://www.destroyallsoftware.com/talks/boundaries>):

> A talk by Gary Bernhardt from SCNA 2012 […] The **"Functional Core, Imperative Shell"** screencast
> mentioned at the end is available as part of season 4 of the DAS catalog.

So the common attribution "from the Boundaries talk (Nov 2012)" is **conventional and slightly wrong
on chronology**. The talk is SCNA 2012, not RubyConf.

**Correction 2: there is no published transcript of "Boundaries".** Measured: the page is 6,761
bytes, HTTP 200; every `href` on it was enumerated and none is a transcript; the `/talks` index lists
titles only. **Everything quoted verbatim "from the Boundaries talk" in the wild comes from viewers'
notes.** HARD NULL — do not cite the talk verbatim.

**Yes, "shell" is a noun for the orchestrating layer, and it is defined by enumeration plus one
quality.** The screencast description is the only place on his site that says what is in it:

> We review a Twitter client whose core is functional: managing tweets, syncing timelines to incoming
> Twitter API data, remembering cursor positions within the tweet list, and rendering tweets to text
> for display. **This functional core is surrounded by a shell of imperative code: it manipulates
> stdin, stdout, the database, and the network, all based on values produced by the functional
> core.**

> This design has many nice side effects. For example, testing the functional pieces is very easy,
> and it often naturally allows isolated testing with no test doubles. **It also leads to an
> imperative shell with few conditionals**, making reasoning about the program's state over time
> much easier.

Two things to lift: the shell is defined **extensionally** (stdin, stdout, database, network) rather
than by a role, and its defining property is **"few conditionals"** — it sequences, it does not
decide. That is the same claim Normand makes.

**For this repo: "functional core" is disqualified by §0.1, and `*.shell.ts` is measurably absent
from real TypeScript (§3.10) — including from the one TypeScript FCIS repo that exists, which uses
bare `src/shell.ts`.**

### 1.3 Mark Seemann — the "impureim sandwich", 2020

<https://blog.ploeh.dk/2020/03/02/impureim-sandwich/> (dated "Monday, 02 March 2020"):

> Therefore, the best we can ever hope to achieve is an impure entry point that calls pure code and
> impurely reports the result from the pure function.

> Gather data from impure sources. Call a pure function with that data. Change state (including user
> interface) based on return value from pure function.

He names the _shape_ (impure–pure–impure) and calls the outer layer an **"impure entry point"** — a
descriptive phrase, not a role noun. This post does **not** cite Bernhardt or use "functional core,
imperative shell". Another data point for the pattern: **the shape is well named; the layer is not.**

### 1.4 Clean Architecture — "use case" names the layer, "interactor" names the object, and it is Jacobson's word

**The 2012 post says "use case", 15 times, and "interactor" zero times** (measured on the fetched
page). <https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html>:

> **Entities** encapsulate Enterprise wide business rules. An entity can be an object with methods,
> or it can be a set of data structures and functions.

> **Use Cases** — The software in this layer contains application specific business rules. It
> encapsulates and implements all of the use cases of the system. **These use cases orchestrate the
> flow of data to and from the entities, and direct those entities to use their enterprise wide
> business rules to achieve the goals of the use case.**

> **Note the flow of control. It begins in the controller, moves through the use case, and then winds
> up executing in the presenter.**

That is the clearest **normative** orchestrator sentence in the whole survey, and it uses the verb
"orchestrate".

**"Interactor" is defined in the _2011_ post, not the 2012 one.**
<https://blog.cleancoder.com/uncle-bob/2011/11/22/Clean-Architecture.html>:

> …the controllers unpack the HttpRequest object into a simple vanilla data structure, and then
> **pass that data structure to an interactor object that implements the use case by invoking
> business objects. The interactor then gathers the response data into another vanilla data structure
> and passes it back to the UI.**

So: **"use case" = the layer/behaviour; "interactor" = the object implementing one.**

**And "interactor" is not Martin's coinage — he credits Ivar Jacobson.** From Martin's own commercial
site (<https://cleancoders.com/episode/clean-code-episode-7>):

> In this episode, Uncle Bob **re-introduces the concepts first espoused by Ivar Jacobson in his epic
> book, "Object-Oriented Software Engineering."**

> Uncle Bob illustrates how to use **Jacobson's three primary architectural classes: Entities,
> Interactors, and Boundaries.**

**Answer to the brief: "interactor" is _attributed_, inherited from Jacobson (1992). "Use case" is
the normative term in Martin's own layer taxonomy.**

**UNVERIFIED:** verbatim text from the 2017 book _Clean Architecture_ could not be obtained. The
Google Books API returned HTTP 429 ("Quota exceeded"), O'Reilly chapter pages are login-gated, and
every other result was third-party reading notes. The frequently-quoted "A use case is a description
of the way that an automated system is used" appears **only** in secondary notes in this survey and
is **not** presented here as a verified quote, and no page number is attached to it.

### 1.5 DDD — the **application service** is the orchestrator, and Evans defines it by enumeration

**Provenance disclosure, because the page numbers matter.** Two Evans sources with different
weight: **(1)** Evans's own free _Domain-Driven Design Reference_ (2015, CC-BY 4.0,
<https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf>) — **real,
citable page numbers**; **(2)** the 2003 book text, obtained from a course-hosted PDF whose footer
reads `(Final Manuscript, April 15, 2003) © Eric Evans, 2003` — **manuscript pages, which do NOT
match the published book's pagination**. They are cited below as "Final Manuscript p. N" and must be
re-verified against print before being quoted with a page number elsewhere.

**The definition of Service** — DDD Reference p. 14:

> **Services** — _Sometimes, it just isn't a thing._ […] **Therefore:** When a significant process or
> transformation in the domain is not a natural responsibility of an entity or value object, add an
> operation to the model as a standalone interface declared as a service.

2003 book, ch. 5 §"Services", Final Manuscript p. 76 — three characteristics, plus the naming rule
and the word he reaches for:

> A good SERVICE has three characteristics:
> • The operation relates to a domain concept that is not a natural part of an ENTITY or VALUE OBJECT.
> • The interface is defined in terms of other elements of the domain model.
> • The operation is stateless.

> **A SERVICE tends to be named for an activity, rather than an entity, a "verb" rather than a
> "noun".**

> Many SERVICES are built on top of the populations of ENTITIES and VALUES, **behaving like scripts
> that organize the potential of the domain to actually get something done.**

**Application versus domain service — Evans draws the line explicitly**, ch. 5 §"SERVICES and the
Isolated Domain Layer", Final Manuscript p. 76:

> **It takes care to distinguish SERVICES that belong to the domain layer from those of other
> layers**, and to factor responsibilities to keep that distinction sharp.

> **It can be harder to distinguish application SERVICES from domain SERVICES. The application layer
> is responsible for ordering the notification. The domain layer is responsible for determining if a
> threshold was met** […]

> Here we encounter a **very fine line** between the domain layer and the application layer.

and the table that is the single most useful artifact in this whole survey — §"Partitioning Services
into Layers", Final Manuscript p. 77:

> **Application** — _Funds Transfer App Service:_ 1. Digests input (e.g. XML request), 2. sends
> message to domain service for fulfillment, 3. listens for confirmation, 4. decides to send
> notification using infrastructure service.
>
> **Domain** — _Funds Transfer Domain Service:_ Interacts with necessary Account and Ledger objects,
> making appropriate debits and credits, supplies confirmation of result (transfer allowed or not,
> etc.)
>
> **Infrastructure** — _Send Notification Service:_ Sends emails, letters, etc. as directed by
> application.

**The application row is a numbered sequence of steps with no business rule in it.** That is the
owner's role, defined by enumeration, in 2003.

**The thinness statement**, ch. 4 §"Layered Architecture", Final Manuscript p. 53:

> **Application Layer** — Defines the jobs the software is supposed to do and directs the expressive
> domain objects to work out problems. […] **This layer is kept thin. It does not contain business
> rules or knowledge, but only coordinates tasks and delegates work to collaborations of domain
> objects in the next layer down.** It does not have state reflecting the business situation, but it
> can have state that reflects the progress of a task for the user or the program.

This transcription is **independently cross-checked word for word** against Microsoft's .NET
architecture ebook, which quotes the same sentences and attributes them to the book
(<https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice>,
§"The application layer") — so the wording is safe even though the page number is manuscript-based.

**UNVERIFIED:** Vernon's _Implementing Domain-Driven Design_ (2013) ch. 14 "Application" body text.
The chapter's structure and page numbers **are** verified from Pearson's official sample PDF —
"Chapter 14 Application … 509", "Application Services … 521", "Inside an Application Service … 541"
— and Vernon's own précis is quotable ("**How do the Application Services and infrastructure
work?**"), but pp. 509–560 are absent from the sample, O'Reilly returned HTTP 403, and Google Books
returned HTTP 429. The specific "Application Services are the direct clients of the domain model /
should be very thin" formulations are **not verified**.

**Answer to the brief: the application service is the orchestrator, the domain service is not, and
Evans states it normatively.** Note also, DDD Reference p. 10: "**The key goal here is isolation.
Related patterns, such as 'Hexagonal Architecture' may serve as well or better** …"

### 1.6 Sans-IO — names the pure half, refuses to name the other

Authorship, verified: the site is Brett Cannon's (every page footer reads `©2016, Brett Cannon.`),
crediting Cory Benfield's PyCon US 2016 talk for the argument; the how-to's Acknowledgements name no
individual author, only "the excellent people involved in the Python Async Special Interest Group".

<https://sans-io.readthedocs.io/> and <https://sans-io.readthedocs.io/how-to-sans-io.html>:

> By implementing network protocols without any I/O and instead operating on bytes or text alone,
> libraries allow for reuse by other code regardless of their I/O decisions. In other words **by
> leaving I/O out of the picture a network protocol library allows itself to be used by both
> synchronous and asynchronous I/O code.**

> An I/O-free protocol implementation (colloquially referred to as a "**sans-IO**" implementation) is
> an implementation of a network protocol that contains no code that does any form of network I/O or
> any form of asynchronous flow control. Put another way, **a sans-IO protocol implementation is one
> that is defined entirely in terms of synchronous functions returning synchronous results, and that
> does not block or wait for any form of I/O.**

**The two halves? It names only one.** The relevant section is titled with a gerund — "Integrating
With I/O" — and the closest it comes to a noun is:

> Another possibility is to try as much as possible to **push your I/O and flow control primitives to
> the _edges_ of the program or library** […] except for **a very tiny nucleus of code that uses the
> I/O and flow control primitives of the given platform.**

**"The edges" and "a very tiny nucleus" — descriptive phrases, no role name. HARD NULL on a noun.**

And a primary source asserting that all of these taxonomies are the same idea, which is worth having
in one quote:

> It should be noted that the sans-IO implementation style is a specific facet of several broader
> software design best practices. In particular, good comparisons can be made to **Bob Martin's Clean
> Architecture**, to well-realised **Model-View-Controller** applications, to **Gary Bernhardt's
> Functional Core and Imperative Shell** and to the broader software design principle of
> **separation of concerns**.

### 1.7 Hexagonal / Ports and Adapters — **there is no orchestrator to name**

Measured term counts over the full text of <https://alistair.cockburn.us/hexagonal-architecture/>:

| term                  | occurrences                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `orchestrat*`         | **0**                                                                                                                         |
| `coordinat*`          | **0**                                                                                                                         |
| `application service` | **0**                                                                                                                         |
| `interactor`          | 1 — only in "Related Patterns", naming _someone else's_ MVC variant ("such as **Model-Interactor** and Model-View-Presenter") |
| `application layer`   | 1 — only inside a quoted third-party contribution                                                                             |
| `business logic`      | 5                                                                                                                             |
| `controller`          | 3 — all in the MVC discussion                                                                                                 |

Cockburn's pattern has exactly three named things: **ports**, **adapters**, and **"the
application"** as an undifferentiated whole. He never subdivides the inside. The axis he does draw:

> Both the user-side and the server-side problems actually are caused by the same error in design and
> programming -- the entanglement between the business logic and the interaction with external
> entities. **The asymmetry to exploit is not that between left and right sides of the application but
> between inside and outside of the application.**

> As events arrive from the outside world at a port, a technology-specific adapter converts it into a
> usable procedure call or message and passes it to **the application**. **The application is
> blissfully ignorant of the nature of the input device.**

This extends `file-naming-for-glob-routing.md` §3.3 (which found no folder names in Cockburn):
**there is also no orchestration element in Cockburn.** Hexagonal supplies `*.adapter.ts` and
nothing else this vocabulary needs — which is exactly what the repo has already taken from it.

The single mention of an "application layer" on the page is a warning from someone else, and it is
worth having because it is the failure mode of an orchestration suffix:

> This example written by **Willem Bogaerts** on the C2 wiki: "I encountered something similar, but
> mainly because **my application layer had a strong tendency to become a telephone switchboard that
> managed things it should not do.**"

### 1.8 The framework-bound names — all three are bound, and one of them isn't its author's word

**CQRS "command handler" — and a striking null: it is not Greg Young's term.** Measured over Greg
Young's _CQRS Documents_ (56 pp., <https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf>):
`Command Handler` **0** occurrences, `CommandHandler` **0**, `handler` 2 (both about _event_
handlers), `command` 72, `Application Service` 4. Young's name for the orchestrating facade is
**Application Service** (p. 2):

> Abstracting the "domain" one will find a facade known as **Application Services. Application
> Services provide a simple interface to the domain and underlying data, they also limit coupling
> between the consumers of the domain and the domain itself.**

**"Command handler" is normative in Microsoft's guidance**, and its definition is the best
step-by-step statement of the role found anywhere
(<https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-application-layer-implementation-web-api>,
§"The Command handler class"):

> **The command handler is in fact the heart of the application layer in terms of CQRS and DDD.
> However, all the domain logic should be contained in the domain classes—within the aggregate roots
> (root entities), child entities, or domain services, but not within the command handler, which is a
> class from the application layer.**

> The command handler usually takes the following steps: It receives the command object […] It
> validates that the command is valid […] It instantiates the aggregate root instance […] It executes
> the method on the aggregate root instance […] It persists the new state of the aggregate […]

> **When command handlers get complex, with too much logic, that can be a code smell.**

**Bound**, though: the term presupposes a command object, a dispatcher or mediator, one class per
command, and a _write_. It has no story for a read-shaped orchestration, which is most of what a
linting tool does.

**NgRx "effect" — normative in NgRx, defined in terms of RxJS, and unusable outside it.**
<https://ngrx.io/guide/effects> (docs source at `projects/www/src/app/pages/guide/effects/index.md`,
`@ngrx/platform` 22.0.0):

> **Effects are an RxJS powered side effect model for Store.** Effects use streams to provide new
> sources of actions to reduce state based on external interactions such as network requests, web
> socket messages and time-based events.

> - **Effects isolate side effects from components**, allowing for more _pure_ components that select
>   state and dispatch actions.
> - Effects are long-running services that listen to an observable of _every_ action dispatched from
>   the Store.
> - Effects perform tasks, which are synchronous or asynchronous and **return a new action**.

The action-in / action-out signature makes "effect" a name for a _stream transformer_, not for
orchestration. **Hard-bound.**

**Redux-Saga "saga" — bound, and the author's own general word for the role is something else.**
<https://redux-saga.js.org/docs/About/>:

> **The mental model is that a saga is like a separate thread in your application that's solely
> responsible for side effects.**

The provenance, from the creator, Yassine Elouafi (<https://survivejs.com/blog/redux-saga-interview/>):

> The term saga was historically used by **Hector Garcia-Molina and Kenneth Salem** to define a
> mechanism to handle **long lived transactions in database systems**. **But in redux-saga, the
> closest meaning is actually a process manager** basically: "a process that receive events, and may
> emit new events (sync or async), aiming to **orchestrate complex workflows** inside your
> application"

Note two things: the docs **do not** mention Garcia-Molina, Salem, 1987, or distributed transactions
anywhere checked (About page, home page, beginner tutorial, saga-helpers page, repo README — a
spot-check, not an exhaustive sweep, because the GitHub trees API returned HTTP 403
unauthenticated), so **the docs diverge from the 1987 meaning silently**; and when the author needs
the _general_ concept he reaches for **"process manager"**, with the verb **"orchestrate"**.

### 1.9 What all seven agree on — and the two things they agree on are not names

**(a) The role is defined by what it must NOT contain.** Four independent primary sources:

| source           | the constraint, in their words                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Bernhardt (2012) | "an imperative shell with **few conditionals**"                                                            |
| Normand (2018)   | "there's no decisions anymore… **It's simply acting**"; "**It's actually dumb, and that's a good thing**"  |
| Evans (2003)     | "**This layer is kept thin. It does not contain business rules or knowledge, but only coordinates tasks**" |
| Microsoft (CQRS) | "When command handlers get complex, with too much logic, **that can be a code smell**"                     |

The owner's own definition — _"contain control flow and execute functions but do not implement logic
on their own"_ — is a fifth independent statement of the same constraint. **It is the constraint, not
the name, that is established.**

**(b) Three separate authors reach for the word _script_ or a numbered sequence.** Evans: services
"behaving like **scripts** that organize the potential of the domain to actually get something
done", plus the Funds Transfer App Service defined as steps 1–4. Normand: "If you listed the steps
that the interaction layer took, that becomes like a **script**… It's a very simple **script**."
Microsoft: a five-step list. `*.script.ts` is not proposed here — `script` collides with npm scripts
and shell scripts — but the convergence is evidence about what the role _is_.

**(c) The role has been renamed at least six times without being redefined:** interactor (Jacobson
1992 → Martin 2011) · application layer / application service (Evans 2003) · imperative shell
(Bernhardt 2012) · use case (Martin 2012) · interaction layer (Normand 2018) · command handler
(Microsoft, _not_ Greg Young). Two of the renames are documented in primary sources as **borrowings**
— Martin credits Jacobson; sans-IO explicitly equates Clean Architecture, MVC and Functional
Core/Imperative Shell. **A term renamed six times in thirty years is a term with no establishment to
inherit.** That is the honest answer to "which established name should this be?"

---

## 2. What "procedure" already means, in four places that matter

The owner's definition — _"contain control flow and execute functions but do not implement logic on
their own"_ — is coherent. The problem is that "procedure" is already spoken for, and none of the
four established meanings is the owner's.

### 2.1 tRPC: a procedure is a network endpoint — **normative, and dominant in TypeScript**

This is the decisive one, because it is the current meaning of the word _in TypeScript
specifically_. tRPC's own documentation, first sentence of the page that defines the term
(<https://trpc.io/docs/server/procedures>, source `www/docs/server/procedures.md`):

> A procedure is a function which is exposed to the client, it can be one of:
>
> - a `Query` - used to fetch data, generally does not change any data
> - a `Mutation` - used to send data, often for create/update/delete purposes
> - a `Subscription` - you might not need this, and we have [dedicated documentation](../server/subscriptions.md)

> Procedures in tRPC are very flexible primitives to create backend functions.

The idiomatic identifiers are `t.procedure` and `publicProcedure`. So in the TypeScript ecosystem
"procedure" names a **transport-exposed endpoint** — a concept that lives on the _outside_ of the
system, adjacent to `*.adapter.ts`. The word's TypeScript meaning is closer to "controller" than
to "orchestrator", and the acronym behind it (RPC = _remote procedure call_) actively pulls toward
I/O. A codebase that has both `*.adapter.ts` and `*.procedure.ts` is inviting exactly the wrong
inference.

### 2.2 SICP and the Lisp tradition: a procedure is _any_ function — **normative in the tradition that gives us "pure"**

Abelson & Sussman, _Structure and Interpretation of Computer Programs_, §1.1.4 "Compound
Procedures" (<https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book-Z-H-10.html>):

> Now we will learn about _procedure definitions_, a much more powerful abstraction technique by
> which a compound operation can be given a name and then referred to as a unit.

> We have identified in Lisp some of the elements that must appear in any powerful programming
> language: Numbers and arithmetic operations are primitive data and procedures.

In Scheme, "procedure" is the word for a function — primitive or compound, pure or not. This is
the tradition from which "pure function" and "referential transparency" reach programming
practice at all (§5.1). Pairing `*.pure.ts` with `*.procedure.ts` therefore reads, to anyone
holding that tradition, as _pure_ versus _function_ — a non-partition. **The two halves of the
vocabulary are drawn from vocabularies that do not oppose each other.**

### 2.3 SQL: a procedure is the half that returns nothing — **normative**

PostgreSQL, §36.4 "User-Defined Procedures"
(<https://www.postgresql.org/docs/current/xproc.html>, PostgreSQL 18):

> A procedure is a database object similar to a function. The key differences are:
>
> Procedures are defined with the `CREATE PROCEDURE` command, not `CREATE FUNCTION`.
>
> Procedures do not return a function value; hence `CREATE PROCEDURE` lacks a `RETURNS` clause.
> However, procedures can instead return data to their callers via output parameters.
>
> While a function is called as part of a query or DML command, a procedure is called in isolation
> using the `CALL` command.
>
> A procedure can commit or roll back transactions during its execution (then automatically
> beginning a new transaction), so long as the invoking `CALL` command is not part of an explicit
> transaction block. A function cannot do that.

> Collectively, functions and procedures are also known as **routines**.

This is the closest established meaning to the owner's intent — a procedure is the
_effect-performing_ half — but it contradicts the intent in one specific way that matters here: a
procedure **returns no value**. An orchestrator in this repo composes a check run and returns a
report. In SQL terms that is a _function_, not a procedure. The same holds for ALGOL/Pascal/Ada
`procedure` (void subroutine) — **UNVERIFIED against those standards' text; not needed, since
PostgreSQL states the distinction normatively and the SQL standard is its source.**

The genuinely useful loan from this passage is **routine** as the neutral umbrella. It is not,
however, a name for orchestration; it is a name for _either_ kind.

### 2.4 This repo: a procedure is a documented human process

Established in §0.3: `docs/vision/architecture.md` §7 ("Dependencies are admitted by a stated
procedure, not a count") and `CONTEXT.md` ("Moving the pin … are procedures rather than
vocabulary").

### 2.5 And measured, the word is not used as a suffix at all — **[executed]**

`gh api -X GET search/code -f q='filename:procedure extension:ts language:TypeScript'` →
`total_count` **24,960** (`procedures` → **10,496**), read with all the caveats in §3.1. Of the
top 100 ranked hits:

- **`*.procedure.ts` (dotted): 0**
- bare `procedure.ts` / `procedures.ts`: **56**

and the visible head reads as a census of the four meanings in §2.1–2.3, not of the owner's:
`packages/trpc/src/procedures.ts`, `src/orpc/procedures.ts`, `koala/trpc-procedure.ts`,
`src/rpc/procedures.ts` (tRPC/oRPC endpoints) · `packages/mssql/src/Procedure.ts`,
`sdk/nodejs/procedureSql.ts` (SQL stored procedures) · `src/FHIR-R5/procedure.ts` (a medical
procedure, in the HL7 FHIR resource sense) · `src/cst/Procedure.ts`, `src/syntax/procedure.ts`,
`src/parse-procedure.ts` (parser/CST nodes for a _language's_ `procedure` keyword).

For comparison: **`impure` → 316** — the lowest count measured for any candidate in this document,
which is worth knowing because `*.impure.ts` is the one name that would make the partition
self-evident (§8).

### 2.6 Verdict

`*.procedure.ts` is not merely unestablished — **it is established, four times, for four other
things**, one of which (tRPC) is the dominant TypeScript meaning and points at the I/O boundary
the vocabulary already assigns to `*.adapter.ts`, and one of which (Scheme) makes the
`pure`/`procedure` pair a non-opposition. Prevalence as a filename suffix is measured in §3 and is
near zero. The owner's instinct to reject it is correct, and for stronger reasons than aesthetics.

---

## 3. Prevalence: which of these are actually used as TypeScript filename suffixes

This is the decisive section, because the owner wants _established_, not defensible. The headline:
**for the orchestration role, nothing is established.** `.service.ts` and `.effects.ts` are
generator momentum with no document behind them; `.usecase.ts`, `.handler.ts`, `.workflow.ts`,
`.orchestrator.ts` and `.shell.ts` are rare to absent. The suffixes that are genuinely _rules_ in
TypeScript are a short, closed list, and none of them names an orchestrator.

### 3.1 What the measurement can and cannot say — read this before any number below

Four constraints, each measured, not assumed.

**(a) GitHub's legacy code-search API rejects path wildcards, so the dotted form cannot be queried
directly.** **[executed]**

```
$ gh api -X GET search/code -f q='path:*.service.ts'  --jq '.total_count'   → 0
$ gh api -X GET search/code -f q='filename:*.pure.ts' --jq '.total_count'   → 0
$ gh search code 'path:*.service.ts' --json path --limit 3                  → []
```

Zero here means "unsupported query", not "no such files". Any count reported as a wildcard path
search is worthless.

**(b) `filename:` is a _token_ match.** `filename:service` returns `services.ts` and bare
`service.ts`; `filename:use-case` returns `abuse-case.ts`. Every count below is therefore
**"`.ts` files, language TypeScript, whose basename contains this token"** — a loose **upper bound**
on the dotted convention, off by one to three orders of magnitude.

**(c) `total_count` is quantized — GitHub approximates it.** Measured across 25 collected values:
GCD = **32**, and 23 of 25 are divisible by **128**. Treat any two counts within a factor of two as
indistinguishable.

**(d) The 100-item sample is relevance-biased toward short basenames.** For `service`, 81/100 of
the top hits were bare `service.ts`/`services.ts` and **zero** were `*.service.ts`. The "dotted in
top 100" column is a statement about the ranked head, not a corpus precision estimate.

Two fallbacks failed and are recorded so nobody repeats them: **grep.app** (which does support path
globs) is behind a Vercel security checkpoint for `curl`; the **GitHub web UI** count returns "Sign
in to search code on GitHub" to an unauthenticated fetch — **UNVERIFIED** by that route.

Command form for every count: `gh api -X GET search/code -f q='filename:<TOKEN> extension:ts
language:TypeScript'`. Rate limit is **10/min** (`gh api rate_limit --jq
'.resources.code_search'`).

### 3.2 `.service.ts` — a framework default, and **not normative anywhere**

This distinction is the one the brief asked to nail, and it lands cleanly.

**It is a generator default, hardcoded in a template _filename_.** From the `nestjs/schematics`
tree (`master`):

> `"path": "src/lib/service/files/ts/__name__.service.ts"`

confirmed by the schematic's own test, `src/lib/service/service.factory.test.ts`:

> ```ts
> expect(files.find((filename) => filename === '/foo.service.ts')).toBeDefined();
> ```

`@nestjs/schematics` does **35,249,184** downloads/month
(`api.npmjs.org/downloads/point/last-month/@nestjs/schematics`). That is the entire basis of the
convention's prevalence.

**No NestJS document asks for it.** The CLI usage table at <https://docs.nestjs.com/cli/usages>
states no filenames at all:

> `| service     | `s`   | Generate a service declaration.                    |`

and the docs never print `.ts` — the site appends it at render time, from
`src/app/shared/pipes/extension.pipe.ts`:

> ```ts
> transform(value: any, args?: any): any {
>     return !args ? `${value}.ts` : `${value}.js`;
>   }
> ```

An exhaustive grep of the whole `content/` tree for `be named|name the file|name your file|named
after` returns **zero matches** — consistent with `file-naming-for-glob-routing.md` §2.5, which
reached the same null by a different route.

**And `.service.ts` is the one role suffix NestJS tooling does _not_ consume.** The plugin
allowlists cover `.dto.ts`, `.entity.ts`, `.input.ts`, `.args.ts`, `.model.ts` and `.controller.ts`
— never `.service.ts`. The only sentences in the NestJS corpus that are _normative about a suffix_
are:

> Please, note that your filenames **must have** one of the following suffixes: `['.dto.ts',
'.entity.ts']` (e.g., `create-user.dto.ts`) in order to be analysed by the plugin.
> — <https://docs.nestjs.com/openapi/cli-plugin>

> Testing files should have a `.spec` or `.test` suffix.
> — <https://docs.nestjs.com/fundamentals/unit-testing>

> Following best practices, we declared the custom provider in the separated file which has a
> `*.providers.ts` suffix. — <https://docs.nestjs.com/recipes/sql-typeorm>

**Not configurable**: `src/lib/service/schema.json` exposes `specFileSuffix` (default `spec`) and
nothing for the `.service` segment.

**Tier: framework default (conventional). Not normative. And disqualified for this repo anyway by
§0.2.**

### 3.3 `.controller.ts` — the strongest role suffix in TypeScript, because a tool reads it

Template: `"path": "src/lib/controller/files/ts/__name__.controller.ts"`. And uniquely among role
suffixes, it is a **configurable default inside an AST transform**. `@nestjs/swagger`,
`lib/plugin/merge-options.ts`:

> ```ts
> const defaultOptions: PluginOptions = {
>   dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
>   controllerFileNameSuffix: ['.controller.ts'],
> ```

and the matching mechanism — **independently re-verified byte-for-byte** at
`nestjs/swagger:lib/plugin/utils/is-filename-matched.util.ts` _and_
`nestjs/graphql:packages/graphql/lib/plugin/utils/is-filename-matched.util.ts`, identical in both — in
full:

> ```ts
> export const isFilenameMatched = (patterns: string[], filename: string) =>
>   patterns.some((path) => filename.includes(path));
> ```

Name the file anything else and the plugin silently skips it. **That** is a contract. **Tier:
framework default _and_ normative-by-tooling.** But `controller` names an inbound transport
boundary, which this vocabulary assigns to `*.adapter.ts`.

### 3.4 `.effects.ts` (NgRx) — framework default, plural, not normative

Template, `ngrx/platform` (`main`):

> `"path": "modules/schematics/src/effect/files/__name@dasherize@if-flat__/__name@dasherize__.effects.ts.template"`

test, `modules/schematics/src/effect/index.spec.ts`:

> ```ts
> files.indexOf(`${projectPath}/src/app/foo/foo.effects.ts`);
> ```

The schematics page states only "Generates an effect file for `@ngrx/effects`." Across all **151**
markdown docs pages in `projects/www/src/app/pages`: `\.effects\.ts` → **17** occurrences;
`[a-z]\.effect\.ts` → **0**; a case-insensitive grep for `naming` → **zero matches**. Not
configurable — `effect/schema.json` has `flat`, `group`, `skipTests`, `prefix` and no suffix
option. `@ngrx/schematics`: **1,237,953** downloads/month.

**Plural is unanimous** — a detail that matters, because a suffix vocabulary wants one spelling and
the established one here is `.effects.ts`, which reads as a _collection_, not a role.

### 3.5 `.usecase.ts` / `.use-case.ts` — community template, and weaker than expected

**No generator emits either spelling.** The two npm "clean architecture schematics" packages are
`@ascendedco/schematics` (**45** downloads/month; emits `.entity.ts`, `.network.ts`,
`.component.ts`) and `@chejende/clean-arch` (**29** downloads/month). Neither emits a usecase
suffix.

**The most-starred exemplars do not use it** (counts from each repo's full recursive git tree):

| repo                              | stars  | `*.use-case.ts` | `*.usecase.ts` | what it uses instead                                        |
| --------------------------------- | ------ | --------------- | -------------- | ----------------------------------------------------------- |
| `Sairyss/domain-driven-hexagon`   | 14,890 | **0**           | **0**          | `commands/create-user/create-user.service.ts`               |
| `stemmlerjs/ddd-forum`            | 2,092  | **0**           | **0**          | `useCases/…/DownvoteComment.ts` — role in the _directory_   |
| `rmanguinho/clean-ts-api`         | 1,913  | **0**           | **0**          | `data/usecases/db-add-account.ts` — role in the _directory_ |
| `royib/clean-architecture-nestjs` | 931    | **3**           | 0              | `src/use-cases/author/author.use-case.ts`                   |

Three different encodings of the same role — directory, identifier, filename suffix — and the
heaviest dotted-suffix user in the set (Sairyss, which ships `.cli.controller.ts`,
`.http.controller.ts`, `.gql-request.dto.ts`) still writes `.service.ts` for the use case.
`gh search repos 'clean architecture typescript' --sort stars` tops out at **159 stars**: there is
no canonical exemplar. **Tier: community template, weak.**

### 3.6 `.handler.ts` — exemplified in docs, never required, and the AWS case is something else

NestJS CQRS shows it. All ten code-block labels on <https://docs.nestjs.com/recipes/cqrs>:

> `@@filename(kill-dragon.command)`, `@@filename(kill-dragon.handler)`, `@@filename(get-hero.handler)`,
> `@@filename(hero-killed-dragon.event)`, `@@filename(hero.model)`, `@@filename(heroes-game.saga)`, …

but a grep of `content/recipes/cqrs.md` for `file|convention|naming|structure|folder|director`
matches **only** those ten lines — **zero prose hits** — and there is no `command`, `handler` or
`saga` schematic in the NestJS collection.

**The Lambda `handler` is a different thing: an export name inside a configuration string.** AWS,
<https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html>, "Handler naming
conventions":

> When you configure a function, the value of the `Handler` setting is the file name and the name of
> the exported handler method, separated by a dot. The default for functions created in the console
> and for examples in this guide is `index.handler`.

Serverless Framework, <https://www.serverless.com/framework/docs/providers/aws/guide/functions>:

> The `handler` property points to the file and module containing the code you want to run in your
> function.

And the one real dotted convention in this space is **keyed on identity, not role** — AWS CDK
`NodejsFunction`, `packages/aws-cdk-lib/aws-lambda-nodejs/lib/function.ts`:

> ```
>  * Searches for an entry file. Preference order is the following:
>  * 1. Given entry file
>  * 2. A .ts file named as the defining file with id as suffix (defining-file.id.ts)
> ```

The CDK README shows `super-construct.handler.ts` — but `handler` there is the **construct id**
(`new nodejs.NodejsFunction(this, 'handler')`). Rename the construct to `api` and the file becomes
`my-construct.api.ts`. This is the strongest counter-evidence to reading CDK as endorsing
`*.handler.ts` as a role marker. **Tier: docs-exemplified only.**

### 3.7 `.command.ts` — a framework default with exactly one generator behind it

`nest-commander-schematics`, from `jmcdo29/nest-commander@main`:

> `packages/nest-commander-schematics/src/command/files/without-questions/__name@dasherize__.command.ts.template`

`nest-commander`: **2,720,588** downloads/month; the repo's integration tests contain **34** files
ending `.command.ts`. The docs never state the output filename — the convention lives only in the
template name. **oclif is negative**, and directory-based; `src/commands/generate/command.ts`:

> ```ts
> const cmdPath = this.args.name.split(':').join('/');
> const destination = join(process.cwd(), this.flags['commands-dir'], `${cmdPath}.ts`);
> ```

so `oclif generate command foo:bar` → `src/commands/foo/bar.ts`. Notably oclif uses dotted suffixes
to **exclude**: `"!**/*.+(d.*|test.*|spec.*|helpers.*)?(x)"`.

### 3.8 `.action.ts` — the contract is a directive or an export name, never the filename

**Next.js.** <https://nextjs.org/docs/app/api-reference/directives/use-server>:

> The `use server` directive designates a function or file to be executed on the **server side**.

> A Server Function can be defined by using the `use server` directive. You can place the directive
> at the top of an **asynchronous** function to mark the function as a Server Function, or at the
> top of a separate file to mark all exports of that file.
> — <https://nextjs.org/docs/app/getting-started/mutating-data>

A regex sweep of the complete docs export `nextjs.org/docs/llms-full.txt` (**3,927,388 bytes**) for
`[A-Za-z0-9_/\[\]-]+\.actions?\.(ts|tsx|js|jsx)` returns **zero matches**. The docs' labels are
`app/actions.ts` (×38), `app/lib/actions.ts` (×10), and where a role is attached it is
**hyphenated**: `features/task/task-actions.ts`. The only dotted filename suffix Next.js prescribes
anywhere is CSS: "To enable CSS Modules for a file, rename the file to have the extension
`.module.css`."

**React Router / Remix.** Every route-module feature is an **export name** — `loader`, `action`,
`clientAction`, `ErrorBoundary`, `meta` — and the docs put server and client actions in the _same_
file, labelled `app/project.tsx`. Full tree of `remix-run/react-router` (1,436 paths): **0** matches
for `\.actions?\.(ts|tsx|js|jsx)$`.

**Redux actively discourages the split that `*.actions.ts` implies.**
<https://redux.js.org/style-guide/>, rule _Structure Files as Feature Folders with Single-File
Logic_:

> Because of this, **we recommend that most applications should structure files using a "feature
> folder" approach** (all files for a feature in the same folder). Within a given feature folder,
> **the Redux logic for that feature should be written as a single "slice" file**… While older
> Redux codebases often used a "folder-by-type" approach with separate folders for "actions" and
> "reducers", keeping related logic together makes it easier to find and update that code.

A grep of the whole style guide for `actions\.[jt]s|reducers\.[jt]s|\.actions\.|\.reducer\.` returns
**0 matches**, and the official `reduxjs/redux-templates` emit `counterSlice.ts`,
`quotesApiSlice.ts` — camelCase, zero dotted suffixes. **`.actions.ts` is a framework default in
NgRx only.**

This is worth stating plainly because it is a pattern across §3.6–3.8: **where a framework needs to
identify a role, it uses a directive, an export name, or a config string — not a filename.** The
filename is used for roles the _build_ must partition (`.d.ts`, `.module.css`, `.server.ts`), which
is the conclusion `file-naming-for-glob-routing.md` §1.4 already reached.

### 3.9 `.workflow.ts` (Temporal) — the promising hypothesis, and it fails

The forcing function is real but it forces a _separate module_, not a name.
`packages/worker/src/worker-options.ts`:

> ```
>   /**
>    * Path to look up workflows in, any function exported in this path will be registered as a
>    * Workflows in this Worker.
>    …
>   workflowsPath?: string;
> ```

`docs/develop/typescript/workers/run-process.mdx`:

> Workflows are registered by path rather than by value, because they run in a separate JavaScript
> context.

`src/workflows.ts` is scaffold prose only — "Create a Workflow file (`workflows.ts`):" — and
Temporal's own samples contradict any fixed name:

> `      workflowsPath: require.resolve('./workflows-v1'),`
> `    workflowsPath: require.resolve('../temporal-workflows/lib/all-workflows.js'),`

**Dotted `*.workflow.ts` is a hard null**: full git trees, all with `truncated: false` —
`temporalio/samples-typescript` 1,601 paths → **0**; `sdk-typescript` 1,197 → **0**;
`documentation` 1,777 → **0**. Positive control on the same method: `filename:workflows.ts` scoped
to the samples repo → `total_count: 74`.

### 3.10 The rest, briefly — and the `.pure.ts` result is the interesting one

- **`.orchestrator.ts`** — **zero** hits in the Azure Durable Functions TypeScript quickstart and
  overview, and **zero** paths containing `.orchestrator.` in the full tree of
  `Azure/azure-functions-durable-js` (`dev`). The contract is a registration call
  (`df.app.orchestration("chainingOrchestration", chainingOrchestrator)`) and the quickstart puts
  everything in one file: "The sample uses the Node.js v4 programming model, where all functions
  are defined in a single file (`src/functions/helloCities.ts`)."
- **`.shell.ts`** — `gh search repos 'functional core imperative shell' --sort stars` tops out at
  **117 stars**; the TypeScript one, `kenneth-lange/ts-functional-core-imperative-shell` (**39
  stars**), contains exactly two `.ts` files: `src/core.ts` and `src/shell.ts` — **bare, not
  dotted**. Across all three FCIS repos checked, paths matching `\.(shell|pure)\.(ts|js)$` → **0**.
- **`.pure.ts`** — the lowest token count of anything measured (**15,840**), and **36 of the 39
  genuinely-dotted hits in the top 100 come from one repository**,
  `sbb-design-systems/lyne-components` (**66 stars**) — where it does **not** mean "contains only
  pure functions". `src/elements/tag.pure.ts`, in full:

  > ```ts
  > /** @entrypoint */
  > export * from './tag/tag-group/tag-group.component.ts';
  > export * from './tag/tag/tag.component.ts';
  > ```

  It marks a **side-effect-free barrel for tree-shaking** — i.e. the _bundler_ sense of "pure" from
  §4.2, not the _functional_ sense. The single existing user of `.pure.ts` in the wild independently
  confirms the collision hazard §4.2 predicted from webpack's documentation. That is the most
  useful data point in §3 for the accepted half of the vocabulary.

- **`.calc.ts` (208,896 token hits), `.calculation.ts` (42,240), `.fn.ts` (41,344)** — **0/100**
  dotted in every sample. Bare-filename conventions, if anything.
- **`.utils.ts` (2,088,960) / `.util.ts` (2,383,872) / `.lib.ts` (264,192)** — **99/100**, 75/100
  and 80/100 of sampled hits were the _bare_ filename. `utils.ts` is enormous and it is a bare
  filename, not a suffix.
- **`.saga.ts` (40,704) / `.sagas.ts` (10,144)** — redux-saga's own docs label the file **bare**
  ("Create a file `sagas.js`"), and a grep of its entire tree (527 paths) for `.saga.`/`.sagas.`
  returns **NONE**. The one generator emitting `*.sagas.ts` (`@aurorajs.dev/cli`) is a **NestJS
  CQRS** generator, not redux-saga. So `.saga.ts` such as it exists is NestJS CQRS docs prose.
- **`.effect.ts` (183,808)** — the `effect` npm package ("The missing standard library for
  TypeScript", **118,158,542** downloads/month) does **not** pollute the dotted form: **zero** of
  its 3,952 tree paths match `.effect.ts`/`.effects.ts`; it uses PascalCase-per-module (`Effect.ts`,
  `Cause.ts`, `Clock.ts`). The bare token is polluted by audio effects, visual effects, game status
  effects and `useEffect` helpers.

### 3.11 Style guides: a clean null on role suffixes

- **Google TypeScript Style Guide** — there is no "File name" section at all; `Source file basics`
  begins "File encoding: UTF-8". The literal string `d.ts` appears **0** times. The only filename
  rule is a parenthetical under Imports: "Module namespace imports are `lowerCamelCase` while files
  are `snake_case` …"
- **Google JavaScript Style Guide** §2.1 File name: "File names must be all lowercase and may
  include underscores (`_`) or dashes (`-`), but no additional punctuation. Follow the convention
  that your project uses. Filenames' extension must be `.js`."
- **Airbnb** — grep of `README.md` for `suffix`, case-insensitive: **0 matches**. Its rule is about
  exports, not roles: "[23.6] A base filename should exactly match the name of its default export."

**No official TypeScript or JavaScript style guide prescribes role suffixes** — the same null
`file-naming-for-glob-routing.md` §6 records, reached independently here.

Angular's reversal was corroborated independently, from published npm tarballs of
`@schematics/angular` — worth recording because it is the cleanest evidence that a role suffix can
be _withdrawn_ by its own vendor:

| version | service template path                                                               | `type` in `schema.json`   |
| ------- | ----------------------------------------------------------------------------------- | ------------------------- |
| 19.2.9  | `…/service/files/__name@dasherize@if-flat__/__name@dasherize__.service.ts.template` | **absent**                |
| 20.3.9  | `…/service/files/__name@dasherize__.__type@dasherize__.ts.template`                 | present, **no `default`** |
| 21.2.9  | `…/service/files/__name@dasherize__.__type@dasherize__.ts.template`                 | present, **no `default`** |

> `"type": {"type": "string", "description": "Append a custom type to the service's filename. For
example, if you set the type to \`service\`, the file will be named \`my-service.service.ts\`."}`

With no default, `ng g service foo` emits `foo.ts`.

### 3.12 The closed list of TypeScript suffixes that are actually rules

| tool                          | option                                             | default                                             | role suffix configurable?                          |
| ----------------------------- | -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `@nestjs/swagger` plugin      | `dtoFileNameSuffix`, `controllerFileNameSuffix`    | `['.dto.ts','.entity.ts']`, `['.controller.ts']`    | **yes — and load-bearing**                         |
| `@nestjs/graphql` plugin      | `typeFileNameSuffix`                               | `['.input.ts','.args.ts','.entity.ts','.model.ts']` | **yes — and load-bearing**                         |
| Angular CLI service/component | `type`                                             | **none** (v20+)                                     | yes                                                |
| Nx `@nx/angular:component`    | `type`                                             | inherited                                           | yes                                                |
| `@nestjs/schematics` service  | only `specFileSuffix` (`spec`)                     | —                                                   | **no** — `.service` hardcoded in the template name |
| `@ngrx/schematics` effect     | none                                               | —                                                   | **no** — `.effects` hardcoded                      |
| Nx `@nx/nest:service`         | `language`, `path`, `skipFormat`, `unitTestRunner` | —                                                   | **no**                                             |

**The single sharpest finding in §3: in TypeScript, a role suffix becomes a _rule_ only when some
tool does `filename.includes('.suffix.ts')`.** That is true of `.dto.ts`, `.entity.ts`, `.input.ts`,
`.args.ts`, `.model.ts` and `.controller.ts` — and of **nothing else measured here**. `.service.ts`
and `.effects.ts` are generator momentum: 35M and 1.2M monthly installs writing the same template
filename, with no document anywhere asking anyone to. For calibration, the dotted suffixes genuinely
reserved by tooling are `.d.ts`; Jest `'**/?(*.)+(spec|test).?([mc])[jt]s?(x)'`; Vitest
`'**/*.{bench,benchmark}.?(c|m)[jt]s?(x)'` and `'**/*.{test,spec}-d.?(c|m)[jt]s?(x)'`; Storybook
`'**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))'`; Next.js `.module.css`. **None collides with
`.pure.ts`, `.fn.ts`, `.shell.ts` or `.lib.ts`.**

### 3.13 Token-count table

Upper bounds, quantized (GCD 32), including bare, hyphenated and camelCase forms. Read the
right-hand column, not the middle one.

| token          | `total_count` | dotted in top 100                                              | reading                                          |
| -------------- | ------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `service`      | 8,060,928     | 0                                                              | framework default, not normative                 |
| `controller`   | 2,949,120     | —                                                              | framework default **and** tool-consumed          |
| `dto`          | 2,113,536     | —                                                              | **normative in official docs** (reference point) |
| `util`         | 2,383,872     | 0 (75/100 bare)                                                | bare convention                                  |
| `utils`        | 2,088,960     | 0 (**99/100 bare**)                                            | bare convention                                  |
| `action`       | 1,662,976     | 0                                                              | contract is a directive                          |
| `repository`   | 1,017,856     | —                                                              | baseline                                         |
| `actions`      | 727,040       | 0 (97/100 bare)                                                | NgRx generator only                              |
| `handler`      | 735,232       | —                                                              | docs-exemplified only                            |
| `command`      | 684,032       | 0 (76/100 bare)                                                | one generator                                    |
| `lib`          | 264,192       | 0 (80/100 bare)                                                | bare convention                                  |
| `workflow`     | 244,736       | 0 across 4,575 Temporal paths                                  | **not normative**                                |
| `usecase`      | 232,448       | —                                                              | community template                               |
| `calc`         | 208,896       | 0                                                              | vanishingly rare                                 |
| `effect`       | 183,808       | 0 in Effect-TS's 3,952 paths                                   | polluted token                                   |
| `use-case`     | 163,328       | —                                                              | community template                               |
| `shell`        | 82,944        | 1/100                                                          | vanishingly rare                                 |
| `effects`      | 75,648        | —                                                              | NgRx framework default (plural)                  |
| `orchestrator` | 74,112        | 0 (94/100 bare)                                                | vanishingly rare                                 |
| `calculation`  | 42,240        | 0                                                              | vanishingly rare                                 |
| `fn`           | 41,344        | 0                                                              | vanishingly rare                                 |
| `saga`         | 40,704        | 0 in redux-saga's 527 paths                                    | NestJS CQRS docs prose                           |
| `workflows`    | 35,968        | —                                                              | scaffold prose                                   |
| `sagas`        | 10,144        | —                                                              | vanishingly rare                                 |
| `pure`         | **15,840**    | 36/39 from **one 66-star repo**, meaning a tree-shaking barrel | vanishingly rare, and the wrong meaning          |

---

## 4. Is there an established suffix for pure code?

**No. Not one of the five candidates is established as a filename suffix, and `*.pure.ts` is the
rarest of them — but the _concept_ is thoroughly established and tool-enforced in JavaScript under
exactly the word "pure", just not in a filename.** That combination is the honest answer, and it
argues for keeping `*.pure.ts` on grounds of fit rather than precedent.

### 4.1 The five candidates, measured

Method and caveats as §3.1; counts are token upper bounds.

| candidate                | token count                      | dotted use                                                                                | verdict                                                                              |
| ------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.pure.ts`               | **15,840** — the lowest measured | 36 of 39 dotted hits from a **single 66-star repo**, where it means a tree-shaking barrel | **no precedent as a purity marker**, and the one real user means the _bundler_ sense |
| `.calc.ts`               | 208,896                          | **0/100**                                                                                 | no precedent                                                                         |
| `.calculation.ts`        | 42,240                           | **0/100**                                                                                 | no precedent                                                                         |
| `.fn.ts`                 | 41,344                           | **0/100**                                                                                 | no precedent                                                                         |
| `.lib.ts`                | 264,192                          | 0/100; 80/100 sampled were the _bare_ `lib.ts`                                            | a bare filename, not a suffix; and "lib" says nothing about purity                   |
| `.util.ts` / `.utils.ts` | 2,383,872 / 2,088,960            | 0/100; **99/100** sampled were the bare `utils.ts`                                        | overwhelmingly a bare filename, and see §4.3                                         |

Two positives worth recording, because they are the only ones:

- **No tooling collision for `.pure.ts`.** The dotted suffixes genuinely reserved by tooling are
  `.d.ts`, Jest's `spec|test`, Vitest's `bench|benchmark` and `test|spec-d`, Storybook's `stories`,
  and Next.js's `.module.css` (§3.12). None collides with `.pure.ts`, `.fn.ts`, `.shell.ts` or
  `.lib.ts`.
- **`.calc` / `.calculation` would be the _literature-aligned_ names**, since Normand's category is
  "calculation" and he explicitly rejects "pure function" as a name (§1.1). But both are at zero
  dotted usage, and `calculation` is 12 characters. If precedent is the criterion, neither wins; if
  literature alignment is the criterion, `.calc.ts` beats `.pure.ts`, and the owner has already
  accepted `.pure.ts`, which is the more legible of the two.

### 4.2 The established way to declare purity in JavaScript is not a filename — it is `package.json` and a comment

This is the most useful finding in §4, and it cuts both ways: there _is_ a well-established,
tool-enforced, glob-addressed purity declaration in the JavaScript ecosystem, and it is not a
suffix.

**webpack, `package.json#sideEffects` — normative for the bundler.**
<https://webpack.js.org/guides/tree-shaking/> (source
`webpack/webpack.js.org:src/content/guides/tree-shaking.mdx`):

> The new webpack 4 release expands on this capability with a way to provide hints to the compiler
> via the `"sideEffects"` `package.json` property to denote **which files in your project are
> "pure"** and therefore safe to prune if unused.

> A "side effect" is defined as code that performs a special behavior when imported, other than
> exposing one or more exports. An example of this are polyfills, which affect the global scope and
> usually do not provide an export.

> ```json
> { "name": "your-project", "sideEffects": ["./src/some-side-effectful-file.js", "*.css"] }
> ```

> The array accepts simple glob patterns to the relevant files. It uses
> [glob-to-regexp](https://github.com/fitzgen/glob-to-regexp) under the hood (Supports: `*`, `**`,
> `{a,b}`, `[a-z]`). Patterns like `*.css`, which do not include a `/`, will be treated like
> `**/*.css`.

Three things follow. **(a)** The word "pure" is already the ecosystem's word for exactly this, at
exactly file granularity — so `*.pure.ts` is _semantically_ well-precedented even where it is
lexically unprecedented as a suffix. **(b)** The declaration is **inverted**: you enumerate the
_side-effectful_ files, and everything else is pure by default. **(c)** It is **glob-based**, which
means the suffix vocabulary can _drive_ it — `"sideEffects": ["**/*.adapter.ts"]` is a real,
mechanically-checked payoff from the vocabulary that has nothing to do with governance documents.

The collision hazard has to be named, because it is subtle: webpack's "side effect" is an
**import-time** effect only ("code that performs a special behavior **when imported**"). A file
full of impure _functions_ that does nothing at import time is `sideEffects: false` to webpack and
emphatically not `*.pure.ts`. The two senses of "pure" differ in strength, and a bundler-literate
reader will import the weaker one.

**Rollup, `@__PURE__` — normative, at call granularity.**
<https://rollupjs.org/configuration-options/#treeshake-annotations>:

> Comments containing `@__PURE__` or `#__PURE__` mark a specific function call or constructor
> invocation as side effect free. That means that Rollup will tree-shake i.e. remove the call unless
> the return value is used in some code that is not tree-shaken. These annotations need to
> immediately precede the call invocation to take effect.

> Such an annotation is considered _valid_ if it directly precedes a function call or constructor
> invocation and is only separated from the callee by white-space or comments.

and `treeshake.moduleSideEffects` takes
`boolean | "no-external" | string[] | (id: string, external: boolean) => boolean`, with:

> Rollup itself does not read a package's `sideEffects` field. When packages are resolved with
> [@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve),
> the plugin can read `sideEffects` from `package.json` […]

So the ecosystem has purity declarations at **three** granularities — call (`@__PURE__`), module
(`treeshake.moduleSideEffects`), package (`package.json#sideEffects`) — and **none of them is a
filename**. That is the honest shape of the precedent: the _concept_ is thoroughly established and
tool-enforced; the _filename encoding_ of it is not.

### 4.3 `utils`: the published criticism, and the counterweight

The owner proposed `utils.ts` and was pushed back on. The counter-evidence is citable, and the
strongest source is not a book — it is **an official language documentation page whose section is
literally titled "Bad package names".**

**Go, `go.dev/blog/package-names` — the official Go blog, §"Bad package names".** This is the
clearest published criticism of the name, and it gives four distinct reasons:

> **Bad package names**
>
> Bad package names make code harder to navigate and maintain. Here are some guidelines for
> recognizing and fixing bad names.
>
> **Avoid meaningless package names.** Packages named `util`, `common`, or `misc` provide clients
> with no sense of what the package contains. This makes it harder for clients to use the package and
> makes it harder for maintainers to keep the package focused. Over time, they accumulate
> dependencies that can make compilation significantly and unnecessarily slower, especially in large
> programs. And since such package names are generic, they are more likely to collide with other
> packages imported by client code, forcing clients to invent names to distinguish them.
>
> **Break up generic packages.** To fix such packages, look for types and functions with common name
> elements and pull them into their own package.

with the worked refactor `util.NewStringSet(…)` / `util.SortStringSet(…)` → `stringset.New(…)` /
`stringset.Sort(…)` → `stringset.Set` with a method. Four reasons, each independently checkable:
**(1)** no signal about contents, **(2)** no force keeping the module focused, **(3)** dependency
accumulation, **(4)** name collisions.

**Google's Go Style Guide — normative, and it names the words.**
<https://google.github.io/styleguide/go/decisions#package-names>:

> Avoid uninformative package names like `util`, `utility`, `common`, `helper`, `model`,
> `testhelper`, and so on that would tempt users of the package to rename it when importing.

and it maintains a dedicated section, <https://google.github.io/styleguide/go/best-practices#util-packages>:

> **Util packages**
>
> Go package names should be related to what the package provides. Naming a package just `util`,
> `helper`, `common` or similar is usually a poor choice (it can be used as _part_ of the name
> though). Uninformative names make the code harder to read, and if used too broadly they are liable
> to cause needless import conflicts.
>
> Instead, consider what the callsite will look like.

**Kotlin's coding conventions close the gap the two Go sources leave — this one is about _filenames_.**
JetBrains' official conventions, §"Source file names"
(<https://kotlinlang.org/docs/coding-conventions.html>, source
`JetBrains/kotlin-web-site:docs/topics/coding-conventions.md`):

> The name of the file should describe what the code in the file does. Therefore, you should avoid
> using meaningless words such as `Util` in file names.

and the same guide, §"Choosing good names":

> The names should make it clear what the purpose of the entity is, so it's best to avoid using
> meaningless words (`Manager`, `Wrapper`) in names.

**This is the strongest single citation for the owner's question**, because it is (a) normative in an
official language style guide, (b) about a **file name**, not a package or a class, and (c) it gives
the reason in the same sentence — the filename is supposed to _describe what the code does_, and
`Util` does not. A suffix vocabulary is a filename convention, so this is the closest published rule
to the thing being decided.

**Two honest caveats the owner is entitled to.** First, **the two Go sources are about _package_
names, not filenames** — Go has no filename-level equivalent, and a `utils.ts` inside a well-named
module does not have Go's import-collision problem at all. Two of the four reasons (dependency accumulation, name
collisions) are weakened or void in a TypeScript file. The two that survive intact are the two that
matter here: **no signal about contents, and no force keeping the module focused** — which is exactly
the objection to using it as a _governed role_ in a suffix vocabulary, because the governance document
behind `**/*.utils.ts` would have nothing specific to say.

Second, **the generality argument is not available**, and it is worth knowing that it points the
other way. Ousterhout's _A Philosophy of Software Design_ (2nd ed., July 2021, ISBN
978-1-7321022-2-4; ch. 6 published as an official extract from his own Stanford page,
<https://web.stanford.edu/~ouster/cgi-bin/aposd2ndEdExtract.pdf>) is titled **"General-Purpose Modules
are Deeper"** and argues the opposite of "generic is bad" (p. 39):

> I have found over and over that specialization leads to complexity; I now think that
> over-specialization may be the single greatest cause of complexity in software. Conversely, code
> that is more general-purpose is simpler, cleaner, and easier to understand.

> In my experience, the sweet spot is to implement new modules in a _somewhat general-purpose_
> fashion. The phrase "somewhat general-purpose" means that the module's functionality should reflect
> your current needs, but its interface should not. (p. 40)

So the criticism of `utils` is **about cohesion, not about generality**. Ousterhout is not a witness
against it. A **"Vague Name"** red flag is widely attributed to the book's ch. 14; a sub-probe of the 1st edition
places it at **p. 123**, and reports a ch. 9 line — _"if the pieces are unrelated, they are probably
better off apart"_ — that is directly on point. **Neither was re-verified here**: the official extract
covers ch. 6 only, so both the page number and the ch. 9 wording are **UNVERIFIED**. The same probe
reports, grep-verified against the 1st edition, that **Ousterhout never writes "util" or "misc" at
all** — which is consistent with the paragraph above and is the reason he must not be enlisted.

Three further provenance results, stated so nobody re-derives them:

- **Kevlin Henney's** frequently-quoted line on util/utils/utility packages is on his own X account.
  X returns **HTTP 402 Payment Required** to a fetch. The tweet is real; its text is **UNVERIFIED**.
- **Coincidental cohesion** — the precise technical name for a junk-drawer module, and the formal
  version of the whole argument — is reported at **Yourdon & Constantine, _Structured Design_, §7.1.1
  p. 98**. The 1974 IBM Systems Journal antecedent (Stevens/Myers/Constantine, 13(2)) is paywalled at
  ACM and IEEE. **The location is now known; the verbatim text is still UNVERIFIED**, so the term is
  used here without a quotation attached.
- **_Clean Code_ does not criticise `Utils`**, and a sub-probe reports that its own Listing 3-1 is
  named **`HtmlUtil.java`**. **UNVERIFIED**, but worth knowing before anyone cites Martin for this:
  ch. 2's actual targets are `Manager`, `Processor`, `Data` and `Info`, not `Utils`. There is also
  **no Fowler bliki entry** and **no _97 Things_ essay** on the subject.

**The counterweight, which is large and must be stated.** `lib/utils.ts` is a **framework default in
shadcn/ui**, and not merely in an example — it is a **key in the CLI's config schema**. From the
official manual-installation docs (`shadcn-ui/ui:apps/v4/content/docs/installation/manual.mdx`):

> ### Add a cn helper
>
> ```ts title="lib/utils.ts"
> import { clsx, type ClassValue } from 'clsx';
> import { twMerge } from 'tailwind-merge';
>
> export function cn(...inputs: ClassValue[]) {
>   return twMerge(clsx(inputs));
> }
> ```

and `components.json`:

> ```json title="components.json"
> "aliases": {
>   "components": "@/components",
>   "utils": "@/lib/utils",
>   "ui": "@/components/ui",
>   "lib": "@/lib",
>   "hooks": "@/hooks"
> }
> ```

`utils` is not merely an example — **it is a _required_ key in shadcn/ui's published JSON Schema.**
Measured against <https://ui.shadcn.com/schema.json> (HTTP 200), walking the schema for `required`
arrays containing `utils`:

```
/properties/aliases -> required: ["utils", "components"]
/properties/aliases -> properties: utils, components, ui, lib, hooks
```

**Two of five alias keys are mandatory, and `utils` is one of them.** That is the exact kind of
load-bearing status `file-naming-for-glob-routing.md` §1 reserves for real conventions — a tool
fails without it.

**And a second framework counterweight: Nuxt documents `utils/` as a scanned directory.**
`nuxt/nuxt:docs/2.directory-structure/1.app/1.utils.md`:

> title: 'utils'
> description: Use the utils/ directory to auto-import your utility functions throughout your
> application.

> The main purpose of the `app/utils/` directory is to allow a semantic distinction between your Vue
> composables and other auto-imported utility functions.

So in Nuxt, `utils/` is a **framework-scanned auto-import root** — the directory name is the
contract. (Its own first example is `Intl.NumberFormat` and its second is
`arr[Math.floor(Math.random() * arr.length)]`, which would fail §5.4's purity config on sight — an
incidental illustration of why "utilities" carries no purity claim.) Combined with the measurement in §4.1 (**99 of 100** sampled `utils` hits are the bare
`utils.ts`), the honest summary is:

**`utils.ts` is the single most established filename in this entire survey after `index.ts`, and the
criticism of it is real, official, and about the right thing.** Those are both true. What settles it
for _this_ repo is neither: a suffix vocabulary needs each suffix to address exactly one governance
document with something specific to say, and "utilities" is defined by having no specific content. It
fails the vocabulary's own test, not a taste test.

## 5. Purity, precisely: which built-ins `*.pure.ts` may permit

The owner wants `*.pure.ts` to permit "some native JavaScript APIs like `Date` or `Math`". That is
resolvable exactly, from three independent normative sources that all draw the same line, plus the
ECMAScript specification text for each member in question.

### 5.1 Three independent normative definitions, drawing one line

**(a) The origin of the term — Strachey, 1967.** Christopher Strachey, "Fundamental Concepts in
Programming Languages", _Higher-Order and Symbolic Computation_ **13**:11–49 (2000), §3.2.1
"Values", p. 19 — the paper is the 1967 Copenhagen summer-school lecture notes
(<http://fpl.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf>):

> One of the most useful properties of expressions is that called by Quine [4] referential
> transparency. In essence this means that if we wish to find the value of an expression which
> contains a sub-expression, the only thing we need to know about the sub-expression is its value.
> Any other features of the sub-expression, such as its internal structure, the number and nature
> of its components, the order in which they are evaluated or the colour of the ink in which they
> are written, are irrelevant to the value of the main expression.

And, on p. 20 §3.3.1, the consequence that makes the property _checkable_:

> We tend to assume automatically that the symbol x in an expression such as 3x² + 2x + 17 stands
> for the same thing (or has the same value) on each occasion it occurs. This is the most important
> consequence of referential transparency […]

**Normative** for the term itself. The operational form — _the same expression must denote the same
value on every occurrence_ — is the test everything below refines.

**(b) A compiler's two-tier version — GCC function attributes.** This is the most useful source for
the owner's exact question, because GCC splits purity into two grades and the split is precisely
"may read ambient state" versus "may not".
<https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html> (GCC 15 online docs), `const`:

> Calls to functions whose return value is not affected by changes to the observable state of the
> program and that have no observable effects on such state other than to return a value may lend
> themselves to optimizations such as common subexpression elimination. Declaring such functions
> with the `const` attribute allows GCC to avoid emitting some calls in repeated invocations of the
> function with the same argument values.

> The `const` attribute prohibits a function from reading objects that affect its return value
> between successive invocations. However, functions declared with the attribute can safely read
> objects that do not change their return value, such as non-volatile constants.

> The `const` attribute imposes greater restrictions on a function's definition than the similar
> `pure` attribute.

and `pure`:

> Calls to functions that have no observable effects on the state of the program other than to
> return a value may lend themselves to optimizations such as common subexpression elimination.

> The `pure` attribute prohibits a function from modifying the state of the program that is
> observable by means other than inspecting the function's return value. However, functions
> declared with the `pure` attribute can safely read any non-volatile objects […]

> Some common examples of pure functions are `strlen` or `memcmp`. Interesting non-pure functions
> are functions with infinite loops or those depending on volatile memory or other system resource,
> that may change between consecutive calls (such as the standard C `feof` function in a
> multithreading environment).

**Normative** (the compiler miscompiles code that lies to it). Note the last sentence: a function
"depending on … other system resource, that may change between consecutive calls" is **not even
`pure`** in GCC's sense. A clock is exactly that.

**(c) A three-tier version that names the two JavaScript cases by name — PostgreSQL.**
<https://www.postgresql.org/docs/current/xfunc-volatility.html>, §36.7 "Function Volatility
Categories" (PostgreSQL 18):

> A `VOLATILE` function can do anything, including modifying the database. It can return different
> results on successive calls with the same arguments. […]
>
> A `STABLE` function cannot modify the database and is guaranteed to return the same results given
> the same arguments for all rows within a single statement. […]
>
> An `IMMUTABLE` function cannot modify the database and is guaranteed to return the same results
> given the same arguments forever.

and the two sentences that settle the owner's question:

> Any function with side-effects must be labeled `VOLATILE`, so that calls to it cannot be
> optimized away. **Even a function with no side-effects needs to be labeled `VOLATILE` if its
> value can change within a single query; some examples are `random()`, `currval()`,
> `timeofday()`.**

> Another important example is that the `current_timestamp` family of functions qualify as
> `STABLE`, since their values do not change within a transaction.

**Normative** (a mislabel produces stale plan results, which the section spells out). Two things
this buys:

1. **The disqualifying property is "the result is not a function of the arguments", not "it has a
   side effect."** PostgreSQL says this explicitly — _"Even a function with no side-effects needs
   to be labeled `VOLATILE`"_. This is the answer to the brief's question about why `Math.random()`
   is impure: the nondeterminism argument is sufficient on its own and the side-effect argument is
   not needed.
2. **`Date.now()` in JavaScript is `VOLATILE`, not `STABLE`.** PostgreSQL's `current_timestamp` is
   `STABLE` only because it is frozen for a transaction; JavaScript has no such freeze, so
   `Date.now()` is the analogue of PostgreSQL's `clock_timestamp()`, not of `now()`. The analogy
   breaks in a way that puts the clock and the PRNG in the _same_ bucket.

**(d) The plain-language version, and the closest match to what the owner described.** Cross-ref
§1.1: Normand's actions/calculations/data, whose test — _"anything that depend on when they're
called, or how many times they're called"_ — is the same test as PostgreSQL's, phrased for people.

### 5.2 The ECMAScript specification on each member in question

All section numbers are from the living specification (<https://tc39.es/ecma262/>, titled
"ECMAScript® 2027 Language Specification" on the day probed); numbering shifts between editions,
so the section titles are given too.

**`Math.floor` — §21.3.2.16, pure.**

> This function returns the greatest (closest to +∞) integral Number value that is not greater than
> `x`. If `x` is already an integral Number, the result is `x`.
>
> 1. Let `n` be ? ToNumber(`x`). […]

The algorithm reads its argument and nothing else. Same shape for **`Math.abs` §21.3.2.1** ("Let
`n` be ? ToNumber(`x`)") and **`Math.max` §21.3.2.25** ("Given zero or more arguments, this
function calls ToNumber on each of the arguments and returns the largest of the resulting values").
All three are GCC-`const` / PostgreSQL-`IMMUTABLE`. **Admissible.**

**`Math.pow` — §21.3.2.27, deterministic within an engine, not specified across engines.** This is
the one real subtlety, and it is not the one the brief expected. §21.3.2.27 is three lines and
delegates:

> 3. Return Number::exponentiate(`base`, `exponent`).

and Number::exponentiate, §6.1.6.1.3, ends:

> Return an **implementation-approximated** Number value representing the result of raising
> ℝ(`base`) to the ℝ(`exponent`) power.

where §4.4.1 defines the term:

> an implementation-approximated facility is defined in whole or in part by an external source but
> has a recommended, ideal behaviour in this specification

reinforced by the Note on §21.3.2 "Function Properties of the Math Object":

> The behaviour of the functions `acos`, `acosh`, `asin`, `asinh`, `atan`, `atanh`, `atan2`, `cbrt`,
> `cos`, `cosh`, `exp`, `expm1`, `hypot`, `log`, `log1p`, `log2`, `log10`, `pow`, `random`, `sin`,
> `sinh`, `tan`, and `tanh` **is not precisely specified here** except to require specific results
> for certain argument values that represent boundary cases of interest. […] some latitude is
> allowed in the choice of approximation algorithms.

So `Math.pow` (and `sqrt`, `log`, the trig family) is **referentially transparent within one
engine** — the same call gives the same answer every time — but **not reproducible across engines**.
For this repo that distinction is live, because `docs/vision/architecture.md` §4 declares the
fixture corpus a specification against which reimplementations are verified: a fixture whose
expected output depends on `Math.pow` could pass on Node and fail on another runtime. Verdict:
**admissible in `*.pure.ts`, but not admissible in anything whose output is a fixture expectation.**
`Math.floor`/`abs`/`max`/`min`/`sign`/`trunc`/`round` are not on the imprecise list and carry no
such caveat.

**`Math.random` — §21.3.2.28, impure, and for two reasons.**

> This function returns a Number value with positive sign, greater than or equal to +0𝔽 but
> strictly less than 1𝔽, chosen randomly or pseudo randomly with approximately uniform distribution
> over that range, using an implementation-defined algorithm or strategy.
>
> Each `Math.random` function created for distinct realms must produce a distinct sequence of values
> from successive calls.

The first paragraph gives nondeterminism; the second sentence is the specification _requiring
hidden mutable state_ — "a distinct sequence of values from successive calls" is only satisfiable by
a generator that advances. So `Math.random` fails both of GCC's tests: its value is affected by
state, and calling it changes state. **The nondeterminism argument alone is sufficient and is the
one to state**, per §5.1(c). **Excluded.**

**`Date.now()` — §21.4.3.1, impure: a clock read.** The entire section:

> This function returns the time value designating the UTC date and time of the occurrence of the
> call to it.

"of the occurrence of the call to it" is the spec saying the result is a function of _when_, not of
the arguments. **Excluded.**

**`new Date()` with no arguments — §21.4.2.1, impure: the same clock read.** From the Date
constructor's steps:

> 3. Let `numberOfArgs` be the number of elements in `values`.
> 4. If `numberOfArgs` = 0, then
>    a. Let `dv` be the time value (UTC) identifying the current time.

**Excluded.** And the branch structure is the reason the ESLint selector in §5.4 can be exact:
**zero arguments is the entire condition** for the clock read.

**`new Date(1234567890)` — §21.4.2.1, pure.** The `numberOfArgs` = 1 branch does
`ToPrimitive` → `ToNumber` → `TimeClip`, with no clock involved; the ≥ 2 branch does
`MakeDay`/`MakeTime`/`TimeClip(UTC(finalDate))`. **Admissible** — with one caveat below on
`new Date(string)`.

**Arithmetic on an already-obtained instant — pure only through the `getUTC*` accessors.** This is
the finding the brief did not anticipate, and it is sharper than "argument-bearing `Date` is fine".
Compare the two accessors, verbatim:

> **§21.4.4.14 `Date.prototype.getUTCFullYear ( )`** — 1. Let `dateObj` be the **this** value. 2. Perform ? RequireInternalSlot(`dateObj`, [[DateValue]]). 3. Let `tv` be
> `dateObj`.[[DateValue]]. 4. If `tv` is NaN, return NaN. 5. Return 𝔽(YearFromTime(`tv`)).

> **§21.4.4.4 `Date.prototype.getFullYear ( )`** — […] 5. Return
> 𝔽(YearFromTime(**LocalTime**(`tv`))).

and `LocalTime`, §21.4.1.25, step 1:

> 1. Let `systemTimeZoneIdentifier` be **SystemTimeZoneIdentifier()**.

So `getFullYear`, `getMonth`, `getDate`, `getDay`, `getHours`, `getMinutes`, `getSeconds`,
`getMilliseconds`, `getTimezoneOffset`, `toString`, `toDateString`, `toTimeString` and the
`toLocale*` family all read an **ambient host setting** and are impure — `new Date(0).getFullYear()`
returns a different number in Auckland than in Reykjavík. The `getUTC*` family and `getTime()`
read only `[[DateValue]]` and are pure. Two consequences:

- **`new Date(string)` is admissible but discouraged**: §21.4.2.1 routes it to "the result of
  parsing `v` as a date, in exactly the same manner as for the `parse` method (21.4.3.2)", and
  `Date.parse` is famously permitted to fall back to implementation-specific heuristics for
  non-ISO input. Deterministic for full ISO-8601 with an explicit offset; unspecified otherwise.
- **A `Date` instance is a mutable object.** `[[DateValue]]` is writable through the `setUTC*`
  setters, so passing a `Date` between functions passes a mutable reference. Passing **epoch
  milliseconds as a `number`** is strictly stronger, and makes `*.pure.ts` need no `Date` at all
  beyond formatting.

**Also excluded, for completeness, since they are the same category and a deny-list must name
them:** `performance.now()`, `Date.prototype.getTime` is fine but `Date.UTC` is pure,
`crypto.randomUUID()` / `crypto.getRandomValues()`, `process.hrtime()`, `Intl.*` (locale reads),
and the forthcoming **`Temporal.Now`** — whose own proposal documentation
(<https://github.com/tc39/proposal-temporal/blob/main/docs/now.md>) states the property outright:

> **NOTE:** Because these methods return the current time, the return value will likely be
> different every time they are called.

`Temporal.Now.instant()`, `Temporal.Now.zonedDateTimeISO()` and `Temporal.Now.timeZoneId()` are all
ambient reads. `Temporal` is **not** a global in Node v26.5.0 (`typeof globalThis.Temporal ===
"undefined"` — **[executed]**), so it is a future problem, but it is the concrete illustration of
why a deny-list is structurally weak (§5.5).

### 5.3 The rule, in one sentence

> **A member is admissible in `*.pure.ts` if and only if its result is a function of its arguments
> alone: it may read nothing that the caller did not pass in, and it may change nothing that
> outlives the call.**

The whole of `Math` satisfies this except `random`, because every other `Math` function reads only
its arguments. `Date` satisfies it only when an instant is supplied as an argument _and_ only
through the UTC accessors, because the zero-argument constructor reads the clock and the local
accessors read the host time zone. Nothing about "side effects" is needed to reach either verdict —
determinism relative to the argument list decides both, which is why the one-sentence rule is
phrased that way.

### 5.4 Can ESLint express exactly that with core rules only? Yes — **[executed]**

All of §5.4 and §5.5 is **[executed]** against ESLint **v10.9.1** with `typescript-eslint`
**8.68.0** and typescript **6.0.3** — the versions already in this repo's `devDependencies`, so the
dependency cost is **zero**.

The three core rules license it. `no-restricted-properties`
(<https://eslint.org/docs/latest/rules/no-restricted-properties>):

> This rule looks for accessing a given property key on a given object name, either when reading the
> property's value or invoking it as a function. […] **This rule applies to both properties accessed
> by dot notation and destructuring.**

> If the object name is omitted, the property is disallowed for all objects

`no-restricted-syntax` (<https://eslint.org/docs/latest/rules/no-restricted-syntax>) — and note the
shipped example is _itself_ an argument-count selector, which is exactly the shape needed here:

> You can also specify [AST selectors](../extend/selectors) to restrict, allowing much more precise
> control over syntax patterns.

> `{ "selector": "CallExpression[callee.name='setTimeout'][arguments.length!=2]", "message":
"setTimeout must always be invoked with two arguments." }`

and the selector grammar (<https://eslint.org/docs/latest/extend/selectors>) confirms the pieces:

> - attribute value: `[attr="foo"]` or `[attr=123]`
> - attribute conditions: `[attr!="foo"]`, `[attr>2]`, `[attr<3]`, `[attr>=2]`, or `[attr<=3]`
> - nested attribute: `[attr.level2="foo"]`

**The minimal config the brief asked for**, banning `Math.random`, `Date.now` and zero-argument
`new Date()` while permitting the rest of `Math` and argument-bearing `Date`:

```js
// eslint.config.mjs
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
  {
    files: ['**/*.pure.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: '*.pure.ts: nondeterministic — pass the value in.' },
        { object: 'Date', property: 'now', message: '*.pure.ts: reads the clock — pass the instant in.' },
        { object: 'performance', property: 'now', message: '*.pure.ts: reads a clock.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: '*.pure.ts: new Date() reads the clock — new Date(ms) is fine.',
        },
      ],
    },
  },
];
```

Against a fixture holding, in order, `Math.floor` / `Math.max` / `Math.abs` / `Math.pow` /
`Math.random` / `Date.now` / `new Date()` / `new Date(1234567890)` /
`new Date("2020-01-01T00:00:00Z")` / `new Date(1234567890).getUTCFullYear()`:

```
src/a.pure.ts
  5:19  error  'Math.random' is restricted from being used. *.pure.ts: nondeterministic — pass the value in  no-restricted-properties
  6:19  error  'Date.now' is restricted from being used. *.pure.ts: reads the clock — pass the instant in    no-restricted-properties
  7:19  error  *.pure.ts: new Date() reads the clock — new Date(ms) is fine                                  no-restricted-syntax

✖ 3 problems (3 errors, 0 warnings)
```

That output is from **the config block above, run byte-for-byte as printed** — not a tidied
paraphrase of a different run.

**Exactly three errors, on exactly the three intended lines.** No false positive on `Math.pow`,
`new Date(ms)`, `new Date(isoString)` or `.getUTCFullYear()`. A sibling `src/c.ts` with the same
offending contents produced **zero** errors, confirming the `files:` scoping is what gates the rule
— which is the whole premise of the suffix vocabulary.

**Adding the local-time-accessor ban** (§5.2), using the documented object-less form:

```js
"no-restricted-properties": [
  "error",
  ...["getFullYear","getMonth","getDate","getDay","getHours","getMinutes","getSeconds",
     "getMilliseconds","getTimezoneOffset","toLocaleString","toLocaleDateString","toLocaleTimeString"]
    .map((property) => ({ property, message: "*.pure.ts: reads the host time zone — use the getUTC* accessor." })),
]
```

**[executed]** against `getUTCFullYear` / `getFullYear` / `getTimezoneOffset` / `toLocaleString` /
`new Date(0).getUTCHours()` / `new Date(0).getHours()` / `getTime()`: flagged `getFullYear`,
`getTimezoneOffset`, `toLocaleString`, `getHours`; permitted `getUTCFullYear`, `getUTCHours`,
`getTime`. Correct on all seven.

**But the object-less form over-fires, measured.** Against
`[1,2].toString()` / `(12345).toLocaleString()` / `{ getMonth: () => 1 }.getMonth()` /
`"abc".toString()` with `toString` included in the list, **all four were flagged**. Three of the
four are false positives (`Array#toString`, `String#toString`, and a domain object's own
`getMonth`); the fourth, `Number#toLocaleString`, is a **true** positive — it really does read the
locale. So: **omit `toString`/`toDateString`/`toTimeString` from the list** (they collide with
`Object.prototype`), **keep the `toLocale*` family** (locale-reading on every built-in that has
them), and accept that `getMonth`-shaped names can collide with domain objects.

### 5.5 What the selectors cannot catch — measured, not guessed

A second fixture probed thirteen evasions. Against the **minimal** config above, **five were caught
and eight were not**. Against a **hardened** config, **ten are flagged directly**, two more
(`r()`, `random()`) are not flagged at the call site but the alias or destructure that created them
_is_ flagged in the same file, and **exactly one — an import — is not catchable at all**. The hardened
config needed **seven** extra selectors: six of them, plus a seventh added only after the measured run
showed `Reflect.construct(Date, [])` slipping through all six. The additions:

```js
"no-restricted-syntax": [
  "error",
  { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: "bare new Date()" },
  { selector: "NewExpression[callee.name='Date'] > SpreadElement",     message: "spread into Date()" },
  { selector: "MemberExpression[object.name='Math'][computed=true]",   message: "computed Math access" },
  { selector: "MemberExpression[object.name='globalThis']",            message: "globalThis" },
  { selector: "VariableDeclarator[init.name='Math']",                  message: "aliasing Math" },
  { selector: "VariableDeclarator[init.name='Date']",                  message: "aliasing Date" },
  { selector: "CallExpression[callee.object.name='Reflect'][callee.property.name='construct']", message: "Reflect.construct" },
],
```

| evasion                                           | minimal config                                                                                                                     | hardened config                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `const r = Math.random;`                          | **caught** (property read)                                                                                                         | caught                                |
| `r()` — the call through the alias                | not caught                                                                                                                         | not caught, but the alias is          |
| `const { random } = Math;`                        | **caught** — the documented destructuring case                                                                                     | caught                                |
| `random()`                                        | not caught                                                                                                                         | not caught, but the destructure is    |
| `Math["random"]()`                                | **caught** — _undocumented_: the docs say "dot notation and destructuring" and never mention computed access with a string literal | caught twice                          |
| `globalThis.Math.random()`                        | not caught                                                                                                                         | **caught**                            |
| `const D = Date; D.now()`                         | not caught                                                                                                                         | **caught** at the alias               |
| `Reflect.construct(Date, [])`                     | not caught                                                                                                                         | **caught**                            |
| `new (Date)()`                                    | **caught** — parentheses do not hide it                                                                                            | caught                                |
| `performance.now()`                               | **caught**                                                                                                                         | caught                                |
| `Math[key]()`, `key` a variable                   | not caught                                                                                                                         | **caught** by the computed-access ban |
| `new Date(...args)`                               | not caught — `arguments.length` is 1, a `SpreadElement`                                                                            | **caught**                            |
| an impure function _imported_ from another module | not caught                                                                                                                         | **not caught**                        |

Three things this establishes:

1. **`no-restricted-properties` catches more than it documents.** Alias assignment, destructuring
   _and_ computed access with a string literal all fire. Only the third is undocumented; rely on it
   but write it down.
2. **Every syntactic evasion is closable, because you can ban the evasion rather than the call.**
   Aliasing, `globalThis`, computed access and `Reflect.construct` are all rare enough in pure code
   that banning them outright costs nothing.
3. **The one hole no core rule can close is an import.** `import { now } from "./clock"` defeats
   every selector, because selectors are single-file. The complement is
   `no-restricted-imports` under the same `files:` override — verified working on this exact ESLint
   version in `file-naming-for-glob-routing.md` §4.5(b), including its two documented misses
   (`require()` and dynamic `import()`). For the suffix vocabulary this is the natural shape:
   **`**/*.pure.ts` may not import `**/*.adapter.ts`, `node:*`, or anything outside the repo.**

And the structural limit, which no amount of selector-writing fixes: **`no-restricted-properties`
and `no-restricted-syntax` are deny-lists.** There is no allow-list form — the same limitation the
sibling document found for banning node types (§4.5(a): "a node type you forget is silently
permitted"). `Temporal.Now` is the worked example: the day a runtime ships it, every `*.pure.ts`
file may read the clock again and the config will not notice. Whatever governance document
`**/*.pure.ts` routes to must therefore state the _rule_ (§5.3) as the contract and the config as a
best-effort net, not the reverse.

### 5.6 `eslint-plugin-functional` — real, maintained, and the wrong tool for this

Measured from `registry.npmjs.org` on 2026-08-27:

| fact                  | value                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| latest version        | **10.0.0**                                                                                                                             |
| published             | **2026-06-03**                                                                                                                         |
| total versions        | 133                                                                                                                                    |
| direct runtime deps   | 6 — `@typescript-eslint/utils`, `deepmerge-ts`, `escape-string-regexp`, `is-immutable-type`, `ts-api-utils`, `ts-declaration-location` |
| peers                 | `eslint ^9.0.0 \|\| ^10.0.0`, `typescript >=4.7.4`                                                                                     |
| marginal install cost | **18 packages** — **[executed]** `npm install --dry-run` into a scratch project already holding eslint 10.9.1 and typescript 6.0.3     |
| rules shipped         | **21** (enumerated from `docs/rules/` via the GitHub contents API)                                                                     |
| repo                  | <https://github.com/eslint-functional/eslint-plugin-functional>                                                                        |

So: it exists, it is actively maintained, and it is not heavy (18 marginal packages against this
repo's existing `typescript-eslint` install; tenet 7's stated procedure would weigh that, not a
budget).

**The decisive fact is a hard null: not one of its 21 rules bans a nondeterministic built-in.** The
full rule list is `functional-parameters · immutable-data · no-class-inheritance · no-classes ·
no-conditional-statements · no-expression-statements · no-let · no-loop-statements · no-mixed-types
· no-promise-reject · no-return-void · no-this-expressions · no-throw-statements · no-try-statements
· prefer-immutable-types · prefer-property-signatures · prefer-readonly-type · prefer-tacit ·
readonly-type · type-declaration-immutability`. A search of the 203-line README for `Math.random`,
`Date.now`, "nondetermin" and "impure" returns **zero** matches. **The plugin governs syntax and
mutability; it does not govern determinism.** It cannot do the job §5.4 does with core rules.

On the four rules the brief names, from their own docs:

- **`no-expression-statements`** — "📝 Disallow expression statements." and the rationale: _"This
  rule checks that the value of an expression is assigned to a variable and thus helps promote
  side-effect free (pure) functions."_ It is the closest thing to a purity rule in the plugin, and
  it is a **proxy**: it bans `array.push(3)` and `console.log(...)` because unused return values
  suggest effects. Requires **type information**. Enabled in `recommended` and `strict`; explicitly
  _disabled_ in `lite`.
- **`immutable-data`** — "📝 Enforce treating data as immutable." Bans `obj.foo += 2`,
  `obj.bar = 1`, `delete obj.foo`, `Object.assign(obj, …)`. Requires type information. Enabled in
  `lite`, `recommended`, `strict`. **The most useful single rule for this repo**, and it is about
  mutation, not determinism.
- **`no-let`** — "📝 Disallow mutable variables." Cheap: no type information needed. But it
  collides head-on with the owner's own definition of the role: _"procedures contain control
  flow"_, and control flow written without `let` needs a different style.
- **`functional-parameters`** — "Disallow use of rest parameters, the `arguments` keyword and
  enforces that functions take at least 1 parameter." **Too strict to adopt**: a zero-argument
  function is not impure, and this repo's `max-params: 3` already governs the parameter list from
  the other direction.

**Verdict: do not adopt `recommended` wholesale.** It also bans `no-conditional-statements`,
`no-throw-statements`, `no-classes` and `no-return-void`, which is a whole-codebase style decision
masquerading as a lint config, and three of the four rules above need typed linting — this repo's
`eslint.config.mjs` currently uses `tseslint.configs.recommended` and `stylistic`, **not** the
type-checked variants, so adopting them turns on project-service linting for the whole repo. If
anything is taken, take **`immutable-data`** alone, scoped to `**/*.pure.ts`, and get determinism
from the core rules in §5.4.

---

## 6. Stop the line: jidoka, andon, and whether any agent framework documents a halt

Lower priority, and the answer splits: **the manufacturing side is fully sourced from Toyota's own
material; the software-coding-standard side is a soft null; the AI-agent-framework side is a measured
hard null — and the best prior art is in this repo already.**

### 6.1 Toyota's own definitions — normative

<https://global.toyota/en/company/vision-and-philosophy/production-system/>, §"The Two Pillars of
TPS":

> The basic philosophy of the Toyota Production System is based on two pillars. The first pillar is
> **jidoka**—which can be loosely translated as "automation with a human touch"—based on the concepts
> of **stopping immediately when abnormalities are detected to prevent defective products from being
> produced** and improving productivity to eliminate the need for people to be simply watching over
> machines. The second pillar is Just-in-Time…

§"Jidoka":

> Jidoka in the TPS is "automation with a human touch," where human wisdom is added to automation.
> **Human wisdom means that when an abnormality occurs, such as a machine or equipment abnormality,
> quality abnormality, or a work delay, the machine or equipment can detect the abnormality and stop
> automatically, or the operator can stop the line by pulling the stop cord themselves.** This
> eliminates the outflow of defective products while also making it possible to build quality into
> processes by clearly detecting abnormalities and preventing them from recurring. Furthermore, having
> the ability to stop when an abnormality is detected means that machines and equipment no longer need
> to be watched over…

and **andon**, from the same page:

> When equipment stops, the **andon (problem display board)** lights up to notify workers of the
> abnormality. People need only respond when there is an abnormality, thus eliminating the need for a
> person to watch over the equipment.

> Even on a line without equipment, the andon is set to light up when the stop cord is pulled so that
> workers can call the person in charge when there is an abnormality, such as poor quality or delay
> in work.

**Three properties of jidoka that transfer exactly to a governance vocabulary**, and they are the
reason the analogy is worth having rather than being decoration:

1. **The stop is automatic where detection is mechanical, and manual where it is not.** Toyota
   describes both in one sentence — "the machine … can detect the abnormality and stop automatically,
   **or** the operator can stop the line by pulling the stop cord themselves". That is precisely the
   split this document keeps finding: ESLint stops the line for `Math.random` (§5.4); nothing can
   stop it for "this file made a decision it should have delegated", so a human or an agent must pull
   the cord.
2. **The purpose of stopping is to prevent _outflow_, not to punish.** "This eliminates the outflow
   of defective products while also making it possible to **build quality into processes**."
3. **The andon is a _display_, separate from the stop.** Toyota names them as two things — the stop,
   and the board that says an abnormality exists. In this repo's terms, that is the difference between
   a Rule failing and a **Signal** in the file; `CONTEXT.md` already separates them.

Secondary and unverified: Liker's _The Toyota Way_ Principle 5 ("Build a culture of stopping to fix
problems") and Ohno's _Toyota Production System_ (1988) were **not** obtained in verbatim form —
**UNVERIFIED**, and unnecessary given Toyota's own page.

### 6.2 The software application — chapter disputed, text not obtained

_The DevOps Handbook_ (Kim, Humble, Debois, Willis, 2016) is the standard software citation for the
andon cord, and **its body text could not be obtained from any primary source.** Two independent
probes returned **different chapter locations**, which is itself the reason to distrust the secondary
literature here:

| probe | reported location                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A     | **ch. 10**, section "Pull Our Andon Cord When the Deployment Pipeline Breaks", subsection "Why We Need to Pull the Andon Cord", plus an appendix "The Toyota Andon Cord" |
| B     | **ch. 3**, "The Second Way: The Principles of Feedback"                                                                                                                  |

Both may be true — a principle introduced in one chapter, a practice section in another — but
**neither was confirmed against the book, so nothing from it is quoted here.** Routes tried and
failed: oreilly.com book landing page and endnotes page (**HTTP 403** on both), two GitHub PDF mirrors
(**404**), Goodreads quote pages (no andon quote present). **The circulating sentence about creating
"the equivalent of an Andon cord and the related swarming response" appeared only in search summaries
and third-party blogs — do not present it as a read quote.**

Three more book-level hard nulls, so the next person does not spend the time:

- **Ohno, _Toyota Production System_ (1988)** — no fetchable text; Internet Archive holds only
  _Workplace Management_ and third-party books about him; the search-inside API timed out. **HARD
  NULL — do not cite a page.**
- **Womack & Jones, _Lean Thinking_** — present on Internet Archive (`leanthinkingbani0000woma`) but
  lending-restricted; search-inside API timed out. **HARD NULL.**
- **Poppendieck, _Lean Software Development_** — **HARD NULL.**

None of this costs much, because Toyota's own page (§6.1) is a better source than any of them.

### 6.3 A halt-and-escalate rule written into a coding standard — **found, twice, verbatim**

Recorded as a null on a first pass, and it is not one. Two official documents state the rule the brief
describes, and the first states it almost exactly.

**Google C++ Style Guide, §"Goals of the Style Guide"** —
<https://google.github.io/styleguide/cppguide.html>:

> As always, common sense and good taste should prevail. By this we specifically refer to the
> established conventions of the entire Google C++ community, not just your personal preferences or
> those of your team. Be skeptical about and reluctant to use clever or unusual constructs: **the
> absence of a prohibition is not the same as a license to proceed. Use your judgment, and if you are
> unsure, please don't hesitate to ask your project leads to get additional input.**

That is the brief's rule in a major published coding standard: _the rules failing to cover your case is
not permission; ask._ **Normative**, and the framing — an absence is not a licence — transfers
directly to a governance vocabulary in which a file matching no Rule is _invisible_ (`CONTEXT.md`,
**Governed file**): the same sentence warns against reading "nothing governs this" as "anything goes
here".

**PEP 20, "The Zen of Python"** (Tim Peters, created 2004-08-19,
<https://peps.python.org/pep-0020/>) — line 12 of the 19, quoted exactly, because it is very often
misquoted:

> In the face of ambiguity, refuse the temptation to guess.

(The common misquote is "resist the temptation". The published text is **"refuse the temptation to
guess."**) Two lines above it the same list carries the complement — "Errors should never pass
silently. / Unless explicitly silenced." — which is the andon in aphorism form: surface it, or decide
explicitly and visibly not to.

**Reported but not verified:** **MISRA Compliance:2020 §4.4** on deviations — "_Without the consent of
a designated technical authority_". This would be the strongest instance of all, since a MISRA
deviation is a formal escalate-to-a-named-authority procedure rather than an exhortation, but the
document is paywalled and the sentence was **not** read from the standard. **UNVERIFIED.**

### 6.4 AI-agent instruction frameworks — a measured hard null

Probed for the phrases `ask the user`, `ask for clarification`, `stop and ask`, `escalate`,
`if unsure`, `don't guess` / `do not guess`, `clarifying question`, `uncertain`, `ask questions`:

| source                                                         | result                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **agents.md** (the AGENTS.md spec site)                        | **zero matches** across the page                                                                                                                                                                                                                           |
| **Cursor**, `cursor.com/docs/context/rules`                    | **zero matches**                                                                                                                                                                                                                                           |
| **Agent Skills specification**, `agentskills.io/specification` | **zero matches**                                                                                                                                                                                                                                           |
| **Claude Code**, `code.claude.com/docs/en/memory`              | **zero matches**                                                                                                                                                                                                                                           |
| **GitHub Copilot**, repository custom-instructions page        | **zero matches**                                                                                                                                                                                                                                           |
| **AWS Kiro**, `kiro.dev/docs/steering/`                        | one hit, and it is **product behaviour, not a directive**: "On Kiro Web, the agent asks clarifying questions upfront in autonomous mode - your answers act as steering for that task."                                                                     |
| **Claude Code best practices** (anthropic.com/engineering)     | the closest thing found, and it is a _user_ workflow naming a _tool_: "**Let Claude interview you** — For larger features, have Claude interview you first. Start with a minimal prompt and ask Claude to interview you using the `AskUserQuestion` tool." |

**So: no agent-instruction framework documents a halt-and-ask directive as guidance for instruction
authors.** The _mechanism_ exists — `AskUserQuestion` is a tool — and one vendor documents a workflow
that uses it, but none of them tells an instruction author to write "if the rules do not cover this,
stop and ask". **This null is about the vendors' own documentation, and it holds.** Practitioners
write the rule anyway (§6.5).

### 6.5 Practitioners write the rule the vendors omit — including this repo

**One citable real-world instance, in a major Apache project's agent instructions.**
`apache/tinkerpop:AGENTS.md` (HTTP 200 on `master`) carries a section whose heading is literally the
condition, followed by two numbered rules and nothing else:

> ### When In Doubt
>
> 1. Prefer no change over an unsafe or speculative change.
> 2. Ask for clarification.

Rule 1 is the more interesting half and it is the one every other source omits: **it names the safe
default to take _while_ waiting**, rather than only telling the agent to ask. An unattended agent can
execute "prefer no change"; it cannot execute "ask".

**And the best version found anywhere is already in this repo.** `AGENTS.md`, line 12 — a halt-and-ask
directive **with a documented fallback for when nobody is there to answer**:

> Bare "harness" is ambiguous. Ask which is meant. With nobody there to ask, name both readings and
> proceed with the one the current file path implies.

and `.agents/skills/wayfinder/SKILL.md`, step 2, which pulls the cord on a _process_ rather than a
term:

> **If this surfaces no fog** (the way to the destination is already clear, the whole journey small
> enough for one session), you don't need a map. Stop and ask the user how they'd like to proceed.

That two-part shape — **ask; and here is what to do when asking is impossible** — is the transferable
form, and it is what a governance document behind any of these globs should copy. **Three independent
sources converge on it**: TinkerPop pairs "ask for clarification" with "prefer no change"; this repo
pairs "ask which is meant" with "name both readings and proceed with the one the current file path
implies"; and jidoka's own text offers an automatic stop **or** a manual cord depending on whether
detection is mechanical. An unqualified "halt and escalate" is unexecutable for an agent running
unattended, which is why none of the three states it unqualified.

---

## 7. Hard nulls — searched for, not found

Stated plainly, because in this document most of the absences are the finding.

**On the orchestration name — the central nulls.**

- **No established filename suffix exists for the orchestration role in TypeScript.** `.service.ts`
  and `.effects.ts` are template filenames inside CLI generators with **no document anywhere asking
  for them**; `.usecase.ts`/`.use-case.ts` has no generator and 0 uses in three of the four
  most-starred Clean Architecture TypeScript repositories; `.workflow.ts`, `.orchestrator.ts` and
  `.shell.ts` are effectively absent (§3).
- **`*.procedure.ts`: 0 of the top 100 ranked hits are dotted.** The word's TypeScript meaning is
  tRPC's, its meaning in the Lisp tradition is "any function", its meaning in SQL is "the half that
  returns nothing", and its meaning _in this repo today_ is "a documented human process" (§2).
- **No primary source in seven traditions gives the orchestrating layer a settled name.** Sans-IO
  refuses to name it ("the edges", "a very tiny nucleus"); Cockburn never subdivides "the
  application" — `orchestrat*`, `coordinat*` and `application service` each occur **0** times on his
  page; Bernhardt names it only by enumeration; Seemann calls it an "impure entry point" (§1.6, §1.7,
  §1.2, §1.3).
- **"Command handler" does not appear in Greg Young's own CQRS Documents** — `Command Handler` 0,
  `CommandHandler` 0, over 56 pages. His term is Application Service (§1.8).
- **No published transcript of Gary Bernhardt's "Boundaries" talk exists** on
  destroyallsoftware.com — every `href` on the page was enumerated. All verbatim quotations
  attributed to that talk in the wild come from viewers' notes (§1.2).
- **No official TypeScript or JavaScript style guide prescribes role suffixes.** Google's TS guide
  has no "File name" section at all and contains `d.ts` zero times; Airbnb's README contains `suffix`
  zero times (§3.11) — the same null `file-naming-for-glob-routing.md` §6 reached from the other
  direction.
- **Temporal does not normatively require `workflows.ts` or `*.workflow.ts`.** The hypothesis that a
  bundler-level forcing function existed here is **refuted**: `workflowsPath` is a configurable
  string, Temporal's own samples use `workflows-v1.ts` and `all-workflows.js`, and there are **0**
  dotted hits across 4,575 paths in three of its repositories (§3.9).
- **Next.js prescribes no filename for Server Actions.** A regex sweep of the full 3,927,388-byte
  `llms-full.txt` for `\.actions?\.(ts|tsx|js|jsx)` returns **zero matches**; the contract is the
  `"use server"` directive (§3.8).

**On purity.**

- **No suffix for pure code has any precedent.** `.calc.ts`, `.calculation.ts` and `.fn.ts` are
  **0/100** dotted; `.pure.ts` is the lowest-count token measured (15,840) and **36 of its 39 dotted
  hits come from a single 66-star repository where it means a tree-shaking barrel**, i.e. the bundler
  sense, not the functional one (§3.10, §4.1).
- **`eslint-plugin-functional` has no rule about determinism.** Zero of its 21 rules mentions
  `Math.random`, `Date.now`, nondeterminism or impurity; a search of the 203-line README for those
  terms returns **zero** matches. It governs syntax and mutability only (§5.6).
- **ESLint core rules cannot express an allow-list**, only a deny-list, so any nondeterministic
  built-in not enumerated is silently permitted — `Temporal.Now` is the worked example (§5.5).
- **No core rule can see through an import.** `import { now } from "./clock"` defeats every selector;
  the complement is `no-restricted-imports`, already verified in
  `file-naming-for-glob-routing.md` §4.5(b) (§5.5).
- **`Date` page numbers and Grokking Simplicity page numbers are unobtainable.** Manning's liveBook
  exposes chapter numbers and section headings but **no print page numbers**; no page number is
  invented anywhere in this document (§1.1).

**Provenance nulls that must not be silently converted into citations.**

- **_Clean Architecture_ (Martin, 2017) — book text UNVERIFIED.** Google Books API returned HTTP 429
  ("Quota exceeded"); O'Reilly chapter pages are login-gated. Everything cited from Martin here is
  from his 2011 and 2012 blog posts and his own cleancoders.com episode description (§1.4).
- **_Implementing Domain-Driven Design_ (Vernon, 2013) ch. 14 body — UNVERIFIED.** The chapter's
  structure and page numbers are verified from Pearson's official sample PDF ("Chapter 14
  Application … 509"; "Application Services … 521"; "Inside an Application Service … 541") but
  pp. 509–560 are absent from the sample, O'Reilly returned HTTP 403, Google Books HTTP 429 (§1.5).
- **Evans page numbers given here are _Final Manuscript_ pages, not print pages.** The source PDF's
  own footer reads `(Final Manuscript, April 15, 2003)`. The _wording_ is cross-checked against
  Microsoft's verbatim quotation of the same passage; the _pagination_ is not (§1.5).
- **Grokking Simplicity's three onion-layer names — UNVERIFIED.** The ch. 18 free extract truncates
  before the layer list. "Interaction layer" is verified from Normand's own podcast, not the book
  (§1.1).
- **redux-saga's docs were spot-checked, not swept.** The GitHub trees API returned HTTP 403
  unauthenticated, so "the docs never mention Garcia-Molina/Salem/1987" covers the About page, home
  page, beginner tutorial, saga-helpers page and README only (§1.8).
- **Five lean/agile books yielded no verbatim text at all.** _The DevOps Handbook_ (two probes returned
  **conflicting chapter locations** — ch. 3 versus ch. 10 — and O'Reilly 403s, two PDF mirrors 404),
  Ohno's _Toyota Production System_ (Internet Archive holds only _Workplace Management_; search-inside
  timed out), Womack & Jones's _Lean Thinking_ (lending-restricted; search-inside timed out),
  Poppendieck's _Lean Software Development_, and Liker's _The Toyota Way_. **All HARD NULL.** Toyota's
  own page carries the whole argument, so nothing is lost (§6.1, §6.2).
- **On `utils`, three provenance nulls remain (§4.3).** Kevlin Henney's tweet is real but X returns
  **HTTP 402 Payment Required**. **Coincidental cohesion** is now _located_ — Yourdon & Constantine,
  _Structured Design_, §7.1.1 p. 98 — but the verbatim text was still not obtained, and the 1974 IBM
  Systems Journal antecedent is paywalled at ACM and IEEE; the term is therefore used without a
  quotation attached. Ousterhout's "Vague Name" red flag is reported at **p. 123** of the 1st edition
  and a ch. 9 line ("if the pieces are unrelated, they are probably better off apart") is reported
  as on point — **neither re-verified**, since the official extract covers ch. 6 only.
- **MISRA Compliance:2020 §4.4 — UNVERIFIED.** The deviation-consent sentence would be the strongest
  halt-and-escalate citation of the three in §6.3, and the standard is paywalled.

**Two nulls recorded on a first pass that turned out not to be nulls** — flagged here so the earlier
wording is not carried forward:

- **A halt-and-escalate rule _is_ written into published coding standards** — Google's C++ Style Guide
  and PEP 20, both quoted verbatim in §6.3 — and into at least one real-world `AGENTS.md`
  (`apache/tinkerpop`, §6.5). Only the **vendor documentation** null holds (§6.4).
- **The criticism of `utils` _does_ exist at filename granularity**, in Kotlin's official coding
  conventions — not only at package granularity in Go (§4.3).

**Measurement nulls.**

- **GitHub's legacy `search/code` API rejects path wildcards** and returns `0`, not an error, for
  `path:*.service.ts`. Any prevalence figure sourced from a wildcard path query is worthless (§3.1).
- **`total_count` is quantized** — GCD 32 across 25 sampled values, 23 of 25 divisible by 128 (§3.1).
- **grep.app** (the one tool that does support path globs with counts) is behind a Vercel security
  checkpoint for `curl`; **GitHub's web UI** code-search counts require sign-in. Both **UNVERIFIED**
  as measurement routes (§3.1).
- **`no-restricted-properties` catching computed access with a string literal (`Math["random"]`) is
  documented nowhere** — measured true, so it is safe to rely on but must be written down (§5.5).

## 8. Ranked recommendation for the orchestration suffix

**The finding that has to be stated before the table: no name is well established for this role.** Not
in the literature — §1.9 shows it has been renamed at least six times in thirty years without being
redefined, and three of the seven traditions surveyed decline to name it at all. Not in TypeScript
filenames — §3 shows the only role suffixes that are _rules_ are `.dto.ts`, `.entity.ts`, `.input.ts`,
`.args.ts`, `.model.ts` and `.controller.ts`, none of which is an orchestrator, and the best-attested
candidate (`.service.ts`, 35M monthly generator installs) is a template filename that no document
anywhere asks for. So the ranking below is **not** a ranking on establishment; it is a ranking on the
four criteria that remain once establishment is measured and found absent: **(i)** no disqualifying
collision, **(ii)** a reader cannot mis-infer the role from the word, **(iii)** mechanically
checkable, **(iv)** the concept behind the word is normatively defined somewhere citable.

### 8.1 The table

Every candidate is mechanically checkable — a suffix is a glob, and `file-naming-for-glob-routing.md`
§4 established that the glob can be enforced by configuration alone — so that column records only
where a suffix buys _more_ than routing.

| #   | candidate                           | established by                                                                  | collides with                                                    | mechanically checkable                                     | verdict                                         |
| --- | ----------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| 1   | **`index.ts`** — _no fifth suffix_  | 15,302,656 hits; Node CJS `LOAD_INDEX` (§8.2a)                                  | **nothing**                                                      | yes, plus the simplest glob in the set                     | **Take this if the shape allows**               |
| 2   | **`*.use-case.ts`**                 | concept normative (Martin 2012, "orchestrate"); filename precedent weak (§8.2b) | soft: "The primary use case" (§0.3)                              | yes                                                        | **Best-defensible name**                        |
| 3   | **`*.orchestrator.ts`**             | the _verb_ only (§8.2c)                                                         | **nothing**                                                      | yes                                                        | **The unambiguous coinage**                     |
| 4   | **`*.impure.ts`**                   | **nothing** — 316 hits (§8.2d)                                                  | **nothing**                                                      | yes, **and exhaustively**: exact complement of `*.pure.ts` | **Take only if the axis is purity**             |
| 5   | **`*.shell.ts`**                    | Bernhardt 2012-07-12; 1/100 dotted (§8.2e)                                      | soft: terminal sense vs **Host harness**                         | yes                                                        | Best pedigree, worst legibility here            |
| 6   | **`*.handler.ts`**                  | docs-exemplified only (§8.2f)                                                   | nothing in either glossary                                       | yes                                                        | Points at `*.adapter.ts`, not composition       |
| 7   | **`*.interaction.ts`**              | Normand's own noun (§8.2g)                                                      | **nothing**                                                      | yes                                                        | Best definition, will be mis-read as UI         |
| 8   | **`*.workflow.ts`**                 | **not normative** — 0/4,575 Temporal paths (§3.9)                               | nothing                                                          | yes                                                        | Implies durable/long-running                    |
| 9   | **`*.effect.ts` / `*.effects.ts`**  | NgRx schematic, 1,237,953 dl/mo (§3.4)                                          | hard-bound to RxJS (§1.8)                                        | yes                                                        | Real establishment, wrong definition            |
| 10  | **`*.command.ts`**                  | one generator, 2,720,588 dl/mo (§3.7)                                           | **`command` = CLI verb** (§0.1)                                  | yes                                                        | Viable only if orchestrators _are_ CLI commands |
| —   | **`*.service.ts`**                  | **most attested in TS**, normative nowhere (§3.2)                               | **DISQUALIFIED** by `SKILL.md` and `product.md` (§0.2–0.3)       | yes                                                        | **Excluded**                                    |
| —   | **`*.procedure.ts`** — _status quo_ | **nothing**: 0/100 dotted, 56/100 bare (§2.5)                                   | this repo's vision docs, **and tRPC** (§2)                       | yes                                                        | **Reject**                                      |
| —   | **`*.action.ts`**                   | NgRx `.actions.ts` only (§3.8)                                                  | near-collision with **`Actor`**; wrong level in its own taxonomy | yes                                                        | **Reject**                                      |
| —   | **`*.script.ts`**                   | 3 primary sources use the _word_ (§1.9)                                         | npm scripts, shell scripts                                       | yes                                                        | **Reject as a suffix, keep as the explanation** |

### 8.2 The notes behind the table

**(a) `index.ts`.** Normative in Node's CommonJS resolution algorithm — `LOAD_INDEX(X)`: "_If
X/index.js is a file … load X/index.js as a CommonJS module. STOP._"
(`nodejs/node:doc/api/modules.md`) — with the honest caveat that **ESM has no index fallback**
(`doc/api/esm.md` §"Mandatory file extensions": "_A file extension must be provided when using the
`import` keyword to resolve relative or absolute specifiers. Directory indexes (e.g.
`'./startup/index.js'`) must also be fully specified._"). It matches Seemann's "impure entry point"
(§1.3) and, in `codebase-design` terms, it is where a Module's **Interface** lives. **Rank 1 — the
null hypothesis the owner has to argue against**, because it costs zero vocabulary. Two live
objections: one orchestrator per directory, and `index.ts` is conventionally a re-export barrel, which
`knip` and tree-shaking both discourage. **Open question, not resolvable from any source: what does
`index.ts` already mean in the proposed vocabulary?** If it means "barrel", this rank collapses.

**(b) `*.use-case.ts`.** The _concept_ is normative — Martin 2012: "_These use cases **orchestrate**
the flow of data to and from the entities_" (§1.4) — and it is the only candidate whose orchestrator
definition is both normative and phrased with the verb. The _filename_ precedent is real but weak:
`royib/clean-architecture-nestjs` (931★, 3 files); no generator emits it; and the 14,890★ exemplar
uses `.service.ts` for the same role (§3.5). Prefer the hyphenated spelling — it is the one with the
precedent.

**(c) `*.orchestrator.ts`.** **The verb is established; the noun suffix is not.** "orchestrate" is
Martin's verb and redux-saga's author's verb when he reaches for the general concept ("_aiming to
**orchestrate** complex workflows_"). As a filename: 74,112 token hits, 94/100 sampled were the _bare_
`orchestrator.ts`, and **zero** in Azure Durable Functions' TypeScript docs or repository (§3.10).
Nobody can mis-infer it and no glossary in this repo touches it. It costs 17 characters, and it
inherits the "telephone switchboard" failure mode the C2-wiki contribution on Cockburn's page warns
about (§1.7).

**(d) `*.impure.ts`.** Zero establishment — **316** token hits, the lowest measured here. Its unique
property is _exhaustiveness_: as the exact complement of `*.pure.ts`, "every non-type, non-test file is
one or the other" becomes provable, and `eslint-plugin-boundaries`' `no-unknown-files` — the one
unique capability identified in `file-naming-for-glob-routing.md` §4.2 — can enforce it. Its weakness
is that it names the role by a negative, and the owner's role is _narrower_ than "not pure": an
orchestrator that performs no I/O is impure only because of what it calls. Choose it only if the
vocabulary's axis is genuinely purity rather than responsibility.

**(e) `*.shell.ts`.** Bernhardt's own noun, published 2012-07-12, defined extensionally ("_stdin,
stdout, the database, and the network_") plus one quality — "_an imperative shell with **few
conditionals**_" (§1.2). As a filename: 82,944 token hits, **1/100** dotted; the one TypeScript FCIS
repository (39★) uses **bare** `src/shell.ts` (§3.10). Best pedigree of any candidate, worst
legibility in a repo whose domain is CLIs and whose bound term for the CLI is **Host harness**.

**(f) `*.handler.ts`.** Docs-exemplified only: `@@filename(kill-dragon.handler)` on
docs.nestjs.com/recipes/cqrs, with **zero** prose hits and no schematic. The AWS `handler` is an
**export name in a config string**, and CDK's `super-construct.handler.ts` is keyed on the **construct
id**, not the role (§3.6). Short and widely legible, but its dominant meanings — an inbound event
receiver, a Lambda entry point — point at `*.adapter.ts`.

**(g) `*.interaction.ts`.** Normand's own noun for exactly this role, used consistently 2018–2021:
"_The outer layer is called the **Interaction Layer**… If you listed the steps that the interaction
layer took, that becomes like a script_" (§1.1). It is the most precisely _defined_ candidate — it
arrives with "there's no decisions anymore… it's actually dumb", which is the owner's definition
restated — but its 82,048 token hits are almost entirely UI-interaction code, so the word will be
mis-read.

### 8.3 What to do with the answer

**If the shape allows it, take Rank 1 and add no suffix at all.** The vocabulary is smaller, the glob
is simpler, and `index.ts` is the only filename in this whole survey with overwhelming establishment.
The blocker is a question about the current design, not about the sources.

**If a fifth suffix is needed, the choice is between two bets**, and they are not comparable on
establishment because neither has any: **`*.use-case.ts`** bets on the _concept_ being citable and
accepts a soft collision with a phrase the repo already uses; **`*.orchestrator.ts`** bets on
_unambiguity_ and accepts that it is a coinage.

**Do not take `*.service.ts`,** the one name prevalence would otherwise select, because this repo has
forbidden the word to itself in a file that loads into the same context window.

**Whichever wins, the governance document behind its glob should state the constraint, not the name.**
The constraint is the part five independent sources agree on: _this file sequences and does not
decide; if a conditional in it encodes a rule, the rule belongs in a `*.pure.ts` file and the answer
belongs in a variable._ Bernhardt's "few conditionals", Normand's "it's actually dumb", Evans's "kept
thin… does not contain business rules", Microsoft's "too much logic… that can be a code smell" and the
owner's own wording are the same sentence five times. Unlike the name, that sentence is quotable.

**One mechanical note that outranks the naming question.** `complexity` is already set to `['error',
7]` repo-wide in `eslint.config.mjs`. A `files: ["**/*.<suffix>.ts"]` override could set it far lower —
**a numeric ceiling on branching is a closer proxy for "does not decide" than any suffix name, and it
is the one check that would actually fail when the role is violated.** That is worth measuring before
the name is settled.

---

## Sources and versions probed

Probed 2026-08-27. npm figures from `registry.npmjs.org` and `api.npmjs.org/downloads/point/*`.
GitHub code-search counts from `gh api -X GET search/code`, quantized by GitHub (GCD 32 over 25
sampled values) and read as **token upper bounds** per §3.1.

**Executed against real binaries.** ESLint **v10.9.1** with `typescript-eslint` **8.68.0** and
typescript **6.0.3** — the versions in this repo's `devDependencies` (§5.4, §5.5) · Node **v26.5.0**
(`typeof globalThis.Temporal === "undefined"`) · `npm` **11.17.0** (`install --dry-run`, §5.6) ·
`gh` CLI code-search calibration (§3.1).

**Specifications.** ECMAScript living specification, <https://tc39.es/ecma262/>, titled "ECMAScript®
2027 Language Specification" on the day probed — §4.4.1 (`implementation-approximated`), §6.1.6.1.3
(`Number::exponentiate`), §21.3.2 (Math function properties Note), §21.3.2.1/.16/.25/.27/.28
(`abs`/`floor`/`max`/`pow`/`random`), §21.4.1.25 (`LocalTime`), §21.4.2.1 (Date constructor),
§21.4.3.1 (`Date.now`), §21.4.4.4/.11/.14 (`getFullYear`/`getTimezoneOffset`/`getUTCFullYear`).
Section numbers shift between editions; titles are given alongside. · `tc39/proposal-temporal`,
`docs/now.md`. · Node.js `doc/api/modules.md` (`LOAD_INDEX`), `doc/api/esm.md` ("Mandatory file
extensions").

**Books and papers.** Christopher Strachey, "Fundamental Concepts in Programming Languages",
_Higher-Order and Symbolic Computation_ 13:11–49 (2000), §3.2.1 p. 19 and §3.3.1 p. 20 (PDF at
fpl.cs.depaul.edu) · Abelson & Sussman, _SICP_ §1.1.4 (mitp-content-server.mit.edu) · Eric Normand,
_Grokking Simplicity_ ch. 1, 3, 8, 9, 18 via Manning liveBook (**no print page numbers available**)
· Eric Evans, _Domain-Driven Design_ (Final Manuscript, April 15, 2003) ch. 4 p. 53, ch. 5 pp. 76–77
— **manuscript pagination** — plus Evans's own free _DDD Reference_ (2015, CC-BY 4.0) pp. 10, 14 ·
Vaughn Vernon, _Implementing Domain-Driven Design_ — Pearson official sample PDF (ToC and preface
only) · Greg Young, _CQRS Documents_ (2010, 56 pp.).

**Author sites and talks.** ericnormand.me (podcasts: "What is an action?" 2019-07-25, "What is a
calculation?" 2019-08-05, "What is the onion architecture?" 2018-11-15, "How to apply the Onion
Architecture" 2019-02-07, "Don't overcomplicate the onion architecture" 2021-05-24) ·
destroyallsoftware.com (`/talks/boundaries`, `/screencasts/catalog/functional-core-imperative-shell`,
published 2012-07-12) · blog.ploeh.dk (impureim sandwich, 2020-03-02) · blog.cleancoder.com (2011-11-22
and 2012-08-13) · cleancoders.com (Clean Code Episode 7) · alistair.cockburn.us/hexagonal-architecture
(page dated `2005-09-04 (v 0.9 …)`) · sans-io.readthedocs.io · survivejs.com (redux-saga author
interview).

**Official documentation.** eslint.org (`no-restricted-properties`, `no-restricted-globals`,
`no-restricted-syntax`, `extend/selectors` — quoted from `eslint/eslint:docs/src/**` on `main`) ·
postgresql.org/docs/current (§36.4 `xproc`, §36.7 `xfunc-volatility`, `sql-createprocedure`) ·
gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html (`const`, `pure`) · trpc.io/docs/server/procedures ·
docs.nestjs.com (`cli/usages`, `openapi/cli-plugin`, `fundamentals/unit-testing`,
`recipes/sql-typeorm`, `recipes/cqrs`) · ngrx.io/guide/effects · redux.js.org/style-guide ·
redux-saga.js.org · nextjs.org/docs (incl. `llms-full.txt`, 3,927,388 bytes) · reactrouter.com ·
docs.temporal.io · docs.aws.amazon.com/lambda · serverless.com/framework/docs ·
learn.microsoft.com/dotnet/architecture/microservices · learn.microsoft.com/azure/architecture/patterns/cqrs ·
webpack.js.org/guides/tree-shaking · rollupjs.org/configuration-options ·
google.github.io/styleguide (tsguide, jsguide §2.1, **cppguide** §"Goals of the Style Guide",
**go/decisions#package-names**, **go/best-practices#util-packages**) · github.com/airbnb/javascript ·
go.dev/blog/package-names §"Bad package names" · kotlinlang.org/docs/coding-conventions.html
(§"Source file names", §"Choosing good names") · peps.python.org/pep-0020 ·
global.toyota/en/company/vision-and-philosophy/production-system (jidoka, andon) ·
ui.shadcn.com/schema.json (`/properties/aliases.required`) ·
`nuxt/nuxt:docs/2.directory-structure/1.app/1.utils.md` ·
`shadcn-ui/ui:apps/v4/content/docs/installation/manual.mdx` ·
`apache/tinkerpop:AGENTS.md` §"When In Doubt" · web.stanford.edu/~ouster (book page and the official
`aposd2ndEdExtract.pdf`, 2nd ed. July 2021, ch. 6, read as page images — the PDF carries no
extractable text layer).

**Shipped source, verified by fetch.** `nestjs/schematics:src/lib/service/files/ts/__name__.service.ts`
(and `…__specFileSuffix__.ts`) · `nestjs/swagger:lib/plugin/merge-options.ts` (`defaultOptions`) and
`lib/plugin/utils/is-filename-matched.util.ts` · `nestjs/graphql:packages/graphql/lib/plugin/merge-options.ts`
and `…/utils/is-filename-matched.util.ts` — the last two **independently re-verified byte-for-byte** ·
`ngrx/platform:modules/schematics/src/effect/files/__name@dasherize@if-flat__/__name@dasherize__.effects.ts.template`
· `jmcdo29/nest-commander` schematics templates · `oclif` `src/commands/generate/command.ts` ·
`aws-cdk-lib/aws-lambda-nodejs/lib/function.ts` · `temporalio/sdk-typescript:packages/worker/src/worker-options.ts`
· `@schematics/angular` npm tarballs 19.2.9 / 20.3.9 / 21.2.9 · `Azure/azure-functions-durable-js` ·
`sbb-design-systems/lyne-components` · `eslint-functional/eslint-plugin-functional` (README + all 21
`docs/rules/*.md`).

**Cross-references inside this repo.** `docs/research/file-naming-for-glob-routing.md` — §0/§3.5 glob
semantics, §1 the tiers of filename normativity and §1.4 the shape worth copying, §2 Angular's v20
reversal and §2.5 NestJS's `must have` clause, §3.3 no folder names in Cockburn, §4.1–4.6 the ESLint
mechanisms for filename conventions, §4.5(b) `no-restricted-imports` verified, §5 the glob-routed
context census, §6 hard nulls. `CONTEXT.md` (product glossary).
`.agents/skills/codebase-design/SKILL.md` (design glossary and "Rejected framings").
`docs/vision/architecture.md` tenets 1, 3, 4, 7, 8 and §4 "The contract is the portable artifact".
`docs/vision/product.md` (the out-of-scope table, "## The primary use case").
`eslint.config.mjs` (`complexity: ['error', 7]`; **not** type-checked linting).
