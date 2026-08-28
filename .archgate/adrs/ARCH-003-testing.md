---
type: adr
id: ARCH-003
title: 'Testing'
domain: architecture
rules: false
files: ['**/*.test.ts']
paths: ['**/*.test.ts']
description: 'What a test file may do: green must mean the test could have gone red, six behavioural Don ts that each close one way of breaking that, one named review duty, and why coverage is deliberately not gated.'
---

# Testing

## Context

This repository already holds that a check which cannot fail stops being evidence. A suite is the same instrument pointed at the code, and it fails the same way — quietly, while reporting success.

Every known failure mode is one of two clauses breaking:

1. **Green stops meaning anything.** A test with no assertion, a `.skip` left behind, a snapshot that re-blesses whatever the code now prints, a mock asserting against a stub of your own writing.
2. **Red stops meaning the code changed.** A clock, a random number, or a network call reached from inside a test — the suite now fails on Tuesdays.

The pressure is not hypothetical. Agents write most of the tests here, and an agent under pressure to reach a "done" signal will disable a test rather than fix the code. Measured on this project's tracker: coding-agent commits add mocks 36% of the time against 26% for non-agent commits, and the study behind that figure explicitly asks for mocking guidance in agent configuration files.

Alternatives considered:

- **Prose guidance only.** Rejected. It is what already existed, and it does not hold against an agent optimising for a green signal.
- **`eslint-plugin-vitest`.** Rejected. Every ban below is expressible with core `no-restricted-syntax` and `no-restricted-properties`, so the plugin buys nothing and costs a dependency that would have to clear an admission bar.
- **A coverage gate.** Rejected on the merits, not on effort — see §5 of the Decision.
- **`.skip` left legal**, on the reasoning that a skipped test is visible in the reporter. Overturned: visibility in a reporter nobody reads is not a control.

## Decision

### 1. The Discipline

A test result is evidence about the code. **Green MUST mean the test could have gone red; red MUST mean the code changed.** Every Don't below closes one way of breaking one of those clauses.

### 2. Scope

This record governs every `**/*.test.ts` file in the repository, wherever it sits — including the sibling tests of ADR rules files. It governs _behaviour_ inside a test. Structural shape — how suites are laid out, how a test body is ordered — is a separate concern and is not decided here.

### 3. The six behavioural Don'ts

1. **No clock, no randomness, no network.** A test MUST NOT read ambient state its assertions depend on.
2. **No `.only`, no `.skip`.** `.todo` remains legal: it declares intent and cannot turn a red build green.
3. **No assertion-free test.** A body containing no `expect` could not have gone red.
4. **No snapshot assertion.** State the expected value.
5. **No `vi.mock`, no `vi.spyOn`.** Exercise the real thing.
6. **No wrong-grain import.** A test reaches its subject at the grain its location declares.

### 4. One review duty, named as unenforceable

**No tautological assertion** — an expected value recomputed by the code under test. Such a test passes by construction. It is not mechanically checkable and MUST be caught in review.

### 5. Coverage is deliberately not gated

Coverage and mutation scores correlate with real defect detection only where the code under test is already correct, and a coverage target is satisfiable by exactly the assertion-free tests Don't 3 forbids. Coverage tooling remains available on demand and MUST NOT be wired into the verification gate.

## Do's and Don'ts

### Do's

1. **DO** pass every instant, seed and input a test depends on into the test explicitly.
2. **DO** use `.todo` to record a test you intend to write.
3. **DO** assert with `expect`, and let the matcher carry the message — `expect(seen).toContain(key)` names the missing key; comparing a precomputed boolean reports only that `false` is not `true`.
4. **DO** write the expected value out by hand, so a reviewer can disagree with it.
5. **DO** exercise the subject through the entry point its location implies, against real inputs.
6. **DO** build a hand-written stand-in when a collaborator must be substituted, and keep it in the test file where a reader can see what it does.
7. **DO** delete a test that no longer earns its runtime, rather than skipping it.

### Don'ts

1. **DON'T** call `Date.now()`, `Math.random()`, `performance.now()`, or `new Date()` with no argument.
2. **DON'T** commit `.only` or `.skip` on `it`, `test` or `describe`.
3. **DON'T** write a test body with no `expect` in it.
4. **DON'T** use `toMatchSnapshot`, `toMatchInlineSnapshot`, or any matcher ending in `Snapshot`.
5. **DON'T** call `vi.mock`, `vi.doMock`, `vi.spyOn`, `vi.mocked` or `vi.stubGlobal`, nor their `jest` equivalents.
6. **DON'T** collapse an assertion into a boolean before asserting on it — the matcher's diagnostic is the value being thrown away.
7. **DON'T** assert an expected value that the code under test computed.

