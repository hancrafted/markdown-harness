# markdown-harness

`CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.

## Naming

Two things in play are called harnesses, and the industry calls a Host harness a harness too. Always qualify:

- **`markdown-harness`** — this product.
- **Host harness** — the agentic CLI running the agent: Claude Code, Codex, Antigravity.

Bare "harness" is ambiguous. Ask which is meant. With nobody there to ask, name both readings and proceed with the one the current file path implies.

## Decision records

Two separate systems, never interchangeable:

- **ADR** — Archgate governance records in `.archgate/adrs/` (`ARCH-001`, `BE-001`, …). Created and edited **only** by `archgate:adr-author`; other skills delegate to it.
- **design-ADR** — design decisions from the Matt Pocock skills in `docs/design-adr/` (`0001-slug.md`), each starting with `type: design-adr` as the first frontmatter field.

Use the precise term. The Matt Pocock skill files still say ADRs live in `docs/adr/` — in this repo they don't; see `docs/agents/domain.md`.

## Vision

Neither file below is a decision record. They hold the reasoning decisions get derived from, and each opens with the test to run before proposing anything.

- `docs/vision/product.md` — the promise, the two roles, the boundaries, the horizons. Read before proposing a feature, arguing scope, or writing adopter-facing copy.
- `docs/vision/architecture.md` — the tenets, and four decisions that are cheap now and expensive later. Read before adding a dependency, a config key, a write path, or an integration surface.
- Issue #1 — provisional feature decisions, what was withdrawn and why, and every fact measured so far. Read before designing a feature, reopening a trade-off, or measuring something a second time.

## Code layout

Packages under `src/packages/` are deep modules, and dependency-cruiser enforces it at `error`.
Read [src/packages/README.md](./src/packages/README.md) before adding a package, adding an entry
point, or importing one. In short: a package's public surface is its **root files**, anything in a
subfolder is private, and that holds for its own tests too.

`src/cli.ts` is root code, outside every package, and the only file in the SHIPPED product that
touches disk — ESLint bans `node:fs` and the network builtins from `src/packages/**`. Two things
outside the product also touch disk and are not exceptions to it: test helpers that play the
caller's edge, and the repo's own scripts under `scripts/`.

**There is no build step.** `bin` points straight at `./src/cli.ts` and every script is
`node src/cli.ts`, so Node's strip-only TypeScript mode is the runtime and only ERASABLE syntax
runs. `enum`, `namespace` and parameter properties fail with
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — measured, and `tsc` accepted them happily until
`erasableSyntaxOnly` was set in `tsconfig.json`. Do not remove that flag: without it the failure
moves from `npm run verify` back to whoever next runs the CLI. For a closed set of named
constants use a `const` object with `as const` plus a `(typeof X)[keyof typeof X]` union, which
gives everything `enum` would and erases.

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`hancrafted/markdown-harness`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, design-ADRs in `docs/design-adr/`. See `docs/agents/domain.md`.
