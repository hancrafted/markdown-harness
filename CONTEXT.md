# markdown-harness

Reads one config, checks every governed markdown file, and answers "what governs this path?"
for an agent about to write one. `frontmatter-harness` is the first module; OKF ships as a
preset config rather than as behaviour.

Glossary only. Definitions live here; the mechanics of where each record lives and who
writes it live in `docs/agents/domain.md`, and the promise and the tenets live in
`docs/vision/`.

## Language

### Decision records

Two decision-record systems run side by side. The frontmatter `type` **value** is the
discriminator — `adr` or `design-adr` — and it is the only signal that survives a file being
moved, quoted, or pasted out of context. Check the value rather than inferring from the
directory, and never from the presence of `type` itself: both kinds carry it.

**ADR**:
A governance decision record owned by Archgate, opening `type: adr`. It constrains how
`markdown-harness` is built, never what an adopter's files must look like.
_Avoid_: architecture decision record; bare "decision record" when either kind could be meant

**ADR Discipline**:
One universal constraint on how `markdown-harness` is written, at an altitude no future
feature can invalidate. An ADR carries one or more, grouped **by the glob they need** rather
than by topic. The altitude test decides membership: if the next feature could make the
record wrong, it was written at the wrong altitude and belongs in a design-ADR.
_Avoid_: rule, policy, standard, guideline, best practice

**design-ADR**:
A design decision record owned by the Matt Pocock engineering skills, opening
`type: design-adr`. It records reasoning; it constrains nothing.
_Avoid_: ADR, design ADR (unhyphenated), Pocock ADR

**ADR rule**:
A deterministic check in an ADR's companion `.rules.ts`, tied to the numbered decision it
enforces by a `📜 Rule:` marker in the ADR body. Always qualified, because unqualified "Rule"
means the config kind below.
_Avoid_: Rule (unqualified), check, lint, validator

**Briefing**:
The per-ADR metadata `archgate review-context` emits — `id`, `title`, `domain`, `files`,
`rules`, and no prose at all without `--verbose`. It is **not** how an ADR reaches an agent:
Claude Code's `.claude/rules/` symlink loads the full ADR body, uncapped, on Read. Under
`--verbose` it truncates `decision` and `dosAndDonts` at 2000 characters behind an `adr://`
pointer nothing resolves, which makes it a reporting surface rather than a context-loading
one.
_Avoid_: summary, digest, condensed ADR

### The product

**`markdown-harness`**:
The package an adopter installs, written in full every time. Every decision here is
constrained by having to work against a repo it has never seen, from a dependency the adopter
can upgrade — not by having to survive being copied.
_Avoid_: the harness, framework, tool, plugin, template

**Host harness**:
The agentic CLI that runs the agent and owns the model, the tools, the permissions and the
session — Claude Code, Codex, Antigravity. It carries governance of its own, so
`markdown-harness` contributes steering to it rather than replacing it.
_Avoid_: the harness, agent host, agent runtime, wrapper, IDE

**Operator**:
The person who installs `markdown-harness`, writes the config, and decides what a corpus must
guarantee. Technical, and the only role that opens the config.
_Avoid_: admin, maintainer, owner, power user

**Contributor**:
The person who writes documents and never opens the config — governed, steered and warned
through their own Host harness. Making this role work without a terminal is what
"non-technical" means here.
_Avoid_: user, author, end user, consumer

**LLM-wiki**:
A knowledge base whose primary reader is a model rather than a person, which inverts who needs
the plain-language rendering: the model reads the precise version and the human needs the
translation.
_Avoid_: LRM-wiki, wiki (unqualified), vault

**config contract**:
The vocabulary every config section is built from — selectors, Constraints, claims, the fault a
rejected config reports — plus the port a Module declares itself through. It names no Module and
describes no file: a Module's own section type belongs to that Module. It is the **portable** half of
the product — adopters and any reimplementation receive it and never receive `.archgate/`, which is
why an ADR must not hold it.
_Avoid_ as a name for this: schema, config types, the config API, the contract (unqualified — this
repo also has Interface-level contracts, and design-ADR 0002 turns on the distinction)

