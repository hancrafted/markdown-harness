---
type: design-adr
status: accepted
---

# `undefinedHeadings` takes `allow` or `forbid`, and `maxLevel` beside `forbid` is `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE`

Amends [`0020-body-structure-config-validation-per-purpose.md`](./0020-body-structure-config-validation-per-purpose.md)
(the catalog, the payload check, and the walk order). The behaviour the key switches on is
[`0025-a-closed-spine-is-opt-in-per-rule-and-reports-undefined-headings.md`](./0025-a-closed-spine-is-opt-in-per-rule-and-reports-undefined-headings.md);
the spec is [#225](https://github.com/hancrafted/markdown-harness/issues/225). Han's review of
[#223](https://github.com/hancrafted/markdown-harness/pull/223) settled that the key is `undefinedHeadings`, that `forbid` closes the spine, and that `maxLevel`
and a closed spine are mutually exclusive and exclusion is a config error with a fault code of its own.
This record decides the rest: the value set, where the fault is raised and in what order, and what
else the key changes in validation.

## What was measured

1. **The nearest precedent writes its default.** `presence` takes `required` and `optional`, and a
   `heading` entry that omits it is `required` (0017), so the tier's own coverage test counts an omitted
   `presence` as `required`. The first Module's `unknownKeys` takes `allowed` and `forbidden`, and a Rule may
   write either. Neither treats the explicit default as a second spelling to refuse.
2. **0020 decision 4 refuses a second spelling of one thing** (`presence` on an enumeration, whose spelling
   of optional is `minCount: 0`). An `allow` that only meant omission looks like that case, so the
   decision below has to say why it is not.
3. **0020 reports a mistake once.** The fault that needs two valid keys, `CONFIG_ENTRY_BEYOND_MAX_LEVEL`,
   and the inverted bounds are each decided only when both keys are valid, so an invalid key is reported by
   itself.
4. **The Rule-level payload check reads two keys.** `CONFIG_EMPTY_CONSTRAINT` fires when a Rule writes
   neither `headings` nor `maxLevel`, so a Rule that asks nothing of a body is refused.
5. **No existing rejected-config case writes `undefinedHeadings`**, so the 58 stay as frozen.

## Decisions

1. **The value set is `allow` and `forbid`, lowercase, and nothing else.** `allow` is the default written
   out: it means exactly what omission means, and a Rule that writes it behaves identically to a Rule that
   does not. Any other value is `CONFIG_INVALID_VALUE` at the key: `Forbid`, `forbidden`, `true`, `false`, a
   list, a number, and a key written with nothing after it, which parses to null. The reasons the second
   spelling is not a defect here: a flip from `forbid` to `allow` is one word in a diff, where deleting a
   line is easy to miss, and a config-authoring tool can toggle a key that stays instead of removing and
   re-adding one, which are the two readers of a config the architecture vision's second cheap-now decision
   names. The value also leaves room for a section-wide default to be added later, in the way 0006 gave
   the first Module one, without a value having to be invented to let a Rule opt out of it. No such default
   is built, and nothing here depends on one. The precedent of measurement 1 is followed.
2. **Only `forbid` excludes `maxLevel`.** `allow` is the open spine, and `maxLevel` is the depth floor for
   an open spine, so a Rule that writes both is valid, and `CONFIG_ENTRY_BEYOND_MAX_LEVEL` is still decided for it: an entry deeper than that `maxLevel` is refused as it always was. A `body-structure` case freezes the valid pairing and a rejected-config case freezes the refusal.
3. **The fault is `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE`, raised at the Rule's `maxLevel` key.** It is the key
   to delete: a closed spine already forbids every depth no entry names, so `maxLevel` is the redundant
   half, and a heading beyond it would be reported twice, once as too deep and once as undefined, which
   is what the exclusion exists to prevent. Repairing it by writing `allow` instead is also possible and
   is the Operator's choice, not the location's.
4. **It is decided only when both keys are valid**, following measurement 3: a `maxLevel` outside 1 to 6
   beside `forbid` is `CONFIG_INVALID_VALUE` at `maxLevel` and nothing more, and an invalid
   `undefinedHeadings` beside a valid `maxLevel` is `CONFIG_INVALID_VALUE` at `undefinedHeadings` and
   nothing more.
5. **Once the fault is raised, `maxLevel` is consulted by nothing else.** `CONFIG_ENTRY_BEYOND_MAX_LEVEL`
   is not decided for a Rule that writes `forbid`, because the one mistake, two keys that cannot be
   written together, is already reported and a second fault about the same `maxLevel` would name a limit
   that is not in force.
6. **A Rule is not empty when it writes `undefinedHeadings: forbid`.** `CONFIG_EMPTY_CONSTRAINT` is raised
   at a Rule that writes none of `headings`, `maxLevel` and `undefinedHeadings: forbid`. A closed spine
   with no `headings:` is the only way to say "this kind of document has no headings", which no `maxLevel`
   can say, since its floor is 1. Every heading is then undefined (0025). The fault is not raised when
   `undefinedHeadings` is written with an invalid value, because that is already reported at the key.
   `undefinedHeadings: allow` alone **is** an empty constraint: it is the default written out and asks
   nothing of a body. `headings: []` keeps its own fault at the list, as before, with or without `forbid`.
7. **The key is a Rule key.** It sits beside `maxLevel` and is not a section key and not an entry key.
   `CONFIG_UNRECOGNISED_KEY` keeps refusing it anywhere else.

## The catalog

One code is new: **`CONFIG_MAX_LEVEL_ON_CLOSED_SPINE`**, at the Rule's `maxLevel` key, raised for `maxLevel`
written beside `undefinedHeadings: forbid`. 0020's catalog grows from 20 codes to 21, and the rejected-config
tier's hand-written list grows with it. `CONFIG_INVALID_VALUE` gains one clause, an `undefinedHeadings` that
is not `allow` or `forbid`. `CONFIG_EMPTY_CONSTRAINT` is raised as decision 6 says. No other code changes
meaning.

## Walk order

Within a Rule, 0020's order was: unrecognised keys, `ruleId`, `intent`, a missing selector, each axis's
shape, `excludeFiles`, the Rule-level empty payload, `maxLevel`, then `headings`. It is now: unrecognised
keys, `ruleId`, `intent`, a missing selector, each axis's shape, `excludeFiles`, the Rule-level empty payload,
`maxLevel`, **`undefinedHeadings`, then the exclusion of `maxLevel` and `forbid`**, then `headings`. The
exclusion sits after both keys' own value checks because it needs them valid, and before `headings`
because it is a fact about the Rule and not about an entry. One case freezes the position beside three other
faults on one Rule. The cross-Module order and the order inside `headings` are unchanged.

## Consequences

1. The rejected-config tier gains 7 cases, and its hand-written list of codes grows from 20 to 21. Its
   compile-time pin goes red until the configuration contract adds the code.
2. A Rule that closes its spine and also wants a depth limit has no spelling for it, and does not need
   one: the entries name the levels that exist.
3. The direction of the key, that `forbid` to `allow` or deleting the key widens what passes, is stated in
   0025 consequence 4, which also records that it amends one sentence of 0017. A loosening pass, if one is
   ever built, reads the key's two values and that direction.

## Considered options

**Accept `forbid` only, and make `allow` a fault.** Rejected under decision 1: the precedent of `presence`
and `unknownKeys` is to accept the default written out, and a refusal would reject a config that says
exactly what omission says. **Raise the exclusion at the Rule, or at `undefinedHeadings`.** Rejected under
decision 3: the repair most Operators want is deleting the redundant `maxLevel`. **Raise the exclusion
whenever both keys are written, valid or not.** Rejected under decision 4, because 0020 already reports one
mistake once. **Require `headings` beside `forbid`.** Rejected under decision 6: it would leave no spelling
of a heading-free kind of document.
