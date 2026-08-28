# Architecture vision

The tenets `markdown-harness` is built on, and the reasoning that produced each one.

**Not a decision record.** Decisions live in `.archgate/adrs/` (governance) and `docs/design-adr/`
(design). A tenet here is the standing reason a decision will be made one way; several are not yet
recorded anywhere as decisions, on purpose.

Product-level reasoning — the promise, the roles, the boundaries — is in
[`product.md`](./product.md). This document does not repeat it.

## Deriving a decision from this

Run all four. A "no" on 3 or 4 is a stop, not a trade-off.

1. **Which tenet does the change rest on, and which does it strain?** Naming both is the work; a
   change that strains none is usually a change that does nothing.
2. **Does it add a dependency?** Then tenet 7's procedure applies, and the outcome is recorded, not
   assumed.
3. **Does it change the contract** — the config language, the report format, or what the fixture
   corpus asserts? Then it is a change to the portable surface (tenet 4), and the corpus must cover
   it in the same change.
4. **Does it put `markdown-harness` on the consumption path, or make the check path non-hermetic?** Both are
   stops. Tenets 2 and 3 are the two the product cannot survive losing.

## Tenets

### 1. A deterministic core, providing steering that assists the host harness

The core never guesses: every check is a comparison a human could reproduce by hand. It does not own
governance — a host harness has rules, permissions and hooks of its own — so this contributes
steering to governance that already exists rather than replacing it.

### 2. The file carries the signal

`markdown-harness` is on the **authoring path** — steering before a write, checking after — and never
required on the **consumption path**. A reader that has never heard of it still sees `stale_after` when
it opens the document. A signal only visible by running our command is not a signal.

### 3. The check path is hermetic

No network, no model, no external service, no git call. The same tree in gives the same result out.
That single property is what lets one implementation be correct on a laptop with no connection and in
a pipeline, without a second code path for either.

### 4. The contract is the portable artifact

The config language, the report format and the fixture corpus are the specification; the TypeScript
is one implementation of it. A reimplementation in another language is then verified against the
corpus rather than reverse-engineered from source — which is what makes "usable without Node" a
packaging problem rather than a rewrite.

### 5. One config, ordered rules, first match wins, nothing merges

For any file the first matching Rule is the complete set of Constraints. Anchored in the harvested
research on both sides:

- **First-match-wins is precedented** — `parts/markdownlint-obsidian.md:185` ("first match wins, not
  last, not most-specific"), `frontmatter-linter-config.md:159`, `pathrule-precedence.md:570`.
- **The alternatives failed in production** — Jekyll ranks scopes by `new_path.length`, the byte
  length of the scope string (`frontmatter-linter-config.md:129`), and its `path_is_subpath?` is a
  bare `path.start_with?`, so a rule for `docs/log` silently captures `docs/logging/`
  (`frontmatter-linter-config.md:226-227`).

The cost is accepted and known: a single winner means every losing Rule is silent, which is precisely
why answering "what governs this path?" is a headline feature rather than a debugging aid.

### 6. Governance is opt-in by path

A fresh install reports zero violations against a corpus it has never seen. A file no Rule names is
invisible — never reported, never counted. Anchored: `"default": false` is proven prior art,
defaulted the wrong way — _"When no configuration object is passed or the optional `default` setting
is not present, all rules are enabled"_ (`parts/markdownlint-obsidian.md:547-551`). Keep the key,
flip the default. The reason is adoption: a checker that reports two hundred violations on install gets
uninstalled.

### 7. Dependencies are admitted by a stated procedure, not a count

A fixed budget would be a number invented before the scope is known. The procedure, in order:

1. Prefer the standard library — check it before searching a registry.
2. **Build it** when the code is small and a defect would be **loud** (a crash, a visibly wrong
   report).
3. **Buy it** when a defect would be **silent** — a misparsed value in a trust tool is the worst
   available bug.
4. Weigh transitive count, install scripts and licence before reputation.

Popularity and recency screen candidates out; they never justify one in. This tenet is where an
archgate ADR belongs, since the count is trivially checkable and the judgment is not.

### 8. No mutation without an explicit command

`check` reports and never writes. If checking could modify files, a green result would stop meaning
_this corpus was already correct_ and start meaning _it is correct now, after I changed it_ — and
only the first is evidence. Whatever writes eventually exist, they are reached by asking.

### 9. Two ways of using it — described, not decided

One with a human present: interactive, driven by a small number of skills the user runs alongside
their own. One AFK: a scheduled run whose output is a report a human ingests as conversation later.
Both are real usage patterns. How they are built is open, and nothing here should be read as settling
it.

### 10. Detection over prevention

Nothing here can stop a person or an agent from relaxing a rule. Everything here can make the
relaxation visible. Prevention was never on offer, and a guarantee of it would be the kind that
quietly stops being true — which is the failure mode the product exists to prevent.

### 11. Integration is layered

The floor asks a host harness for nothing but the ability to read a file. Every additional guarantee
— steering at write time, usage observation, enforcement — is an optional, host-specific layer whose
absence leaves the floor intact. This is what keeps a Claude Desktop user and a Claude Code user
inside the same product, and it is why no single integration mechanism gets to be load-bearing.

## Four decisions that are cheap now and expensive later

Each is cheap because the surface is small today, and expensive later because retrofitting means
re-deriving intent from code, or changing something adopters already depend on.

### Every constraint key needs a declared loosening direction

Tenet 10 works by diffing a config against its git base and answering _"is this looser?"_ — which
requires knowing, per key, which way loose runs. Most keys are obvious once asked (`maxLength` up is
looser, `presence: required → optional` is looser, deleting a Rule is looser). At least one is not:
**a changed `pattern` is undecidable**, because regex containment is not practically computable, so it
must flag unconditionally.

Cheap now: one property per key, on about a dozen keys. Expensive later: a detection pass that
silently misses half the keys, which is **worse than none**, because it certifies.

This also retroactively explains a choice already made — a shape-agnostic `min` would have had an
_ambiguous_ direction, so splitting it into `minLength` and `minItems` was load-bearing for a reason
nobody had written down.

### The config needs one canonical serialization

A config-authoring UI is on the roadmap, and the config diff is the human review surface tenet 10
depends on. Measured: the `yaml` document API preserves comments through a programmatic edit, but
reformats flow collections (`[a]` becomes `[ a ]`). Comment-safe is not byte-exact, and diff noise
attacks detection directly.

Cheap now: pick the formatting `markdown-harness` always emits, and normalise on every write, so a UI edit and
a hand edit produce identical bytes. Expensive later: re-normalising configs adopters already have.

### The fixture corpus is declared a specification, not a test suite

This is the action tenet 4 requires, and it is a decision rather than a project: the corpus already
exists. Declaring it means its expected reports are frozen deliberately and a change to them is a
contract change.

Cheap now: a statement plus a convention. Expensive later: recovering intent from assertions written
for a different purpose.

### Glob semantics are written into the specification

Under tenet 4 the config language is public, so path matching is public behaviour. Delegating to a
library or a runtime built-in is fine; inheriting undocumented semantics from one is not, because a
future port has nothing to hit.

Measured, and relevant: Node 26's `path.matchesGlob` is segment-aware — `docs/logging/x.md` against
`docs/log/**` is `false`, which is exactly the Jekyll defect in tenet 5. Good behaviour to adopt,
and still behaviour that must be written down rather than assumed.

## Deliberately open

Named here so their absence reads as a choice rather than an oversight: the steering channel and
whether MCP ships; what happens when a document goes stale, as opposed to how staleness is detected;
severity tiers, which are contested rather than merely undecided; suppression; the report format;
the config filename; and the shape of the second Module, which is aimed at reviewability.