**response contract**:
The shape of everything `mh` writes to stdout: one envelope per command, discriminated on
`command`, plus the result shapes each envelope carries. It lives in the `response-contract`
Package. This is what `docs/vision/architecture.md` calls **the report format**; the Package is
named for the frozen type names — `QueryResponse`, `CheckResponse`, `AuditResponse` — rather than
for the prose, so the phrase is bound here instead of either side being renamed. Portable on the
same terms as the config contract, and it stores no prose of ours: a code, the value found and the
Operator's verbatim `intent`, never a sentence this repo wrote.
_Avoid_: report contract (as a Package name), output schema, the response type (unqualified)

**Core**:
The role every Package that is not a Module fills: config reading, path resolution, the command
surface, and reporting. No single Package is Core — the role spans `foundation`, `cli`,
`config-contract` and `response-contract`, so it is a position in the architecture rather than a
folder. Core loads a config it has no type for and hands each Module its own section back under the
type that Module's own validation earned. It compares the claims Modules make and never parses a
Module's section, which is what lets a Module be added without editing Core. It is also where the
filesystem gate lives: Core is the only part that reaches the filesystem, and every Module reads
through it. It reads frontmatter without learning what any field means.

The word has several live senses, most of them owned by vocabularies this repo did not write and
cannot rename, so the table states what each one is rather than banning any of them:

| written                     | means                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| **Core**, capitalised       | the role above — every Package that is not a Module                        |
| `foundation`                | the one Package the Modules share — its own entry is below                 |
| a deterministic core        | `docs/vision/architecture.md` tenet 1 — the deterministic half of the tool |
| a Functional Core           | `ARCH-007-file-suffix-impure` — the pure middle of one call                |
| a core rule                 | ESLint's own word for a rule it ships                                      |
| `dependencyTypes: ['core']` | dependency-cruiser's word for a Node platform builtin                      |

_Avoid_ as a name for this: engine, runtime, kernel; `foundation` (that is the Package, not the role)

**foundation**:
The one Package the Modules share: config reading, tree walking, selector matching and markdown
reading, behind narrow entry points. Lowercase, because it names a folder rather than a domain
concept. It is the only Package allowed to reach a platform builtin, which is what stops two Modules
disagreeing about what is on disk. It fills part of the **Core** role and is not the whole of it.
_Avoid_ as a name for this: core, shared, common, base, utils; **Core** (that is the role, not the
Package)

**Module**:
A named checking domain that owns one section of the config and one family of checks. It owns its
section's **type** as well as its section, in its own Package, and no Package outside it may name
that type. It projects its own section into **claims**, and it knows no other Module exists:
claims are made in Core's vocabulary, so Core can compare two Modules without either one reading the
other's section. Narrower than the general design sense used in `codebase-design`, where a
module is anything with an interface and an implementation.
_Avoid_ as a name for this: plugin, checker, rule pack

**declared Module set**:
The list naming every Module a binary composes, written down in one place in `cli` and nowhere else.
It is also the config's top-level key vocabulary, because a top-level key no declared Module claims
is a key the harness cannot act on. A Module is composed into a binary, never discovered by one, so
adding one means editing this list.
_Avoid_ as a name for this: registry, module registry, plugin list, the manifest

**Preset**:
A shipped config an adopter can adopt, amend, or ignore, with no privileged status and no
behaviour behind it. What makes a Preset honest is that deleting it changes nothing except
which Rules run.
_Avoid_: default, built-in, profile, ruleset

**Steering query**:
Asking the config what governs a path **before** the file is written, rather than checking it
after. It reads the config and never opens the file, which is what separates it from an
Assessment.
_Avoid_: lookup, dry run, preflight

