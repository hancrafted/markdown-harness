# markdown-harness

`CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.

## Reporting back

Answers are notes, not prose. Drop articles, copulas and hedges; keep nouns, numbers and paths — `verify green; 3 files changed; ARCH-004 warning on render.pure.ts` beats a sentence saying the same. Grammar is the first thing to spend when an answer gets long.

This governs what you say back in chat. Documents, commit messages and issue bodies stay in full sentences.

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

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`hancrafted/markdown-harness`), managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Grilling rounds

Every grilling round — `/grill-me`, `/grill-with-docs`, or the grilling Wayfinder runs while charting a map or resolving a `wayfinder:grilling` ticket — uses this repo's round format, which overrides the grilling skill's own. See `docs/agents/grilling-format.md`. A spoken session overrides that format in turn; see `docs/agents/grilling-voice.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, design-ADRs in `docs/design-adr/`. See `docs/agents/domain.md`.

## Releasing

Only a `v*` tag publishes; merging `main` publishes nothing. The manual path is the contract and must work with no skill installed — it is in `docs/agents/release.md`, with the three ways a release fails silently.

## Source layout

Packages under `src/packages/` are deep modules, and every file carries exactly one classifier — by position at a Package root, by suffix below it. Read [`src/packages/AGENTS.md`](./src/packages/AGENTS.md) before adding, naming, or importing a file there — `src/packages/CLAUDE.md` is a symlink to it, so it also loads on its own. Skills live in `.agents/skills/`, and every `.claude/skills/<name>` is a symlink into it — `grep -r` and `find -type f` stop at a symlink, so both report an empty answer over `.claude/skills/` rather than a partial one. Use `grep -R` or `find -L` when a sweep has to reach a skill.

## Verification

`npm run verify` is the gate, and any check inside it can go **vacuous green** — report success over nothing. Before trusting a check that passed, break what it guards and watch it go red.

Thirteen measured traps live in [`docs/agents/verification.md`](./docs/agents/verification.md), numbered and cited by number from elsewhere in the repo. Each line below is a symptom only; the measurement behind it and the fix are in the doc.

1. `archgate check` is changed-files-scoped — `total: 0` means nothing in scope changed.
2. `verify` in an agent worktree — `knip` and `eslint` fail on the location, not the diff.
3. ADR size budgets count characters, not the bytes `wc -c` reports.
4. An enforcer's rule count comes from evaluating its array, never from grepping it.
5. `dependency-cruiser` and archgate both erase types — a type-only file shows no edges and an empty AST.
6. `briefingWarnings` is empty today, so a warning in it is yours.
7. `prettier --write .` bricks content-pinned trees, and the refusal blames drift.
8. `vitest` never typechecks — run `tsc --noEmit` beside a single-file run.
9. A process-boundary suite spawns `dist/`, which may be the previous build — build beside it.
10. A hook reported `wired` is not one that will run — the watcher can miss the write, and a `Read` matcher never sees `Bash cat`.
11. Nothing under `.agents/skills/` is reached by the gate except `prettier` — no ADR glob covers it, and `eslint` configures no rule for its `.mjs`.
12. A git ref lookup reports success over nothing — `ls-remote` exits 0 on a missing ref, and an annotated tag needs `^{}` to reach its commit.
13. A gate appended to `verify` never runs on a PR — `ci.yml` duplicates that chain instead of invoking it.
