---
type: design-adr
status: accepted
---

# Rule selection and selector validation live in `foundation`, and a Module passes only its own axis

Amends [`0020-body-structure-config-validation-per-purpose.md`](./0020-body-structure-config-validation-per-purpose.md).
That record has `body-structure` validation mirror the first Module's selector faults "within a Rule", and
the code it produced said so in a docblock: the selector rules were "restated here rather than imported,
because one Module may not import another". Restating was treated as the price of ARCH-008 §1.1. This
record withdraws that point.

## What was measured

Both Modules implemented the same Core vocabulary twice: the first-match walk that builds `won`,
`shadowed` and `excluded` tallies, `selectorRefFor`, the `excludeFiles` check, the folder and file-name
token faults, `isStringList`, `invalidValue`, `unrecognisedKeys`, and the exclusion fault order. About
290 lines were duplicated across eleven files and their tests, held in step only by a comment and by the
Conformance tiers. A fix to one copy that missed the other would change one Module's behaviour and not
the other's, which is the drift the Core selector exists to prevent: a Module is a bounded context that
takes the Core's vocabulary as given.

## Decision

1. **The selector is Core vocabulary, so it lives in the shared Package.** `foundation/rule-selection.ts`
   publishes `selectorMatches`, `reaches`, `selectionFor`, `firstMatch`, `selectorRefFor` and `tallyRules`.
   `foundation/selector-faults.ts` publishes `selectorMissingFaults`, `axisFaults`, `tokenFaults`,
   `exclusionFaults`, `invalidValue`, `unrecognisedKeys` and `isStringList`.
2. **The Core selector stays two literal axes** ([`0007`](./0007-selector-is-two-literal-axes.md)). The
   `types` axis, `typeMatches` and `SelectorRef.types` stay in `body-structure-harness`
   ([`0012`](./0012-body-structure-is-a-second-module-selected-by-type.md)). They reach Core as callbacks: the
   tally takes a `selection` function and a `refOf` function, and selector validation takes a map of the
   Module's own list axes, each with the test its tokens must pass. Core never names `types`.
3. **Exclusions remain Core selectors.** A Module's own axis inside `excludeFiles` is an unrecognised key,
   exactly as before.
4. **One fault order for `excludeFiles`, and it is frontmatter's.** An exclusion list earns at most one
   kind of fault, found in this order: an unrecognised key, a wrongly shaped axis, an entry with no
   axis, a malformed token. `frontmatter-harness` already reported in that order and is unchanged.
   `body-structure-harness` reported an entry with no axis (`CONFIG_SELECTOR_MISSING`) before a wrongly
   shaped axis (`CONFIG_INVALID_VALUE`), so its order within `excludeFiles` changes: `excludeFiles:
[{ folders: 'x' }, {}]` used to yield `CONFIG_SELECTOR_MISSING` and now yields `CONFIG_INVALID_VALUE`,
   both at `excludeFiles`. Neither issue 221 nor 0020 specifies the order within an exclusion list, and no
   Conformance case reaches the difference, so one Core order is kept rather than a per-Module option;
   the unit suite for `foundation/selector-faults.ts` pins it. Everything else, including fault order
   across a Rule and every tally row, is unchanged.

## Placement

ARCH-008 §1.3 lets any Package import `config-contract` types, and `foundation` already does; §1.2 forbids
`foundation` importing a Module, which this does not. `response-contract` types (`RuleAudit`,
`SelectorRef`) are imported type-only as well. `modules-never-import-modules` is untouched, and no
dependency-cruiser rule was edited.

## Consequences

1. The two Modules' rule-tally, selection and selector-fault unit suites are replaced by one suite per
   foundation entry point, plus the `types`-axis suites that remain in `body-structure-harness`.
2. A third Module gets selection, the tally and selector validation by passing its own callbacks.
3. `foundation` grows by two entry points. It stays free of any Module's section type.
