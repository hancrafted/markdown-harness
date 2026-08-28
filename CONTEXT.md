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

**Core**:
The parts that know nothing about markdown frontmatter: config reading, path resolution, the
command surface, and reporting. It owns the config file and hands each Module its section.
_Avoid_: engine, runtime, kernel

**Module**:
A named checking domain that owns one section of the config and one family of checks;
`frontmatter-harness` is the first, and `frontmatter:` is its section. Narrower than the
general design sense used in `codebase-design`, where a module is anything with an interface
and an implementation.
_Avoid_: plugin, checker, rule pack

**Preset**:
A shipped config an adopter can adopt, amend, or ignore, with no privileged status and no
behaviour behind it. What makes a Preset honest is that deleting it changes nothing except
which Rules run.
_Avoid_: default, built-in, profile, ruleset

**Steering query**:
Asking what governs a path **before** the file is written, rather than checking it after. The
reason this is a CLI and an MCP server rather than a set of lint rules.
_Avoid_: lookup, dry run, preflight

### How the code is written

**Package**:
One folder under `src/packages/`, flat — a Package may not contain another. Its **root files**
are its entry points and are public; everything in a subfolder is private. A Package is a deep
module in the `codebase-design` sense. It is **not** a Module: a Module is a checking domain
and a Package is a unit of code, and neither implies the other.
_Avoid_: module (collides in both directions), library, workspace, folder

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
One entry in a Module's ordered rule list: a selector, a mandatory `intent`, and a payload.
For any file the first matching Rule is the complete set of Constraints that applies —
nothing merges and nothing is inherited.
_Avoid_: path rule, matcher, policy

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

### Dependency governance

**Admission bar**:
The four network signals — GitHub stars, contributor breadth, npm weekly downloads, and a
recent release or maintainer reply — a candidate dependency is screened against before a
human may approve adding it. It screens candidates _out_; it never admits one, and clearing
every signal is not a substitute for the human decision. Every signal is a live network fact,
so applying the bar is a review duty, never a mechanical check.
_Avoid_: dependency policy, vetting checklist, approval gate
