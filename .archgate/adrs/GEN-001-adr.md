---
type: adr
id: GEN-001
title: 'ADR Contract'
domain: general
rules: true
files: ['.archgate/adrs/**/*.{md,ts}']
paths: ['.archgate/adrs/**/*.{md,ts}']
description: 'The shape contract every ADR under .archgate/adrs/ obeys: frontmatter bundle and order, six canonical sections, authoring discipline, a size budget, and companion rules-file duties.'
---

# ADR Contract

## Context

An ADR records an **ADR Discipline**: one universal constraint on how code is written, at an altitude no future feature can invalidate. An **ADR rule** is the mechanical check a Discipline earns in a companion `.rules.ts`; a Discipline may have none. Feature- and contract-shaped reasoning belongs in a design-ADR — if the next feature could make the record wrong, the altitude is wrong.

This ADR pins the shape every other ADR relies on. `archgate check` gates it at commit and push.

Rejected alternative: convention plus review. A shape held by habit forks on the first ADR written by an agent that never read a prior one.

## Decision

### 1. Scope and self-hosting

1. This contract governs every `<PREFIX>-<NNN>-<slug>.{md,ts}` file under `.archgate/adrs/`.
2. GEN-001 is self-hosting — its own bundle satisfies every rule below, the size budget included. Exempting the ADR that governs all ADRs voids the contract.
3. Universal frontmatter semantics and cross-harness INDEX routing are out of scope.
4. `.archgate/adrs/` MUST stay flat: every non-hidden file a top-level `<PREFIX>-<NNN>-<slug>` `.md`, `.rules.ts`, or `.rules.test.ts`, each rules or test file backed by its `.md`. archgate discovers ADRs by frontmatter, not filename, so a nested or misnamed file governs unseen and an ADR-less `.rules.ts` is inert. (📜 Rule: `adr-governed-files`)

### 2. Frontmatter contract (📜 Rule: `adr-frontmatter`)

1. Keys `type`, `id`, `title`, `domain`, `rules`, `files` MUST be present and non-empty; `paths` is optional and additional keys MAY follow it.
2. Field order MUST be exactly `type → id → title → domain → rules → files → paths`; `type` leads for recognisability, not for parsing.
3. `type` MUST be `adr`; `id` MUST match the filename prefix; `domain` MUST be a registered archgate domain, built-in or declared in `.archgate/config.json`.
4. `rules: true` MUST have a sibling `<basename>.rules.ts`, and an existing sibling MUST declare `rules: true`.
5. `files:` scopes `archgate check` and populates `ctx.scopedFiles`. Omitted, it defaults to every project file — an ADR's rules then run on changes they have no business judging.
6. `paths:` is not an archgate key but used in Claude Code, if this ADR is symlinked as rule. It can differ from files.
7. **Check broad, steer narrow.** The two globs MAY differ on purpose: `files:` covers everything a rule must inspect, `paths:` only the author who can act. Exploit the asymmetry; never mirror it by habit.
8. Both globs MUST be inline YAML flow lists — `['glob']`. A block-style, bare, or null value parses as empty and silently drops that channel's scope. (📜 Rule: `adr-glob-inline`)

### 3. Required sections (📜 Rule: `adr-required-sections`)

1. Every ADR MUST carry all six canonical H2 headings — exact text, presence-only, fenced blocks excluded: `## Context`, `## Decision`, `## Do's and Don'ts`, `## Consequences`, `## Compliance and Enforcement`, `## References`. Additional sections are permitted.
2. `## Compliance and Enforcement` MUST name, per Discipline, its enforcer and that enforcer's config location — eslint `no-restricted-syntax` in `eslint.config.mjs`, a named dependency-cruiser rule, an archgate rule, or "not mechanically enforced — review duty". Presence is linted; naming is a review duty.

### 4. Size budget (📜 Rule: `adr-size-budget`)

