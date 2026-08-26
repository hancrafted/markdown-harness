# markdown-harness

A CLI and MCP steering API that reads one config, checks every governed markdown file, and
answers "what governs this path?" for an agent about to write one. `frontmatter-harness` is
the first module; OKF ships as a preset config rather than as behaviour.

Glossary only. Definitions live here; the mechanics of where each record lives and who
writes it live in `docs/agents/domain.md`.

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

**Harness**:
The package an adopter installs. Every decision here is constrained by having to work against
a repo it has never seen, from a dependency the adopter can upgrade — not by having to
survive being copied.
_Avoid_: framework, tool, plugin, template

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

### What the harness checks

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
derivable for reporting but declared in no single place.
_Avoid_: the types list, enum, taxonomy

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