## Consequences

### Positive

- **Green is evidence again.** The four ways a suite can report success without having tested anything are closed mechanically rather than by habit.
- **A failure names a cause.** With ambient reads gone, a red run means the code changed — nobody re-runs the suite to see if it passes this time.
- **Zero added dependencies.** Every ban is a core eslint rule already installed, so nothing here has to clear a dependency admission bar.
- **Agent-proof by construction.** The disable-the-test escape is unavailable rather than discouraged, which is the difference that matters when the author is optimising for a green signal.
- **Sibling ADR tests became visible.** Narrowing the linter's ignore brought four of this repo's six test files into scope for the first time; they had been ungoverned by every rule, not merely by this one.

### Negative

- **A genuine need for a mock arrives as a build failure.** That is intended — it forces a decision rather than a quiet commit — but the first person to hit it pays with an interruption.
- **Hand-written stand-ins are more verbose** than `vi.spyOn`, and the repository accepts that verbosity as the price of asserting against real behaviour.
- **The determinism bans over-reach slightly.** A test that legitimately wants a random input must name its seed, which is more ceremony than `Math.random()`.
- **Network is not mechanically closed.** The clause exists in the Discipline but only two of its three ambient sources are checkable — see Compliance.

### Risks

- **A ban is evaded through an alias or an import.** `import { now } from './clock'` defeats every single-file selector. **Mitigation:** the import graph is a separate enforcement layer with its own rule, and the tautology duty already puts a reviewer's eyes on test logic.
- **A hand-written stand-in grows into a mock framework.** Nothing stops a stub accumulating behaviour until it is the thing under test. **Mitigation:** stand-ins are required to live in the test file, where growth is visible in the diff rather than hidden behind an import.
- **The Don'ts are read as applying to structure too, and over-constrain.** **Mitigation:** the scope clause states plainly that structural shape is decided elsewhere.

## Compliance and Enforcement

Per Discipline, with its enforcer and that enforcer's location:

1. **Don't 2, 3, 4, 5** — eslint `no-restricted-syntax`, in the `**/*.test.ts` block of `eslint.config.mjs`. One selector each for `.only`/`.skip`, an `expect`-free body, a `Snapshot`-suffixed matcher, and the `vi`/`jest` mocking entry points.
2. **Don't 1, clock and randomness** — eslint `no-restricted-syntax` (the shared determinism selectors) plus `no-restricted-properties` (the shared nondeterministic-source list), same block, same file.
3. **Don't 1, network** — **not mechanically enforced, review duty.** No selector separates a network call from any other call, so this clause states more than any check holds.
4. **Don't 6** — dependency-cruiser rule `tests-through-entrypoints` in `.dependency-cruiser.cjs`, run by `npm run lint:boundaries`.
5. **The tautology duty** — **not mechanically enforced, review duty.** `esquery` cannot compare two sibling values, so nothing can see that an expected value was recomputed by the subject.

Three limits are recorded rather than papered over:

1. **The mocking ban covers the API, not the idea.** It forbids the `vi` and `jest` mocking entry points. A hand-written stand-in — which this repository uses in its own ADR rules tests — is untouched, deliberately: it is visible in the file, and visibility is the property that made mocking objectionable.
2. **No single-file selector closes the import hole.** A nondeterministic source reached through a local import is invisible to every rule above.
3. **Coverage gates nothing, by decision.** `@vitest/coverage-v8` remains wired as the provider in `vitest.config.ts` so coverage can be produced on demand. It MUST NOT become a threshold in the verification gate.

**Visibility precondition.** These checks are worthless against a file the linter cannot see. The linter's ignore list therefore names archgate rules files individually instead of ignoring that directory as a subtree, because a subtree ignore cannot be undone — a negated pattern inside an ignored directory silently keeps the files invisible, which is the failure this record exists to prevent.

**Exceptions** are granted by amending this record, never by an inline suppression comment.

## References

- [ESLint `no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax) and [`no-restricted-properties`](https://eslint.org/docs/latest/rules/no-restricted-properties) — the two core rules every mechanical check above is built from.
- [ESLint flat config `ignores`](https://eslint.org/docs/latest/use/configure/ignore) — the subtree-ignore behaviour behind the visibility precondition.
- [esquery](https://github.com/estools/esquery) — the selector language, and the reason the tautology duty cannot be mechanised.
- [Vitest test API](https://vitest.dev/api/) — `.only`, `.skip`, `.todo`, `.each`, and the snapshot matchers named above.
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — the import-graph layer that owns Don't 6.
- [Issue #12](https://github.com/hancrafted/markdown-harness/issues/12) — the verified selector shapes, the measured agent-mocking figures, and the reasoning that overturned leaving `.skip` legal.