1. An ADR markdown file MUST stay under 12,000 characters — Windsurf's cap, the only hard published limit among five vendors disagreeing fivefold.
2. `paths:` makes an ADR a context router, so length is paid on every matching Read. Split Disciplines by glob before trimming one below usefulness.
3. Per-Read total across matching ADRs is measured and reported, never capped — a file may legitimately carry several Disciplines.

### 5. Authoring discipline

Items 1–4 are machine-checked shape; 5–10 the prose standard, applied by `archgate:adr-author` and upheld in review.

1. Number Decision anchors `### N.` from 1; keep each anchor's first-level items a sequential ordered list, never loose bullets. (📜 Rule: `adr-numbered-decision`)
2. Head the blocks `### Do's` then `### Don'ts`, each an ordered list restarting at 1, every item keeping its bold `**DO**` / `**DON'T**` prefix; without the heading break the restart never renders. (📜 Rule: `adr-numbered-dos-donts`)
3. Anchor every companion rule to prose twice: a Decision-side marker on the anchor that decides it, and a Do's/Don'ts marker naming that anchor. Pairing matches names, never rule bodies. (📜 Rule: `adr-rule-mentions`)
4. Never write the retired `[review]` tag outside a code span; record the obligation under Manual review duties. (📜 Rule: `adr-no-review-tag`)
5. **Root** — cut any sentence that does not steer authoring of a governed file.
6. **Altitude** — state the rule and its architectural why; cite the companion `.rules.ts` rather than transcribing its constants.
7. **History** — none. No chronology, no "previously"; state a rejected alternative as a live tradeoff.
8. **Density** — one idea per item, point first; let inline code name a thing rather than carry the sentence.
9. **Machinery** — keep Consequences and Compliance lean: the live tradeoff and the enforcement surface, mechanism left to the rules file.
10. **Audience** — pitch at the authors of the files this ADR's `paths:` governs, and drop mechanics that never reach them.

### 6. Companion rules-file discipline

1. Every `<ID>-<slug>.rules.ts` MUST have a sibling `.rules.test.ts` covering each rule's pass and fail path. (📜 Rule: `adr-rules-test-sibling`)
2. Every rule MUST embed the provenance tag `(<ID> [<rule-key>])` in each report message, so a failure names its ADR and rule. (📜 Rule: `adr-message-provenance`)

### 7. Enforcement tier

1. Every rule MUST run at `error`; a companion rules file MUST NOT declare a warning- or info-tier severity. (📜 Rule: `adr-error-tier`)

## Do's and Don'ts

### Do's

1. **DO** open every ADR with frontmatter in the order `type → id → title → domain → rules → files → paths`, `type: adr`, `id` matching the filename. (Decision 2, 📜 Rule: `adr-frontmatter`)
2. **DO** write `files:` and `paths:` as inline flow lists, each scoped for its own channel. (Decision 2, 📜 Rule: `adr-glob-inline`)
3. **DO** emit all six canonical H2 sections; empty bodies pass the linter but not review. (Decision 3, 📜 Rule: `adr-required-sections`)
4. **DO** keep every ADR markdown file under the character budget, this one included. (Decision 4, 📜 Rule: `adr-size-budget`)
5. **DO** number Decision anchors `### N.` from 1, with sequential ordered items inside each. (Decision 5, 📜 Rule: `adr-numbered-decision`)
6. **DO** head the blocks `### Do's` then `### Don'ts`, each restarting at 1 with its bold prefix. (Decision 5, 📜 Rule: `adr-numbered-dos-donts`)
7. **DO** anchor every companion rule to prose on both sides. (Decision 5, 📜 Rule: `adr-rule-mentions`)
8. **DO** give every `.rules.ts` a sibling `.rules.test.ts` exercising each rule's pass and fail path. (Decision 6, 📜 Rule: `adr-rules-test-sibling`)
9. **DO** embed `(<ID> [<rule-key>])` in every report message. (Decision 6, 📜 Rule: `adr-message-provenance`)
10. **DO** run every companion rule at the `error` tier. (Decision 7, 📜 Rule: `adr-error-tier`)