**Assessment**:
What one document's own frontmatter says about how much of it to believe, judged against a
stated instant rather than against whatever the clock reads. A Steering query asks the config
about a path; an Assessment asks the file about itself.
_Avoid_: steer, trust check, staleness check, verification, health, score

**Assessment instant**:
The moment an Assessment is judged against. Supplied by the caller and echoed in the answer,
never read from a clock without being stated, so one tree and one instant always give one
answer.
_Avoid_: now, current time, today, the clock

**Stale**:
A Governed file whose `stale_after` value falls at or before the Assessment instant. OKF's
word and OKF's test, adopted rather than invented. A file carrying no `stale_after` is not
fresh — it cannot be assessed at all.
_Avoid_: expired, out of date, old, rotten

### How the code is written

**Package**:
One folder under `src/packages/`, flat — a Package may not contain another. Its **root files**
are its entry points and are public; everything in a subfolder is private. A Package is a deep
module in the `codebase-design` sense. It is **not** a Module: a Module is a checking domain
and a Package is a unit of code, and neither implies the other.
It is also **not** an npm package: no `package.json` sits below the repo root and the root
one declares no workspaces, so no Package is installable or versioned on its own. That much is
unchanged, but the disclaimer was cheap while nothing was published and is not any more — three
senses of the word are now live at once, and denying one of them is no longer enough:

| written                  | means                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Package**, capitalised | one folder under `src/packages/`, and only ever this                          |
| the published package    | the npm package `@hancrafted/markdown-harness`, which the whole repo produces |
| `markdown-harness`       | the product — see its own entry above                                         |

Qualify whenever more than one could be meant. The npm sense is what
`docs/design-adr/0004-compiled-entry-and-bounded-tarball.md` calls the artefact, and it contains
every Package at once rather than corresponding to any.
_Avoid_: module (collides in both directions), library, workspace, folder; bare "package" where the
npm sense and this one could both be read

**classifier**:
The single token a file carries to declare its discipline — by **position** at a Package root
(kebab-case, no suffix, no dot) or by **suffix** below one (`.pure`, `.impure`, `.types`,
`.test`). Exactly one per file. A file that carries none and holds no entry-point position is
ungoverned, which is the failure the vocabulary exists to close.
_Avoid_: tag, marker, kind, category, and **type** (collides with both the frontmatter field
and the TypeScript construct)

**Interface**:
Kept from `codebase-design`: everything a caller must know to use a Package correctly — the
type signature, and also invariants, ordering constraints, error modes, required configuration
and performance characteristics.
_Avoid_: **API** — banned outright — and signature. Both are too narrow: they name only the
type-level surface, which is the part an Interface is precisely not reducible to

**type declaration**:
The TypeScript construct: an `interface`, a `type` alias, or an `enum`. Exported ones live in a
`*.types.ts` file; a private local one beside its only consumer is better **Locality**, not a
violation. Lowercase, because it names a language construct rather than a domain concept.
_Avoid_: type (unqualified — collides with the frontmatter field), model, schema, DTO

**success cases**:
The block of a suite that exercises the subject as its Interface intends, on input a caller is
supposed to send. One of exactly three blocks every suite under `src/` splits into.
_Avoid_: happy path, golden path, main flow, positive test

**failure cases**:
The block that **asserts what must not happen**. Two readings compete — input the caller should
not have sent, and a property that must be absent from an otherwise valid result — and this clause
is deliberately wide enough for both, because an author handed an undefined term writes whichever
is cheaper. A subject with no error case still has failure cases; finding them is usually finding a
decision nobody made.
_Avoid_: sad path and unhappy path (both name a mood, not what the block asserts), negative test,
error case (both narrow it to throwing)

**edge cases**:
The block that pins a boundary of the subject's domain: the first or last admissible value, an
empty or reversed input, a value either side of a threshold. Separate from failure cases, which
assert what must not happen rather than where the domain ends.
_Avoid_: corner cases, boundary tests, misc

### The pinned spec

