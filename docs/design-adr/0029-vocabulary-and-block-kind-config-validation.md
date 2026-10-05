---
type: design-adr
status: accepted
---

# `vocabulary` and `mayHold` are validated per item, reuse three fault codes and add five

Amends [`0020-body-structure-config-validation-per-purpose.md`](./0020-body-structure-config-validation-per-purpose.md) (the
catalog, the payload check, and the walk order) and
[`0026-undefined-headings-config-validation.md`](./0026-undefined-headings-config-validation.md) (the payload rule and the walk
order it set). The behaviour the two keys switch on is
[`0027-a-heading-vocabulary-is-a-rule-level-list-of-exact-titles-per-level.md`](./0027-a-heading-vocabulary-is-a-rule-level-list-of-exact-titles-per-level.md)
and [`0028-a-section-holds-an-allowed-set-of-block-kinds.md`](./0028-a-section-holds-an-allowed-set-of-block-kinds.md); the
spec is [#227](https://github.com/hancrafted/markdown-harness/issues/227). This record decides what the loader refuses: the shape
of both keys, the faults, where each is raised and in what order, and what else they change in validation.

## What was measured

1. **The nearest precedents reuse their codes.** `presence` outside its two spellings and an `undefinedHeadings` outside its two
   are both `CONFIG_INVALID_VALUE`, and `headings: []` is `CONFIG_EMPTY_CONSTRAINT`. A value outside its declared set is a
   value fault and an empty list is an empty constraint, so neither new key needs a code of its own for those.
2. **0020 reports a mistake once.** The faults that need two valid keys, `CONFIG_ENTRY_BEYOND_MAX_LEVEL` and the inverted
   bounds, are each decided only when both are valid, and 0026 decided `maxLevel` is consulted by nothing once the exclusion is
   raised. The new cross-key faults follow both.
3. **A duplicate Rule id points at the later occurrence** (`CONFIG_DUPLICATE_RULE_ID`), which is the precedent for a repeated
   title, level or kind.
4. **The `yaml` parser refuses a repeated mapping key**, so a repeated level cannot be a repeated key and needs a fault of its
   own (0027 measurement 2).
5. **No existing rejected-config case writes `vocabulary` or `mayHold`.** All 49 existing `body-structure` cases produce
   identical faults under a copy of the validation patched to this record, and the unrecognised-key cases name keys, `levels`,
   `title`, `required` and `maxDepth`, that are not among the new ones.

## What each key may carry

`vocabulary` is a Rule key. Its value is a non-empty list of items, and an item is a mapping with exactly two keys.

| key       | in a vocabulary item                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| `level`   | required, an integer from 1 to 6, unique among the items of one Rule                         |
| `allowed` | required, a non-empty list of titles, each a non-empty string with no surrounding whitespace |

`mayHold` is an entry key, optional on `heading` and on `enumeration`: a non-empty list of `prose`, `ordered-list` and
`unordered-list`, each at most once, spelled exactly.

## Decisions

1. **An invalid shape is `CONFIG_INVALID_VALUE`, at the narrowest address.** A `vocabulary` that is not a list is a fault at
   `vocabulary`, an item that is not a mapping is a fault at the item, a `level` outside 1 to 6 is a fault at `level`, an
   `allowed` that is absent or not a list is a fault at `allowed`, a title that is not a non-empty string without leading or
   trailing whitespace is a fault at that element, a `mayHold` that is not a list is a fault at `mayHold`, and a kind outside
   the three, `Prose` and `code` included, is a fault at that element. A title with surrounding whitespace is refused because a
   heading's content never has any, so it could never match, and that is the silent dead entry 0020 exists to prevent. Any key
   outside `level` and `allowed` is `CONFIG_UNRECOGNISED_KEY` at the key, which is how `titles` is refused by name.
2. **An empty list is `CONFIG_EMPTY_CONSTRAINT`**, at the list: `vocabulary: []`, an item's `allowed: []`, and a `mayHold: []`.
   An empty `allowed` would forbid every heading at the level, which `maxLevel` and a closed spine already spell, and an empty
   `mayHold` would forbid every named kind and sits one slip from omitting the key, which leaves the section unconstrained. A
   forgotten list must not read as either. A form for "holds nothing" is a later decision (0028 decision 8).
3. **A repeat is a fault, raised at the later occurrence, for each of three things.**
   `CONFIG_DUPLICATE_VOCABULARY_LEVEL`, at the later item's `level`; `CONFIG_DUPLICATE_VOCABULARY_TITLE`, at the later title in
   one `allowed`; `CONFIG_DUPLICATE_BLOCK_KIND`, at the later kind in one `mayHold`. Each is decided only over the valid values
   of its list, so an invalid title or level is reported once and never also as a duplicate. A title may appear in two
   different items' lists, because the lists belong to different levels.
4. **`CONFIG_VOCABULARY_BEYOND_MAX_LEVEL`, at the item's `level`**: a vocabulary at a level deeper than the Rule's `maxLevel`,
   which no heading can reach. It is the vocabulary's counterpart of `CONFIG_ENTRY_BEYOND_MAX_LEVEL`, with its own code because
   the item is not an entry and a message that says "entry" misdirects the Operator. Decided only when the item's `level` and
   the Rule's `maxLevel` are valid, and not at all beside `undefinedHeadings: forbid`, because once 0026's exclusion is raised
   `maxLevel` is consulted by nothing else. `maxLevel` beside `allow` or no key is valid with a vocabulary at or above it, and a
   `body-structure` case freezes that pairing.
5. **`CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES`, at the item's `level`**: a vocabulary at a level some entry of `headings:` is
   written at (0027 decision 3). It is raised at the vocabulary and not at the entry, because the vocabulary is the new
   declaration whose pairing is refused, and the entry may be a sound one. Decided only when both levels are valid.
6. **A Rule is not empty when it writes `vocabulary`.** The payload rule of 0026 decision 6 reads four keys now: `headings`,
   `maxLevel`, `undefinedHeadings: forbid` and `vocabulary`. A Rule that writes only a vocabulary is valid, because "these are
   the titles this level may take" asks something of a body that nothing else says. `vocabulary: []` is reported at the list
   and the Rule is not also called empty, as `headings: []` is. `undefinedHeadings: allow` alone is still an empty constraint.
7. **`mayHold` is decided for every entry whose other keys are valid or not**, because it depends on nothing else: the purpose,
   the level and the pattern have no bearing on what a section may hold, so it is not silenced by an invalid `purpose` as the
   purpose-dependent checks are.

## The catalog

Reused: `CONFIG_UNRECOGNISED_KEY`, `CONFIG_INVALID_VALUE` and `CONFIG_EMPTY_CONSTRAINT`, each gaining the clauses above. **Five
codes are new**, each one fault with one repair, appended to the catalog's end in this order:

- `CONFIG_DUPLICATE_VOCABULARY_LEVEL`, at the later item's `level`.
- `CONFIG_DUPLICATE_VOCABULARY_TITLE`, at the later title.
- `CONFIG_VOCABULARY_BEYOND_MAX_LEVEL`, at the item's `level`.
- `CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES`, at the item's `level`.
- `CONFIG_DUPLICATE_BLOCK_KIND`, at the later kind.

0020's catalog, which 0026 took from 20 codes to 21, grows from **21 to 26**.

## Walk order

Within a Rule, 0026's order was: unrecognised keys, `ruleId`, `intent`, a missing selector, each axis's shape, `excludeFiles`,
the Rule-level empty payload, `maxLevel`, `undefinedHeadings`, the exclusion of `maxLevel` and `forbid`, then `headings`. It is
now: ..., the exclusion, **`vocabulary`**, then `headings`. `vocabulary` sits after both keys it reads, `maxLevel` and
`undefinedHeadings`, and before `headings` because it is a fact about the Rule.

Within `vocabulary`: the list's own shape and emptiness; then every repeated level across the whole list, each at the later
item; then each item in index order: unrecognised keys, `level`, `allowed` (its shape, its emptiness, each invalid title in
index order, then each repeated title), the level beyond `maxLevel`, and the level an entry is written at.

Within an entry, 0020's order was: unrecognised keys, `purpose`, `level`, `pattern`, the keys the purpose forbids, `presence`,
`minCount`, `maxCount`, inverted bounds, a missing count, an anchored-literal pattern, `intent`, a level beyond `maxLevel`. It is
now: ..., `intent`, **`mayHold`** (its shape and emptiness, each invalid kind in index order, then each repeated kind), then the
level beyond `maxLevel`. The cross-Module order and the rest of the order inside `headings` are unchanged. Two cases freeze the
positions: one Rule carrying faults from every stage, and one that writes `forbid`, `maxLevel` and a vocabulary together.

## Consequences

1. The rejected-config tier gains 17 cases, its hand-written list of codes grows from 21 to 26, and its compile-time pin goes red
   until the configuration contract adds the five.
2. The Rule's key set gains `vocabulary` and the entry's gains `mayHold`, and the Rule key set is still keyed by the type that
   declares it, so a key added to the type cannot be forgotten here.
3. A Rule that wants a heading-free kind of document, or a section that holds nothing, has no new spelling and does not need
   one this round.

## Considered options

**One code, `CONFIG_DUPLICATE_VALUE`, for all three repeats.** Rejected: the catalog's codes each name what is wrong, and a
code that means three things is how a template drifts. **A fault for a title with internal structure**, such as one with a
newline. Not raised: a setext heading's content may hold a line feed, so a title may too. **Raising the level-sharing fault at the
entry.** Rejected under decision 5. **`CONFIG_ENTRY_BEYOND_MAX_LEVEL` reused for a vocabulary.** Rejected under decision 4.
**Deciding duplicates over every written value.** Rejected under decision 3: 0020 reports a mistake once. **Making an empty
`mayHold` mean "nothing may be held".** Rejected under decision 2.
