# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Two kinds of decision record

This repo runs both Archgate and the Matt Pocock engineering skills, and each keeps its own decision records. They are **not** the same thing and must never be written to the same place:

| Term           | Owner                       | Lives in           | Written by                                                                            |
| -------------- | --------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| **ADR**        | Archgate (governance)       | `.archgate/adrs/`  | `archgate:adr-author` only, via the `archgate adr` CLI                                |
| **design-ADR** | Matt Pocock skills (design) | `docs/design-adr/` | `/domain-modeling` (reached via `/grill-with-docs`, `/improve-codebase-architecture`) |

Say "ADR" only for an Archgate record and "design-ADR" only for a `docs/design-adr/` record. When either could be meant, name it in full.

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
