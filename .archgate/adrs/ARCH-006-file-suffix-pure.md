---
type: adr
id: ARCH-006
title: 'The pure Classifier'
domain: architecture
rules: false
files: ['src/**/*.pure.*']
paths: ['src/**/*.pure.*']
description: 'What the pure classifier claims: a member is admissible only if its result is a function of its arguments alone, the two ambient reads that decide the Math and Date boundary, the evasion bans, and the mutation duty the check cannot hold.'
---

# The pure Classifier

## Context

The `pure` classifier is the only claim in this vocabulary a test can rely on. A file that carries it promises that calling it twice with the same arguments gives the same answer, which is what makes its result assertable against a written expectation rather than against whatever the code currently produces.

That promise is also what makes such a file the right subject for a colocated test. Extracting complex private logic into its own file is the standard way to make it testable, and a `pure` file is already that extraction.

The boundary is drawn on **determinism, not side effects**. PostgreSQL states the same principle for its `IMMUTABLE` category, and the distinction matters here because the most common violation reads nothing and writes nothing: it consults the host.

Rejected alternative — a purity checker over the import graph. No configured checker resolves an aliased call across a module boundary, so such a tool would report confidence it cannot support. The bans below are single-file and honest about it.

Rejected alternative — trusting a comment or a `@pure` annotation. An annotation is checked by nothing and moves independently of the code it describes.

## Decision

### 1. The admission boundary

1. A member is admissible in a `pure` file **if and only if its result is a function of its arguments alone**.
2. Nondeterminism is the test, not mutation. A call that can return a different value for identical arguments is inadmissible even when it changes nothing.
3. Everything the file cannot derive from its arguments MUST arrive as an argument. Passing an instant, a seed or a locale in is the compliant form of every ban below.

### 2. The two ambient reads

1. All of `Math` is admissible **except** `random`.
2. `Date` is admissible only when an instant is supplied, and only through the `getUTC*` accessors. A local-time accessor resolves through the host time zone, which is an ambient read and not an argument.
3. The clock readers are inadmissible: the zero-argument `Date` constructor, `Date.now` and `performance.now`.
4. The locale-sensitive formatters are inadmissible for the same reason: they read a host setting that no argument supplies.

### 3. Evasion counts as the call

1. A banned member MUST NOT be reached indirectly. Aliasing `Math` or `Date` to a local name, computing a member name, reaching the host through the global object, or constructing through reflection are each inadmissible in their own right, whether or not the banned member is reached.
2. Hiding the arity of a constructor behind a spread is inadmissible, because it defeats the reading that distinguishes a supplied instant from a clock read.

### 4. Mutation

1. A `pure` file MUST NOT mutate its arguments, and MUST NOT hold or write module-level state.
2. This is the half of purity the configured checks do not hold. It binds the author regardless.

## Do's and Don'ts

### Do's

1. **DO** take every value the file cannot derive as an argument. (Decision 1)
2. **DO** pass an instant into a function that needs a time, rather than letting it read one. (Decision 1)
3. **DO** use the `getUTC*` accessors when reading a supplied `Date`. (Decision 2)
4. **DO** pass a locale in when output depends on one. (Decision 2)
5. **DO** name the banned member directly if you genuinely need it — in a file carrying a different classifier. (Decision 3)
6. **DO** return a new value rather than modifying an argument. (Decision 4)

### Don'ts

1. **DON'T** call anything whose result can vary for identical arguments. (Decision 1)
2. **DON'T** use `Math.random`, `Date.now`, `performance.now` or the zero-argument `Date` constructor. (Decision 2)
3. **DON'T** use a local-time accessor or a locale-sensitive formatter on a `Date`. (Decision 2)
4. **DON'T** alias `Math` or `Date`, compute a member name, reach the global object, or construct through reflection. (Decision 3)
5. **DON'T** spread into a `Date` constructor — state the arity. (Decision 3)
6. **DON'T** mutate an argument or keep module-level state. (Decision 4)

## Consequences

**Positive:**

1. **Assertable results:** a test may state an expected value, because the same arguments cannot produce a different answer tomorrow.
2. **A legitimate unit subject:** the classifier is what earns a file its colocated test, so extracting logic to make it testable is a supported move rather than a workaround.
3. **The evasions are closed:** the bans name the alias, the computed access and the reflection path, so the obvious ways around them fail with their own message.
4. **Cheap to enforce:** every check is core ESLint configuration, so no dependency was admitted to hold this Discipline.

**Negative:**

1. **Argument lists grow:** every ambient value the file needs becomes a parameter, and the caller carries what the callee used to fetch.
2. **Only determinism is checked:** absence of mutation is a duty, not a result. A file can pass every configured check and still modify what it was handed.
3. **Two `Date` families to remember:** the `getUTC*` accessors are admissible and their local-time siblings are not, which is a distinction the name of neither family carries.
4. **Three formatters are deliberately unbanned:** `toString`, `toDateString` and `toTimeString` collide with `Object.prototype`, so banning them would fire on arrays, strings and domain objects. They read the host and are not caught.

**Risks:**

1. **The import hole.** No single-file check can see through `import { now } from './clock'`, so a banned read reached through a local module defeats every selector. **Mitigation:** the import graph is governed separately, and closing this specific case with a graph rule is a cheap, identified addition once the impure classifier has a record of its own.
2. **Mutation goes unheld.** Decision 4 is the larger half of what "pure" means to a reader, and nothing enforces it. **Mitigation:** it is stated as a named review duty below rather than implied by the classifier, so a reviewer knows it is theirs.
3. **The boundary is drawn from a specification reading, not from measurement.** Whether every admitted `Math` member is genuinely argument-determined rests on the language specification being read correctly. **Mitigation:** the two references below are the primary sources, cited so the reading can be checked rather than trusted.

## Compliance and Enforcement

**Enforcer per Discipline.** Decisions 2 and 3 are held in `eslint.config.mjs` for files carrying this classifier. Core `no-restricted-properties` holds the three nondeterministic sources — `Math.random`, `Date.now` and `performance.now` — together with the local-time accessor and locale-formatter list. Core `no-restricted-syntax` holds seven determinism selectors covering the zero-argument `Date` constructor, a spread into that constructor, computed access on `Math`, reach through the global object, an alias of `Math` or of `Date`, and construction through reflection. The three nondeterministic sources are shared with the test-file configuration in the same file, so the two cannot disagree about what a nondeterministic source is.

**Not mechanically enforced — review duty:** the whole of Decision 4, mutation and module-level state. Also Decision 1 in the general case: the selectors name specific members, so a nondeterministic call this record did not anticipate passes. A reviewer applies the boundary itself, not the list.

**Known reach gap.** The configured selectors run over `src/packages/**/*.pure.ts`, narrower than this record's globs, which admit a second language. The gap closes when a second language arrives with a checker that can hold the same boundary.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [PostgreSQL — Function Volatility Categories](https://www.postgresql.org/docs/current/xfunc-volatility.html) — `IMMUTABLE` stated as a guarantee about results for identical arguments, which is the principle Decision 1 restates.
- [ECMAScript — `LocalTime`](https://tc39.es/ecma262/#sec-localtime) — the local-time accessors resolve through `SystemTimeZoneIdentifier()`, which is the ambient host read Decision 2 excludes.
- [MDN — `Math.random()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random) — no guarantee of a value not already produced, and no seeding.
- [ESLint — `no-restricted-properties`](https://eslint.org/docs/latest/rules/no-restricted-properties) — the object-and-property form the ambient-read bans are written in.