### Don'ts

1. **DON'T** omit `files:` — archgate then widens the check to every project file. (Decision 2)
2. **DON'T** park stray files, subdirectories, or ADR-less rules files under `.archgate/adrs/`. (Decision 1, 📜 Rule: `adr-governed-files`)
3. **DON'T** let the retired `[review]` tag resurface. (Decision 5, 📜 Rule: `adr-no-review-tag`)
4. **DON'T** exempt an ADR from the size budget or widen this contract beyond `.archgate/adrs/`. (Decision 4)
5. **DON'T** flip the enforcement tier or add rules outside an explicit ADR amendment. (Decision 7)

## Consequences

**Positive:**

1. **Fork-proof shape:** the frontmatter bundle, six sections and numbering are machine-held, not habit-held.
2. **Scoped checks:** `files:` keeps an ADR's rules off changes they have no business judging.
3. **Bounded context cost:** the budget caps what any one ADR adds to a matching Read.
4. **Dogfooded:** GEN-001's rules validate its own bundle on every `archgate check`.
5. **Rule ↔ prose traceability:** markers are checked both directions — no unmentioned rule, no marker naming a rule that does not exist.

**Negative:**

1. **Name-level pairing only:** markers pair names, not meanings. A marked sentence that outruns its rule reads as compliant, so alignment is a review duty.
2. **Regex meta-parsing:** the meta-rules parse YAML and TypeScript with regexes, making quoted kebab-case rule keys and inline flow globs load-bearing. AST hardening: [#7](https://github.com/hancrafted/typescript-ai-harness/issues/7).
3. **Authoring ceremony:** numbered anchors, subsection headings, twin markers, a sibling rules-test and provenance tags cost more than plain prose. Mitigated: `archgate:adr-author` encodes the shape and each message names its fix.
4. **The budget forces splits:** a Discipline set outgrowing the cap must split by glob, buying a frontmatter block and six sections per new ADR.

**Risks:**

1. **Two budgets disagree:** archgate's briefing budget caps `Decision` and `Do's and Don'ts` far below the whole-file cap, so a file under budget can still overflow a briefing. **Mitigation:** `archgate check` reports both figures every run; `--strict` promotes briefing overflow to a failure if adopted.
2. **Vendor drift:** the cap tracks one vendor's published limit, on no measured evidence. **Mitigation:** re-measure against Claude Code `InstructionsLoaded` output and amend this ADR rather than the rule alone.

## Compliance and Enforcement

**Enforcer per Discipline:** `GEN-001-adr.rules.ts` holds every Discipline above at the `error` tier (§7), scoped by `files:` to ADR bundle files, and is the source-of-truth for the full set. `.archgate/**` sits outside this repo's eslint and `tsc --noEmit` gates, so every rules file is self-contained; prettier and vitest cover `.archgate/**/*.ts`, and `archgate check` is the sole gate on ADR markdown.

**Second budget channel:** `archgate check` reports a per-section briefing budget over `Decision` and `Do's and Don'ts`, stricter than §4's whole-file cap and independent of it. `archgate check --strict` promotes those warnings to failures — not adopted here, since `--strict` also promotes suppression and unparsed-ADR warnings, a `verify`-pipeline decision of its own.

**Manual review duties** (never linted): each glob describes its channel's real scope; each rule's prose describes what that rule does (§5.3 pairs names, not meanings); section bodies are substantive, not presence-only placeholders; `## Compliance and Enforcement` names a real enforcer and config location (§3.2); the sibling test covers each rule's pass and fail path (§6.1); the prose obeys §5.5–§5.10.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [archgate](https://archgate.dev/) — `files:`, `ctx.scopedFiles`, registered domains, the deterministic rule model.
