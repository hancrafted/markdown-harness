---
type: design-adr
status: accepted
---

# `body-structure` config validation depends on `purpose`, reuses the fault catalog and adds five codes

**Supersedes `0016-body-structure-config-validation`**, a round-one record that exists only on the
branch `prototype/body-structure-module`. That record's catalog was written for `levels:`, `title` and
`prefix`, which no longer exist. The reasoning it carried survives: a config fails whole, the section's
faults join the first Module's in one rejection ordered by the declared Module set, and every fault
has a rejected-config case in the spec for this round.

## What each purpose may and may not carry

| key        | `heading`     | `enumeration`                           |
| ---------- | ------------- | --------------------------------------- |
| `purpose`  | required      | required                                |
| `level`    | required      | required                                |
| `pattern`  | optional      | optional, and never an anchored literal |
| `presence` | optional      | **forbidden**                           |
| `minCount` | **forbidden** | optional                                |
| `maxCount` | **forbidden** | optional                                |
| `intent`   | optional      | optional                                |

An `enumeration` must carry `minCount`, `maxCount` or both. Decisions and their reasons:

1. **`pattern` is optional on a `heading`.** An entry with none matches any heading at its level, which
   is how "one title, whatever it says" is spelled. Requiring one would force `^.+$`, which adds nothing.
2. **`pattern` is optional on an `enumeration`, and it may not be an anchored literal.** An enumeration
   is a repeating heading whose text is not known ahead; a pattern that can only match one string
   contradicts that, and the spelling for one fixed heading is a `heading` entry. The refusal is
   syntactic, per
   [`0018-heading-patterns-are-ecmascript-regular-expressions-with-the-u-flag.md`](./0018-heading-patterns-are-ecmascript-regular-expressions-with-the-u-flag.md),
   and does not try to prove how many strings a pattern matches.
3. **A `heading` may never carry a count.** `minCount` and `maxCount` on a fixed heading say the
   same thing two ways and one of them is wrong; "exactly one" is what a `heading` is.
4. **An `enumeration` may never carry `presence`.** Its optional is `minCount: 0`, and one thing has
   one spelling.
5. **An `enumeration` carries at least one count.** With neither it states nothing, and a forgotten
   key must not read as "any number". `minCount: 0` alone is the explicit "any number, none included".
6. **Purpose-dependent faults are decided only when `purpose` is valid**, so one mistake is reported
   once. A missing or unknown `purpose` is one fault at `purpose` and silences the rest of the
   purpose-dependent checks for that entry.
7. **`types: []` is refused**, closing a question round one left open. A Rule that can never win would
   appear in `--query` as a candidate nobody can satisfy. The Core's own `folders: []` and
   `fileNames: []`, which `frontmatter-harness` also accepts, are the Core's to settle and are not
   changed here.
8. **A heading entry whose `level` exceeds the Rule's `maxLevel` is refused**, whether the entry is
   required or optional: it can never be satisfied, or can never match, and the Operator meant
   something else.

## The catalog

> Amended by [`0026`](./0026-undefined-headings-config-validation.md): one more code, `CONFIG_MAX_LEVEL_ON_CLOSED_SPINE`, taking the catalog from 20 codes to 21, and
> `undefinedHeadings` joins the Rule's keys.

Reused codes keep their meaning.