Moving the pin, and what it means for upstream to have moved on, are procedures rather than
vocabulary: they live beside the pin in `docs/okf/README.md`.

**OKF**:
Google's Open Knowledge Format. A vocabulary the OKF Preset was written against, never a spec
this repo owns or implements — and its version label is not a contract boundary, because OKF
changes normative content in place under a fixed label and publishes no tags or releases.
_Avoid_: the spec, the standard, OKF v0.2 (as an identifier)

**Pinned revision**:
The exact OKF text the OKF Preset's Rules were derived from, vendored byte-identical at
`docs/okf/SPEC-v0.2.md`. That file _is_ the pin: git content-addresses it, so nothing verifies
it at build time and the `sha256` recorded in `docs/okf/README.md` is provenance rather than a
gate.
_Avoid_: the spec version, v0.2, the snapshot

### What `markdown-harness` checks

**Rule**:
One entry in a Module's ordered rule list: a **selector**, a mandatory `intent`, and a payload. For
any file the first matching Rule is the complete set of Constraints that applies — nothing merges and
nothing is inherited. Only a Module that resolves by path has Rules: a Module whose section is keyed
some other way has no order, no first match and no Rule, and what its section holds is named by the
Module that ships it rather than here.
_Avoid_ as a name for this: path rule, matcher, policy

**selector**:
How a Rule says which files it is about, on two literal axes — folders and file names. A folder token
is a literal path from the repo root carrying a mandatory trailing `/`, and the corpus root is `./`; a
file name is one literal basename with its extension. An absent axis means every, which is the only
spelling "all" has, because a selector carries no wildcard anywhere. Being literal is what makes it
decidable: whether two selectors reach the same file is settled from the config text alone, with no
tree read.
_Avoid_ as a name for this: glob, pattern, path spec, matcher

**folder tree**:
A folder and every folder below it, as against the folder alone. Both are spellable on the folder
axis of a **selector**, and a reader who has only met "directory" cannot tell which of the two a
token means, which is why they are named apart rather than distinguished by punctuation.
_Avoid_ as a name for this: recursive glob, subtree, directory (unqualified)

**glob** — _retired, defined only so the term resolves_:
A wildcard pattern matched against a path — how a **selector** was written before it became two
literal axes. The config language admits none now. It survives in `docs/research/`, in design-ADR
0005, and in every config an adopter has already written, so a reader will meet it; treat every such
mention as history. Archgate's own `files:` and `paths:` keys are globs in the same sense and are not
this repo's language to retire.
_Avoid_ as a name for anything this repo's config language currently admits: glob, wildcard
pattern

**claim**:
What one Module says about one set of files, in vocabulary Core owns: a site, an **extent**, a kind
and a **stance**. A Module projects its own section into claims; it never reads another Module's
section, and Core never reads any Module's section. A claim is a projection of config text — a Module
is handed its own validated section and nothing else — so nothing a claim says was read from a
document, and a sentence written in a document is never one.
_Avoid_ as a name for this: assertion (taken by **Constraint**), rule (taken), declaration,
requirement, fact

**stance**:
What a claim does to its subject: `requires`, `forbids`, or `reads`. `reads` is the weak one and it is
the reason the vocabulary works — a Module that reads a field tolerates its absence and contradicts
only a declared forbid.
_Avoid_ as a name for this: mode, polarity, verb, direction

**extent**:
Which files a claim is about: one **selector**, minus a list of extents. An absent axis means every,
so "a directory" is an extent with no name axis and "a name" is an extent with no folder axis; there
is no third kind of extent and no separate comparison for one. An extent is exact rather than an
approximation — it is what a claim's site won under first match, and approximating it loses
contradictions outright rather than merely blurring them.
_Avoid_ as a name for this: scope, range, coverage, file set, target

**claim vocabulary**:
The closed set of kinds and stances a claim may use, portable on the same terms as the **config
contract** itself. Closed, so that a Module cannot coin a term Core would compare against nothing.
What it cannot say falls to a hand-written check, which is permanent and not a defect.
_Avoid_ as a name for this: claim schema, claim language, the claim types, the claim API

