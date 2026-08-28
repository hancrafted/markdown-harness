---
type: adr
id: ARCH-003
title: 'Testing'
domain: architecture
rules: false
files: ['**/*.test.ts']
paths: ['**/*.test.ts']
description: "What a test file may do and how it is shaped: six behavioural Don'ts that keep green meaningful everywhere, plus a three-block suite split, marked test bodies and two import homes under src/."
---

# Testing

## Context

A test suite is only valuable as long as green means the code is correct and red means the code broke, but authors—especially agents optimizing for a green signal—routinely introduce mocks, skips, and ambient shortcuts that silently destroy that evidence. This ADR establishes universal behavioral boundaries and uniform suite structure so passing tests remain trustworthy proof and unwritten cases stay visible.

## Decision

### 1. Determinism and Real Execution

1. **Tests MUST be fully deterministic**: all time, randomness, and inputs MUST be supplied explicitly with zero dependence on ambient state or network.
2. **Tests MUST provide real assertion value**: tests MUST execute real code against explicit expected values—mock frameworks (`vi.mock`/`vi.spyOn`), snapshots, skipped tests (`.skip`), and assertion-free bodies are forbidden.

### 2. Suite structure

1. Under `src/**/*.test.ts`, a top-level suite MUST split into exactly three `describe` blocks — `success cases`, `failure cases`, `edge cases` — each holding at least one test. There is no fourth name.
2. `describe` MUST NOT nest past two levels; a test MUST NOT sit at file top level.
3. `.archgate/adrs/*.rules.test.ts` is exempt from 2.1 — a rules test drives one rule function against a hand-built double, where a three-way split is ceremony over evidence. Decision 3 still binds it.

### 3. Test-body structure

1. Every test body MUST carry `// ARRANGE`, `// ACT` and `// ASSERT`, uppercase, exactly once each, in that order.
2. The `// ASSERT` block MUST NOT hold a magic string or number; name it in `// ARRANGE`, so a reviewer can disagree with it. Exempt as pure noise: `0`, `1`, `-1`, `true`, `false`, `null`, `undefined`, `''`, `[]`, `{}`. The ban stops at `// ASSERT` for now; extending it to `// ACT` is a one-line change.
3. An assertion MUST NOT collapse into a boolean inside `// ACT`. Doing so throws away the matcher message: `expect(seen).toContain(key)` names the key that is missing, while `expect(isSeen).toBe(true)` reports only that false is not true, which is the same report for every possible cause. Put the observation in `// ACT` and keep the rich matcher in `// ASSERT`.

### 4. Two homes for a test

1. `<pkg>/tests/*.test.ts` is the Package's integration suite: entry points only, at the grain a caller sees. Reach for it by default — it asserts what a caller can actually observe. `*.impure.ts` is exercised here too — through the entry point, never imported directly.
2. `<pkg>/<subfolder>/*.test.ts` is a unit suite. It MAY import `./*.pure.ts` — same directory, same base name — and no other internal, in any Package.

## Do's and Don'ts

### Do's

1. **DO** pass every instant, seed and input a test depends on into the test explicitly. (Decision 1.1)
2. **DO** write the expected value out by hand, so a reviewer can disagree with it. (Decision 1.2)
3. **DO** hand-write a stand-in when a collaborator must be substituted, and keep it in the test file where a reader can see what it does. (Decision 1.2)
4. **DO** split every suite under `src/` into `success cases`, `failure cases` and `edge cases`, with at least one test in each. (Decision 2.1)
5. **DO** treat a block you cannot fill as a question about the subject, not a rule to route around. (Decision 2.1)
6. **DO** mark every body `// ARRANGE`, `// ACT`, `// ASSERT`, naming expected values before asserting them. (Decision 3.1)
7. **DO** test a `*.pure.ts` file from its same-name sibling, and everything else through an entry point. (Decision 4.2)

### Don'ts

1. **DON'T** call `Date.now()`, `Math.random()`, `performance.now()`, or `new Date()` with no argument. (Decision 1.1)
2. **DON'T** commit `.only` or `.skip` on `it`, `test` or `describe`. (Decision 1.2)
3. **DON'T** write a test body with no `expect` in it. (Decision 1.2)
4. **DON'T** use `toMatchSnapshot`, `toMatchInlineSnapshot`, or any matcher ending in `Snapshot`. (Decision 1.2)
5. **DON'T** call `vi.mock`, `vi.doMock`, `vi.spyOn`, `vi.mocked`, `vi.stubGlobal`, or a `jest` equivalent. (Decision 1.2)
6. **DON'T** assert an expected value the code under test computed. (Decision 1.2)
7. **DON'T** inline a magic string or number in the `// ASSERT` block. (Decision 3.2)

## Consequences

### Positive

- **Tests are dependable evidence.** Mocks, skips, assertion-free bodies, and ambient state are mechanically blocked, ensuring green means correctness and red means real breakage.
- **Missing cases surface immediately.** The mandatory three-block split (`success cases`, `failure cases`, `edge cases`) forces unhandled errors and edge cases to be confronted explicitly.

### Negative

- **Collaborator substitution requires hand-written stand-ins.** In-file test doubles are more verbose than `vi.spyOn`, trading brevity for transparency.
- **Impure modules have no cheap unit tests.** Logic in `*.impure.ts` must be exercised through entry points against real files or refactored into pure units.

### Risks

- **Bans bypassed via helper imports.** Non-deterministic calls or mocks could hide behind local imports. **Mitigation:** dependency-cruiser constrains import graphs and code review inspects test utilities.
- **Stand-in complexity creep.** Hand-written doubles could accumulate hidden framework-like behavior. **Mitigation:** stand-ins must stay in the test file, keeping growth visible in diffs.

## Compliance and Enforcement

1. **Determinism & Real Execution (Decision 1)** — ESLint `no-restricted-syntax` and `no-restricted-properties` in `eslint.config.mjs` (`**/*.test.ts`). Ambient network calls are not mechanically checkable (review duty).
2. **Suite Structure (Decision 2)** — ESLint `no-restricted-syntax` in `eslint.config.mjs` (`src/**/*.test.ts`).
3. **Test-Body Structure (Decision 3)** — Inline ESLint rule `test-body-aaa` in `eslint.config.mjs`. Rich matcher usage is a review duty.
4. **Test Homes & Boundaries (Decision 4)** — Dependency-cruiser rules `tests-through-entrypoints` and `colocated-test-lane` in `.dependency-cruiser.cjs` (`npm run lint:boundaries`).
5. **Tautological Assertions** — Not mechanically checkable (review duty).

**Exceptions** are granted by amending this record, never by an inline suppression comment.

## References

- [Vitest Test API](https://vitest.dev/api/) — assertions, runner controls, and test lifecycle.
