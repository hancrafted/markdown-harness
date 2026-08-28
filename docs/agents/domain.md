# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Two kinds of decision record

This repo runs both Archgate and the Matt Pocock engineering skills, and each keeps its own decision records. They are **not** the same thing and must never be written to the same place:

| Term           | Owner                       | Lives in           | Written by                                                                            |
| -------------- | --------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| **ADR**        | Archgate (governance)       | `.archgate/adrs/`  | `archgate:adr-author` only, via the `archgate adr` CLI                                |
| **design-ADR** | Matt Pocock skills (design) | `docs/design-adr/` | `/domain-modeling` (reached via `/grill-with-docs`, `/improve-codebase-architecture`) |

Say "ADR" only for an Archgate record and "design-ADR" only for a `docs/design-adr/` record. When either could be meant, name it in full.

### Which one — the altitude test

The table says where each record lives. It does not say which one a given decision belongs in. Altitude decides that:

> **If the next feature could make the record wrong, it was written at the wrong altitude.**

An ADR records an **ADR Discipline**: one universal constraint on how the code is written. "Exported type declarations live in one file" survives any feature, so it is an ADR. "Every constraint key declares a loosening direction" does not — a second Module may have no constraint keys at all — so it is a design-ADR.

Product contracts are never ADRs, however architectural they feel. The config language, resolution semantics, the command surface, exit codes and the report format are contract decisions, and their home is `src/config/contract.ts`, the fixture corpus, and design-ADRs. Adopters never receive `.archgate/`, so the portable contract is the one thing an ADR must not hold. The predecessor repo is the cautionary case: it put feature governance into Archgate and ended with a 32 KB rule engine reachable from nothing.

The derivation is `docs/design-adr/0002-archgate-records-disciplines-scoped-by-glob.md`; the test above is its operative summary.

**This overrides the skill files.** `domain-modeling/SKILL.md` and `domain-modeling/ADR-FORMAT.md` say ADRs live in `docs/adr/` with no frontmatter. In this repo they don't: they are design-ADRs, they live in `docs/design-adr/`, and they carry the frontmatter below. Ignore the vendored default; those files are lock-managed copies that get overwritten on skill update, so don't edit them to match.

### design-ADR format

Sequential numbering, `docs/design-adr/0001-slug.md`, created lazily — only when the first one is needed. Scan `docs/design-adr/` for the highest number and increment. Every design-ADR starts with `type: design-adr` as the **first frontmatter field**:

```md
---
type: design-adr
---

# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's the whole requirement. A design-ADR can be a single paragraph — the value is in recording _that_ a decision was made and _why_. Any other frontmatter (`status`, etc.) is optional and goes after `type`. Everything else in `domain-modeling/ADR-FORMAT.md` — when a decision qualifies, the optional sections — still applies.

Never hand-write into `.archgate/adrs/`. If a decision belongs to Archgate governance, delegate to `archgate:adr-author`.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/design-adr/`**: read design-ADRs that touch the area you're about to work in
- **`.archgate/adrs/`**: read the Archgate ADRs governing that area (`archgate adr list`, then `archgate adr show <id>`)

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates `CONTEXT.md` and design-ADRs lazily when terms or decisions actually get resolved.

## File structure

This is a single-context repo:

```
/
├── CONTEXT.md
├── docs/
│   ├── agents/                         ← skill configuration (this file)
│   └── design-adr/                     ← design decisions (Matt Pocock skills)
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
├── .archgate/adrs/                     ← governance ADRs (Archgate)
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts

If your output contradicts an existing record, surface it explicitly rather than silently overriding, and name which kind it is:

> _Contradicts design-ADR-0007 (event-sourced orders), but worth reopening because…_

> _Contradicts ARCH-003 (event-sourced orders), but worth reopening because…_

An Archgate ADR is governance: a conflict there is a blocker to raise, not a trade-off to weigh on your own.