**Constraint**:
One assertion a Rule makes about one frontmatter field, keyed by field address. Constraints
are shape-specific by construction: `minLength` names strings, `minItems` names lists.
_Avoid_: validation, assertion, check

**Governed file**:
A file matched by at least one Rule. Files nothing matches are invisible — never reported on,
never counted — so governance is opt-in by path, and no file carries a requirement merely by
existing.
_Avoid_: tracked file, included file, covered file

**Type vocabulary**:
The set of document kinds a repo recognises, spelled as `allowed` records on the `type` field
of the Rules that care. It is implicit: the union of those records across the config,
derivable for reporting but declared in no single place. Collides softly with the `*.types.ts`
suffix, which holds TypeScript **type declarations** and has nothing to do with this. Both are
kept — every alternative measured worse — so qualify whenever either could be meant.
_Avoid_: the types list, enum, taxonomy; `*.types.ts` or "types file" as a synonym

**Floor** — _retired, defined only so the term resolves_:
The requirements an earlier design enforced on **every** Governed file, unconditionally, with
no config key to switch off, above a repo-wide `types:` declaration it called the ceiling.
Nothing here implements it: all five of its check families — `type` presence, `type`
membership, `generated.by`, `sources[].resource`, Actor form, and timestamp format — are
ordinary per-Rule Constraints now. It appears throughout `docs/research/` and the predecessor
repo, so a reader will meet it; treat every such mention as history.
_Avoid_: using "Floor", "the ceiling" or "unrelaxable" for anything this repo currently does

**Actor**:
An identity recorded in frontmatter, written `<producer>/<version>`, `human:<id>`, or
`process:<id>`. Consumers derive trust from the `human:` prefix, so a Constraint checks an
Actor's form and never whether the identity it names is the true author.
_Avoid_: author, owner, signer

### What is promised

**Guarantee**:
What `markdown-harness` promises, as distinct from the trust it aims at. Four tiers of
decreasing strength — Conformance, Signal, Detection, Reviewability — set out in
`docs/vision/product.md`. Full trust is explicitly not offered, and only the first tier is
unconditional.
_Avoid_: Floor, baseline, unrelaxable, promise, SLA

**Signal**:
What a document states about its own trustworthiness, in the file, for a reader that may never
run `markdown-harness` — provenance, trust tier, freshness and lifecycle, each of which OKF
names and supplies fields for. It is separate from the body's claims about itself, and it
outranks them.
_Avoid_: warning, status, health, score, badge

**Authoring path**:
The moment a document is being written or checked. Where `markdown-harness` belongs, and where
a Steering query happens.
_Avoid_: write path, pre-commit, ingest

**Consumption path**:
The moment a document is read in order to be used — later, and possibly by an agent that has
never heard of `markdown-harness`. Nothing here may be required at that moment, which is why
the Signal lives in the file.
_Avoid_: read path, retrieval, query time

**Loosening**:
A config change that widens what passes. Made visible by diffing a config against its git
base, which is why each Constraint key has to declare which direction is looser; a changed
`pattern` is undecidable and always flags.
_Avoid_: relaxation, weakening, regression, tamper

### The Conformance suite

**Conformance suite**:
Every corpus tier under `fixtures/conformance/`, plus the runners in `src/packages/conformance/`
that check them. Each tier is one config file plus the Conformance case documents that config
governs, so the suite holds one config per tier rather than one config overall. Its coverage half —
every config-vocabulary key exercised somewhere — is scaffolding a future config-schema validator
will replace; its specification half, each tier's config together with each case's stated expected
outcome, is permanent: the contract for what `markdown-harness` must report against a real-shaped
file. The whole is the suite; the per-tier unit is a **corpus tier**, never "a suite".
_Avoid_ as a name for this: fixture corpus (retired for this artifact), test suite

