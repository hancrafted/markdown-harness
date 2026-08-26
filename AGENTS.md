# markdown-harness

`CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.

## Decision records

Two separate systems, never interchangeable:

- **ADR** — Archgate governance records in `.archgate/adrs/` (`ARCH-001`, `BE-001`, …). Created and edited **only** by `archgate:adr-author`; other skills delegate to it.
- **design-ADR** — design decisions from the Matt Pocock skills in `docs/design-adr/` (`0001-slug.md`), each starting with `type: design-adr` as the first frontmatter field.

Use the precise term. The Matt Pocock skill files still say ADRs live in `docs/adr/` — in this repo they don't; see `docs/agents/domain.md`.

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`hancrafted/markdown-harness`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, design-ADRs in `docs/design-adr/`. See `docs/agents/domain.md`.
