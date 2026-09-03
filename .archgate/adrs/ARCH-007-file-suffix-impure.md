---
type: adr
id: ARCH-007
title: 'The impure Classifier'
domain: architecture
rules: false
files: ['src/**/*']
paths: ['src/**/*.impure.*']
description: 'What the impure classifier claims: membership is decided by exclusion and signalled by dependency or effect, effects sit at the edges of a call rather than through its middle, deterministic logic is extracted into a pure function that receives its data as arguments, and a conditional never encodes a business rule.'
---

# The impure Classifier

## Context

A file suffix classifier was created to allow ADR's to glob effectively. This one exists to capture the a remainder so that every file is governed.

## Decision

### 1. What lands here

1. Membership is decided by exclusion: a file that no other classifier admits carries this one.
2. Three signals indicate it — the file takes a dependency, or it changes state or mutates a value,
   or it performs a side effect. These are signals, not a closed set.
3. Composing functions is NOT a signal. A composition of deterministic functions is itself
   deterministic and MUST NOT carry this classifier.
4. A file MUST NOT carry this classifier to escape a stricter one. Reach for it last.

### 2. Function structure

1. Structure calls as an impure–pure–impure sandwich (Functional Core, Imperative Shell): gather all impure inputs first, invoke the deterministic function, and apply side effects last.
2. An effect MUST NOT be interleaved between computations if the read can be hoisted or the write
   deferred.
3. A file that orchestrates MUST take the shape in Implementation Pattern below. An Adapter
   or a wiring file has no deterministic core to place, so this item does not reach it.

### 3. Extract the deterministic logic

1. A deterministic computation MUST be extracted into a file carrying the deterministic classifier.
2. The extracted function MUST receive its data as arguments.
3. It MUST NOT import the file it was extracted from.
4. It MUST NOT reach a platform builtin.

### 4. Sequence, do not decide

1. A conditional MUST NOT encode a business rule. The rule belongs in a deterministic function and its answer belongs in a variable.
2. Branching MUST stay low enough that the file reads as a sequence of steps.
3. No number is set here. The ceiling is a review duty, for the reason in Compliance.

## Do's and Don'ts

### Do's

1. **DO** reach for this classifier last, once every stricter one has refused the file. (Decision 1)
2. **DO** carry a deterministic composition under the deterministic classifier instead. (Decision 1)
3. **DO** gather every input at the top of the call. (Decision 2)
4. **DO** compute in one deterministic call between the reads and the writes. (Decision 2)
5. **DO** hoist a read to the top, or defer a write to the bottom, when either is possible.
   (Decision 2)
6. **DO** pass the extracted function its data as arguments. (Decision 3)
7. **DO** name the branch's answer in a variable computed elsewhere. (Decision 4)

### Don'ts

1. **DON'T** carry this classifier because a file composes other functions. (Decision 1)
2. **DON'T** use this classifier to escape a stricter one. (Decision 1)
3. **DON'T** interleave an effect with a computation that could precede or follow it. (Decision 2)
4. **DON'T** let an extracted function import the file it came from. (Decision 3)
5. **DON'T** let an extracted function reach a platform builtin. (Decision 3)
6. **DON'T** put a business rule inside a conditional. (Decision 4)

## Consequences

**Positive:**

1. **Total vocabulary:** a residual classifier leaves no file unclassified, so an exhaustiveness
   check can prove coverage rather than sample it.
2. **Testable by construction:** effects at the edges leave deterministic logic in the center that
   needs no test double.

**Negative:**

1. **One glob, several roles:** a procedure, an Adapter and the wiring code share this classifier
   and share no positive property. Any ceiling set here must accommodate the loosest of the three,
   so it binds the tightest of them weakly.
2. **Review-heavy enforcement:** only the extraction boundary is mechanically checked; sequencing,
   branching limits, and non-interleaving hold predominantly by review duty.

**Risks:**

1. **The escape hatch is the classifier itself:** because membership is residual, renaming a file to
   this classifier lifts every stricter constraint. **Mitigation:** Decision 1.4 states the ban and
   review holds it; the exhaustiveness check proves a file is classified, never that it is
   classified honestly.
2. **Interleaving is unverifiable:** no check can tell an effect that must sit mid-call from one
   that an author left there. **Mitigation:** codified as a review duty, with reviewers checking
   whether reads could be hoisted or writes deferred.

## Implementation Pattern

```typescript
export async function processTask(rawId: unknown): Promise<Result | undefined> {
  // 1. Single error boundary for orchestration
  try {
    // 2. Head: variable declaration & early validation
    if (!isValidId(rawId)) return undefined;
    // 3. Impure retrieval (read edge): async calls & external data
    const record = await db.fetchRecord(rawId);
    // 4. Post-retrieval validation: guard on fetched state
    if (!record) return undefined;
    // 5. Functional core: pure business logic & decisions & control flow
    const outcome = computeOutcome(record);
    if (!outcome.approved) return undefined;
    // 6. Tail & write edge: execute side effects, then return
    await db.save(outcome);
    return outcome;
  } catch (error) {
    logger.error('Task orchestration failed', { error });
    return undefined;
  }
}
```

## Compliance and Enforcement

**Enforcer per Discipline.** Decision 3 is held in `.dependency-cruiser.cjs` by two named rules.
`pure-imports-no-impure` forbids an edge from a file carrying the deterministic classifier to one
carrying this classifier, which holds §3.3. `pure-imports-no-builtin` forbids an edge from that same
set to a platform builtin, which holds §3.4. Both run at `error`. eslint holds nothing here, because
neither constraint is visible inside a single file. Read the **dependency count** in that tool's
output rather than its checkmark: it reports success over an empty graph, and a run that cruised no
edges proves nothing.

**Not mechanically enforced — review duty:** Decisions 1, 2 and 4 in full. Decision 4 carries **no
number** by choice. `complexity: ['error', 7]` is already configured for every TypeScript file in
this repo, so a ceiling asserted here at 7 would claim a constraint it does not add, and any lower
figure would be a guess — no file carries this classifier, so no distribution exists to measure
against. The reviewer applies §4.1 directly: does a conditional in this file encode a rule?

**Known reach gap.** The two configured rules reach files under `src/packages/` that end in `.ts`.
This record declares `src/**/*`, which is wider in two directions: a governed file outside a Package
and a second language both fall inside the record and outside the check. The gap closes when a
Package holds such a file and the rule's globs widen to match. Decisions 1, 2 and 4 have no enforcer
at all, so their reach is the reviewer's.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [Mark Seemann — the impureim sandwich](https://blog.ploeh.dk/2020/03/02/impureim-sandwich/) — the
  impure–pure–impure shape Decision 2 states: _"Gather data from impure sources. Call a pure
  function with that data. Change state (including user interface) based on return value from pure
  function."_
- [Gary Bernhardt — Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)
  — the screencast description, the only place the shape is defined in his own words: _"an
  imperative shell with few conditionals"_. Cited from the catalogue page rather than the
  _Boundaries_ talk, which has no published transcript.
- [Eric Evans — Domain-Driven Design Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
  — the thinness statement behind Decision 4: _"This layer is kept thin. It does not contain
  business rules or knowledge, but only coordinates tasks."_
- [Microsoft — the command handler class](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/microservice-application-layer-implementation-web-api)
  — the same constraint as a smell test: _"When command handlers get complex, with too much logic,
  that can be a code smell."_
- [dependency-cruiser — forbidden rules](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
  — the `from`/`to` and `dependencyTypes` fields the two rules above use.
