---
type: design-adr
status: accepted
---

# Archgate ADRs record Disciplines, scoped one per glob

`okf-frontmatter-harness#32` proposed six governance ADRs organised by product topic — module
boundaries, the config language, path resolution, the CLI surface, testing — each declaring
`paths: ['src/**/*.ts']`. Grilling that proposal moved three things at once, and they are recorded
together because the second and third are derived from the first. An archgate ADR records an **ADR
Discipline**: one universal constraint on how code is written, at an altitude no future feature can
invalidate. Disciplines are grouped into ADRs **by the glob they need**, never by topic. And archgate
is one of three enforcers with no overlap between them, because its unique capability is not checking
but steering — the ADR body loads into agent context _before_ the code is written.

## Considered options

**The ADR states the product contract** — #32's scoping of `ARCH-002-config-language`: "one root
config, module sections, rule/constraint keys, `allowed` records, the two exclusivity rules."
Rejected on two settled premises that combine. #32 itself decides archgate is **internal only, never
shipped**; `docs/vision/architecture.md` tenet 4 decides that "the config language, the report format
and the fixture corpus **are** the specification; the TypeScript is one implementation of it."
Together they mean the portable contract is the one thing an archgate ADR must not hold, because
adopters and any reimplementation never receive `.archgate/`. `src/config/contract.ts` already
carries every item on that list, with the two exclusivity rules modelled as unrepresentable states —
which the compiler enforces and prose cannot.

The generalisation is the altitude test: **if the next feature could make the record wrong, it was
written at the wrong altitude.** "Exported type declarations live in one file" survives any feature.
"Every constraint key declares a loosening direction" does not — a second Module may have no
constraint keys at all. The predecessor repo is the cautionary case: it put feature governance into
archgate and ended with a 32 KB rule engine reachable from nothing.

**Group Disciplines by topic.** Rejected because an ADR's `paths:` is the union of what all its
Disciplines govern, so splitting Disciplines that share a glob buys no precision and costs a
frontmatter block, a `## Context` and a `## References` section apiece. Under #32's shape four ADRs
load when one source file is opened, and all four had the same glob.

**Group Disciplines by subtree** (`src/core/**`, `src/cli/**`). Rejected because Disciplines are
orthogonal to subtrees: "no I/O outside `*.impure.ts`" applies to every subtree, so it is either
duplicated into each — copies that drift, with no mechanism to detect a duplicated Discipline — or
hoisted into a broad ADR, which reintroduces the glob the split was meant to avoid.

**Archgate as the single enforcer.** Rejected on measurement. `verify` already chains four mechanical
enforcers, and `eslint.config.mjs` already governs coding practice with no ADR behind it —
`complexity: 7`, `max-lines-per-function: 30`, `max-params: 3`, `max-depth: 3`, `max-lines: 250`.
Import boundaries are already written, at `error` severity, in the vendored `setup-ts-deep-modules`
skill's dependency-cruiser config. Two enforcers holding one invariant is how invariants drift. What
archgate has that the others lack is timing: ESLint reports after the code is written, while a
`.claude/rules/` symlink loads the ADR on **Read**, before. That is the same shape as the product's
own tenet 2 — act on the authoring path, never the consumption path.

## Consequences

1. **`ARCH-002-config-language` will never exist**, and two committed files already name it. The
   closing line of `0001-no-key-order-constraint.md` assigned its points 1–3 to that ADR, and issue
   #1 §F assigned the `frontmatter:` double-meaning to it. Both are re-aimed at design-ADRs. A
   dangling pointer to a governance document that was deliberately never written is worse than
   silence, because a future agent will try to satisfy it by creating one.
2. **Enforcement is divided three ways with no overlap.** ESLint owns within-file shape;
   dependency-cruiser owns the import graph; archgate owns steering plus rules for cross-artifact
   invariants nothing else can see — the shape `GEN-001`'s own `adr-claude-rules-symlink` and
   `adr-rules-test-sibling` rules already have. The order when choosing is: an existing plugin, else
   core-rule configuration, else an archgate rule, and never an authored ESLint rule. Every ADR's
   `## Compliance and Enforcement` section names which enforcer holds each Discipline, which is what
   stops the division from decaying into folklore.
3. **`paths:` is a context router, and size is therefore a gate.** `GEN-001` measures 19,763 bytes ≈
   4,940 tokens, loaded uncapped on every matching Read. Five vendors publish size budgets for
   glob-loaded rule files that disagree fivefold with no supporting evidence; Windsurf's **12,000
   characters** is the only hard limit any of them states, so it is adopted — the strictest published
   consumer, which also keeps these files portable now that `.claude/rules/` is read by more than one
   harness. `typescript-ai-harness`'s `GEN-003-frontmatter.md` proves the budget achievable at
   6,214 bytes for three decisions and two rules, by delegating its enumeration to a non-ADR
   reference file rather than restating it.
4. **The per-Read total is measured, never capped.** A file may legitimately be governed by several
   Disciplines, so a ceiling would forbid a load that is justified. Instead the total is reported, and
   growth is visible in review — `docs/vision/architecture.md` tenet 10 applied to our own
   governance. Claude Code's `InstructionsLoaded` hook with matcher `path_glob_match` makes this
   observable rather than inferred.
5. **A closed filename-suffix vocabulary is what makes the glob split possible, and it is a probe.**
   Precision is bounded by what filenames let a glob select, so `src/**/*.ts` carries exactly one
   suffix from `index.ts` · `*.types.ts` · `*.pure.ts` · `*.impure.ts` · `*.test.ts` — mandatory, no
   stacking, no escape. `pure`/`impure` is an exact partition, so totality is provable rather than
   assumed. Both `docs/research/file-naming-for-glob-routing.md` and
   `docs/research/code-role-naming.md` find **no industry precedent** for naming files so globs can
   route governance, and no established name for the orchestration role — it has been renamed at
   least six times in thirty years. So this is unbroken ground, entered deliberately: the scheme is
   evaluated against measured `InstructionsLoaded` output after the first migration, and **the
   documented fallback if it fails is no suffix at all.**
6. **Adopting a suffix requires a design merit first.** Glob addressability is a stated tiebreaker,
   never the reason — otherwise the codebase ends up carrying conventions whose only justification is
   our filing system, which is the error the predecessor repo made in the opposite direction.
7. **When governance is silent, an agent stops rather than guesses.** A closed vocabulary guarantees
   that some file will eventually fit nothing, and the failure mode of precise routing is
   confidently-wrong routing: a guess into a legal-but-wrong classifier passes every mechanical
   check. The rule is citable rather than invented — Google's C++ Style Guide ("the absence of a
   prohibition is not the same as a license to proceed… please don't hesitate to ask") and PEP 20
   ("In the face of ambiguity, refuse the temptation to guess") — and its transferable shape is
   two-part: ask, **and** name the safe default while waiting, which this repo's `AGENTS.md` line 12
   already does. No AI-agent vendor documents the directive; five frameworks were probed and returned
   nothing.
8. **This decides nothing about the product's own behaviour.** The config language, resolution
   semantics, the command surface, exit codes and the report format are unaffected — they are
   contract decisions and their home is `src/config/contract.ts`, the fixture corpus, and further
   design-ADRs. Several remain genuinely open in issue #1 and are not settled here by implication.

The governing records derived from this live in `.archgate/adrs/`, written by `archgate:adr-author`.
The altitude test itself belongs in `docs/agents/domain.md`, beside the two-record-systems table it
arbitrates; this document is its citation.
