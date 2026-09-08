---
type: adr
id: ARCH-008
title: 'Reading a Type at Runtime'
domain: architecture
rules: false
files: ['src/packages/**/*.ts']
paths: ['src/packages/**/*.ts']
description: 'How runtime code is bound to a type it must read: a vocabulary a contract type already declares is shadowed by a record keyed by that type, never by a parallel string list, and membership is tested with Object.hasOwn.'
---

# Reading a Type at Runtime

## Context

A **shadow** is a runtime value holding the members of a type. Code needs one because a union or an interface is erased before anything runs: `Format` has three members to the compiler and nothing at all to the evaluator, so a check asking "is this string a named format" has to consult a value, not a type.

The question is only ever how the shadow is bound to the type it copies. Unbound, the two drift, and the drift is silent in the worst direction — the type gains a member, the shadow does not, nothing fails, and a check written to reject a bad value quietly stops rejecting it. Nobody sees a failure, because the failure is an absence.

Four ways to write the shadow were available:

1. **A parallel `readonly string[]`.** The obvious form, and the one this record bans. It repeats the type's members as free-floating strings with nothing relating the two, so the compiler has no opinion when they diverge. This is what the config validator used before ARCH-008.
2. **A record keyed by the type** — `Record<keyof T, true>` or `Record<SomeUnion, true>`. The type stays the source; the record is checked against it in both directions on every build. The `true` values carry no information and exist only to give the keys somewhere to live.
3. **A const object with the union derived from it** (`typeof OBJ[keyof typeof OBJ]`). Correct when the vocabulary has no home — but it inverts authorship, making the runtime value the source. For a vocabulary a contract package already declares, that would demote the contract to a derivative of its own checker.
4. **A runtime schema library** (Zod and similar), deriving both type and validator from one declaration. It removes the problem rather than managing it, at the cost of a dependency in the contract layer and a second description language. ARCH-001 sets a high bar for admitting one, and the config language is small enough that the bar is not met.

For `markdown-harness` this matters more than it would elsewhere, because the config validator is the whole safety story: `config-contract` is types-only, erased entirely at build time, and a config arrives as YAML. Nothing about a parsed config is true because TypeScript says so. Every guarantee is one a runtime check earned, and a check consulting a stale shadow earns nothing while reading as though it does. The narrowing in `section-narrowing.pure.ts` rests its whole claim on that coverage, so this record is what keeps that claim from decaying.

## Decision

### 1. Binding a vocabulary to its type

1. A runtime vocabulary whose members a contract type already declares MUST be a record keyed by that type: `Record<keyof T, true>` for an interface's keys, `Record<SomeUnion, true>` for a union.
2. The type is the source and the record follows it. A parallel list of the same strings MUST NOT stand in for the binding.
3. A narrowed vocabulary MUST be derived from the type rather than retyped — `Record<Exclude<keyof T, 'discriminator'>, true>`.
4. A new binding MUST be proven capable of failing before it is trusted: deleting one member gives `TS2741`, adding an unknown one `TS2353`. A `keyof` that resolves to `string` admits anything and reads as correct.

### 2. Testing membership

1. Membership against a shadow MUST use `Object.hasOwn`.
2. The `in` operator MUST NOT be used against keys drawn from user input. It walks the prototype chain, so `'toString' in {}` is `true`, and a value named `toString` or `constructor` passes the check built to stop it.

### 3. What this record does not cover

1. A vocabulary with **no home** in a contract type is out of scope. There the const object is the source and the union derives from it, which is the opposite direction and a deliberate one.
2. **Dispatch** is out of scope. These rules bind membership only, and say nothing about a function branching per member.

## Do's and Don'ts

### Do's

1. **DO** write a shadow of a contract type as `Record<keyof T, true>` or `Record<SomeUnion, true>`. (Decision 1)
2. **DO** leave the contract type as the source, so widening it fails the build until the shadow follows. (Decision 1)
3. **DO** derive a narrowed vocabulary with `Exclude<keyof T, '…'>` instead of retyping the remainder. (Decision 1)
4. **DO** prove a new binding can fail — delete a member for `TS2741`, add an unknown one for `TS2353` — before relying on it. (Decision 1)
5. **DO** name in the shadow's docblock which type it follows, so a reader knows which side to edit. (Decision 1)
6. **DO** use `Object.hasOwn` for every membership test against a shadow. (Decision 2)