| code                         | raised for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CONFIG_UNRECOGNISED_KEY`    | any key outside the vocabulary on the section, a Rule or a heading entry, so `levels`, `title`, `prefix` and `maxDepth` are all refused by name                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `CONFIG_INVALID_VALUE`       | a `ruleId` that is not a non-empty string; a `purpose` that is absent or not `heading` or `enumeration`; a `level` that is absent or not an integer from 1 to 6; a `maxLevel` that is not an integer from 1 to 6; a `pattern` that is not a non-empty string or does not compile under the `u` flag; a `presence` outside `required` and `optional`; a `minCount` that is not an integer of 0 or more; a `maxCount` that is not an integer of 1 or more; a `types` list that is empty or holds anything but non-empty strings; a folder token without its trailing slash |
| `CONFIG_MISSING_RULE_INTENT` | a Rule with no `intent` key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `CONFIG_EMPTY_INTENT`        | a Rule's or a heading entry's `intent` written and left blank                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CONFIG_SELECTOR_MISSING`    | a Rule with none of `folders`, `fileNames` and `types`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `CONFIG_EMPTY_RULE_LIST`     | `rules: []`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `CONFIG_DUPLICATE_RULE_ID`   | a `ruleId` an earlier Rule took                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `CONFIG_EMPTY_CONSTRAINT`    | `headings: []`, and a Rule that writes neither `headings` nor `maxLevel`; a Rule that writes an empty list gets the fault at the list only                                                                                                                                                                                                                                                                                                                                                                                                                               |

Five codes are new, each one fault with one repair:

- `CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE`, at the key: `minCount` or `maxCount` on a `heading`, or
  `presence` on an `enumeration`.
- `CONFIG_ENUMERATION_WITHOUT_COUNT`, at the entry: an enumeration with neither `minCount` nor
  `maxCount`.
- `CONFIG_ENUMERATION_PINS_TEXT`, at the `pattern`: an enumeration whose pattern is an anchored literal.
- `CONFIG_COUNT_BOUNDS_INVERTED`, at the entry: `minCount` exceeds `maxCount`. Decided only when both
  are valid, so an invalid bound is reported once.
- `CONFIG_ENTRY_BEYOND_MAX_LEVEL`, at the entry's `level`: decided only when `maxLevel` and the entry's
  `level` are both valid.

Round one's `CONFIG_HEADING_TITLE_AND_PREFIX` and `CONFIG_DUPLICATE_LEVEL` die with the keys that
made them reachable. `CONFIG_LEVEL_BOUNDS_INVERTED` and `CONFIG_HEADING_LEVEL_NOT_ALLOWED` are
respelled as the two above, because a count now belongs to an entry and a depth limit is a scalar.
An empty `pattern`, like round one's empty `prefix`, would match everything and is refused for the
same reason, as `CONFIG_INVALID_VALUE`.

## Walk order

> Amended by [`0022`](./0022-rule-selection-and-selector-validation-live-in-foundation.md): the selector faults named
> below (axis shape, `excludeFiles`) are no longer mirrored from the first Module per Module but validated once in
> `foundation`, and the order within an `excludeFiles` list is Core's.

> Amended by [`0026`](./0026-undefined-headings-config-validation.md): `undefinedHeadings`, then the exclusion of `maxLevel` and `forbid`, are walked between
> `maxLevel` and `headings`.

Within the section: unrecognised section keys, an empty `rules`, duplicate `ruleId`s across the whole
list, then each Rule in turn. Within a Rule: unrecognised keys, `ruleId`, `intent`, a missing
selector, each axis's shape (`folders`, `fileNames`, `types`), `excludeFiles`, the Rule-level empty
payload, `maxLevel`, then `headings`. Within `headings`: an empty list, else each entry in index
order: unrecognised keys, `purpose`, `level`, `pattern`, keys not for the purpose (`minCount`,
`maxCount`, then `presence`, in that order), `presence`, `minCount`, `maxCount`, inverted bounds, a
missing count, an anchored-literal pattern, `intent`, level beyond `maxLevel`. The cross-Module order
and this within-Module order are each frozen by a case.

## Consequences

1. The rejected-config tier's hand-written list of codes it undertakes to reach grows from 15 to 20,
   and its compile-time pin goes red until the configuration contract adds the five.
2. The cross-Module check that would refuse a `type` used as a selector here but optional in the first
   Module is not designed, and neither is a check that the two Modules' `type` vocabularies agree;
   [`0021-the-integrated-tier-freezes-the-cross-module-gaps.md`](./0021-the-integrated-tier-freezes-the-cross-module-gaps.md)
   freezes what happens in the meantime.