**corpus tier**:
One directory under `fixtures/conformance/`, holding what one runner checks: a Module tier holds
that Module's config and its Conformance cases, and the rejected-config tier holds config bytes a
load must refuse and no markdown at all. A tier root is a synthetic repo root — the directory a
tier's own selectors are written relative to — which is why a tier moves whole or not at all. One
runner per tier, named `<tier>-tier.test.ts`, with both sets derived from the tree and asserted
equal, so a tier added without a runner fails rather than sitting unnoticed. Say **corpus tier** in
full wherever ARCH-002 is also in view: that record calls the config vocabulary's four levels
(rule, constraint, `allowed` entry, named format) **vocabulary tiers**, and a bare "tier" there
reads as either.
_Avoid_: suite, corpus, fixture group, category

**Conformance case**:
One document under a Module tier's `docs/` — `fixtures/conformance/**/docs/` — carrying a
machine-readable `<!-- expect: -->` marker that names the verdict — PASSES, FAILS, or UNGOVERNED —
its prose already argues. A case of another kind has no document to mark, so not everything a
corpus tier holds is one of these: a **rejected-config case** is a directory of config bytes and
one frozen expectation, and a **witness case** is a path with no document at all.
_Avoid_ as a name for this: fixture, test file, example doc

**integrated**:
The corpus tier where one config names more than one Module over one tree. A disagreement
between two Modules is expressible as a case nowhere else, which is why it is a frozen tier rather
than a demo.
_Avoid_ as a name for this: end-to-end, e2e, combined, the whole suite

**rejected-config case**:
One directory holding a config the loader must refuse, plus the **golden expectation** that states
the refusal verbatim. It carries no document and no marker, so it is not a Conformance case.
_Avoid_ as a name for this: bad config, invalid config fixture, error case

**golden expectation**:
A file holding the response the harness must produce verbatim, beside a subject that is not a
Conformance case document. A **rejected-config case** and a **witness case** each carry one.
_Avoid_ as a name for this: snapshot, golden file, expected output

**witness case**:
A path with no document behind it, plus the answer a **Steering query** must give for it. It proves a
selector by where it does **not** reach, which a tree of real files cannot do. Not a Conformance case
and not a **rejected-config case**.
_Avoid_ as a name for this: phantom path, synthetic path, negative fixture

**fixture**:
Ordinary test data anywhere in the repo that pins nothing — coverage, not contract. Every
Conformance case is also test data, but not every fixture is a Conformance case.
_Avoid_: sample data, mock, stub, dummy data

**corpus**:
An adopter's own tree of real documents, never this repo's own synthetic material.
A tier root under `fixtures/conformance/`, and `fixtures/llm-wiki/`, are synthetic repo roots, not
corpora. `fixtures/conformance/` itself is neither: it holds corpus tiers. A corpus is
bounded by its root: a symlink whose target resolves outside the root is not part of it, and a tree
holding one is refused rather than read, because a verdict that depends on bytes outside the root is
a verdict the caller never asked for.
_Avoid_ as a name for this: fixture corpus, test corpus

**corpus member**:
An entry the walk admits: a markdown file under the root, or a symlink to one whose target resolves
inside the root. Distinct from a **Governed file**, which is the subset of members some Rule matches.
_Avoid_ as a name for this: collected file, walked file, tracked file

**read outcome**:
What the gate answers for one path: `text`, `absent`, or `unreadable`. It is an answer and never a
throw — what a failure means is the caller's to decide, so the gate reports what it found and stops
there.
_Avoid_ as a name for this: read result, file state, read error

### Dependency governance

**Admission bar**:
The four network signals — GitHub stars, contributor breadth, npm weekly downloads, and a
recent release or maintainer reply — a candidate dependency is screened against before a
human may approve adding it. It screens candidates _out_; it never admits one, and clearing
every signal is not a substitute for the human decision. Every signal is a live network fact,
so applying the bar is a review duty, never a mechanical check.
_Avoid_: dependency policy, vetting checklist, approval gate