### Don'ts

1. **DON'T** write a `readonly string[]` repeating a vocabulary a contract type already declares. (Decision 1)
2. **DON'T** read a green `tsc` as evidence that a new binding is live. (Decision 1)
3. **DON'T** use `in` to test membership against a key that came from a config or a document. (Decision 2)
4. **DON'T** invert the direction for a vocabulary that already has a home in a contract type. (Decision 3)
5. **DON'T** read these rules as reaching dispatch; a branching function is unaddressed here. (Decision 3)

## Consequences

**Positive:**

1. **Drift becomes a build failure:** a contract type gaining a key cannot silently outrun the checker that guards it.
2. **Both directions are held:** a missing member and an invented one each fail, so a typo in the shadow is as loud as an omission.
3. **The contract stays authoritative:** `config-contract` remains the one place a vocabulary is declared, and every runtime copy is visibly downstream.
4. **Prototype safety by default:** `Object.hasOwn` closes a class of bug that only shows up for adversarial or unlucky key names.
5. **No dependency cost:** the binding is a type annotation, so it survives erasure with no runtime weight and no new package.

**Negative:**

1. **The `true` is filler:** `Record<K, true>` carries a value nobody reads, and the form is odd on first sight.
2. **Verbose for wide unions:** a large vocabulary becomes a long literal where a list was one line.
3. **Keys only, never shapes:** the binding holds the member set and says nothing about what each member's value must be, so a shadow can be complete and the check beneath it still wrong.
4. **`keyof` on an intersection of unions is subtle:** `keyof FrontmatterRule` reaches all eleven keys only because both union halves declare the absent side as `never` — a contract written differently would bind less than it appears to.

**Risks:**

1. **A decorative binding:** if `keyof` resolves to `string` — through an index signature or a widened alias — the record accepts any keys while reading as bound. **Mitigation:** Decision 1.4 makes the two-sided probe a precondition of trusting a new binding.
2. **A bound shadow used wrongly:** nothing stops correct keys being consulted by an incorrect check. **Mitigation:** review duty; the shadow's docblock must state which type it follows, so a reviewer can compare.
3. **Direction confusion against the const-object form:** two opposite idioms will coexist once the violation codes ship. **Mitigation:** Decision 3.1 draws the boundary on whether the vocabulary has a home; this record is amended when that work lands.

## Compliance and Enforcement

**Not mechanically enforced — review duty.** This record has no companion `.rules.ts`, so nothing rejects a `readonly string[]` shadow automatically. A reviewer must ask, of any new runtime vocabulary, whether a contract type already declares those members; if one does, the list is a violation of Decision 1. The compiler then does the ongoing work: once the binding is written, drift is caught on every build without anyone remembering to look.

**The probe is the enforcement that matters.** Decision 1.4 is not ceremony. A green `tsc` over a keyed record is indistinguishable from a green `tsc` over an inert one, and the inert case reads correctly at a glance. Deleting a key and watching `TS2741` appear at the expected line is the only evidence the binding exists.

**Known reach gap — dispatch is unbound.** These rules cover membership, not branching, and one branching site is already wrong. `matchesFormat` in `src/packages/frontmatter-harness/lib/check/value-format.pure.ts` is an if-chain — `if datetime`, `if uri`, then `return` the actor test — so a fourth `Format` would be silently treated as an actor rather than rejected. Measured: widening `Format` with a probe member made `tsc` fail at exactly one site, the keyed `FORMATS` shadow, and not at `matchesFormat`. The gap is named rather than closed because the repository has no exhaustiveness idiom today, and inventing one inside this record would be governance ahead of practice.

**Exceptions:** raise a separate ADR; human approval required.

## References

- [The types Classifier](./ARCH-005-file-suffix-types.md) — why a contract package holds declarations only, which is what makes a runtime shadow necessary in the first place.
- [The pure Classifier](./ARCH-006-file-suffix-pure.md) — the classifier every shadow in the tree currently sits under; a keyed record is module-level constant data, not mutable state.
- [Dependency Admission Bar](./ARCH-001-dependency-admission-bar.md) — the bar a runtime schema library would have to clear to replace this pattern.
- [TypeScript — `keyof` and mapped types](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) — the operator the binding is written in.
- [MDN — `Object.hasOwn()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn) — the prototype-chain hazard Decision 2 avoids.
