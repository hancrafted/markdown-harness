/**
 * The closed catalog of config faults, and the one shape a fault takes.
 *
 * It sits in the CONFIG contract rather than the response contract, and that is
 * a repair rather than a preference. The port below names `SectionValidation`,
 * which names a fault; `response-contract` names `FieldConstraints` back out of
 * this Package, so leaving the fault type there closed a cycle that
 * `no-circular` holds at `error`. `response-contract/index.ts` re-exports both
 * declarations, so every existing importer keeps working and the graph runs one
 * way.
 *
 * A config fault is result content rather than a throw (§4.5). A program whose
 * config errors arrive as stack traces has two output formats, and only one of
 * them is a contract.
 */

/**
 * The closed catalog of config faults (§3.5).
 *
 * A union of string literals rather than an `enum`: `enum` is the one
 * TypeScript construct with no type-erasure, so it emits runtime code Node
 * cannot strip. The entry path is executed by Node directly, which makes an
 * `enum` anywhere on it a startup failure rather than a style choice.
 *
 * Every member carries the `CONFIG_` prefix because a `code` is read in logs
 * and transcripts far from the envelope that scoped it — bare `INVALID_VALUE`
 * beside a frontmatter `VALUE_NOT_ALLOWED` would leave the reader guessing
 * which file to open.
 *
 * The first four name the file, the rest name a key inside it: the same split
 * HTTP draws between "no such thing", "cannot serve it", "malformed", and
 * "well-formed but wrong".
 */
export type ConfigFaultCode =
  /** Nothing exists at the config path. */
  | 'CONFIG_NOT_FOUND'
  /** Something is there but cannot be read as a file (permissions, a directory). */
  | 'CONFIG_UNREADABLE'
  /** The bytes are not valid YAML, or they parse to something other than a mapping. */
  | 'CONFIG_NOT_YAML'
  /**
   * A mapping in which no declared Module's key appears at all — a config that
   * parses and governs nothing.
   *
   * Reported by the LOADER against the config file, because only the loader
   * knows which Modules were declared. It used to be the Module's answer:
   * `frontmatter:` absent earned `CONFIG_EMPTY_RULE_LIST` at `frontmatter.rules`
   * from the one Module that existed. That answer could not survive a second
   * Module — each would have raised it for the other's config — so the question
   * moved up to the only place that can answer it once.
   *
   * A typo'd section name reaches this code beside `CONFIG_UNRECOGNISED_KEY`:
   * the misspelling is a key nobody claims, and the absence it leaves behind is
   * a config governing nothing. Both are reported, because a config fails whole.
   */
  | 'CONFIG_NO_MODULE_SECTION'
  /**
   * A key no declared Module claims, or a key a Module's own vocabulary does not
   * define.
   *
   * REDEFINED at the top level, where it used to mean "a key the config language
   * does not define". The config language no longer has a top level of its own:
   * the recognised key set is computed from the declared Module set, so the same
   * key is recognised or not depending on what the tool ships. Below the top
   * level it is unchanged — the Module owning that section decides.
   */
  | 'CONFIG_UNRECOGNISED_KEY'
  /** A defined key holding a value outside its type (`presence: maybe`). */
  | 'CONFIG_INVALID_VALUE'
  /**
   * `rules: []` — a section naming a Module and governing nothing.
   *
   * NARROWED: it used to cover an absent `frontmatter:` section too. The loader
   * now answers first for a config no declared Module's key appears in, and a
   * Module's `validateSection` is never called for a key that was never written,
   * so the only way to reach this code is to write the empty list.
   */
  | 'CONFIG_EMPTY_RULE_LIST'
  /** Two rules share a `ruleId`. */
  | 'CONFIG_DUPLICATE_RULE_ID'
  /**
   * A rule, or one of its exclusions, carrying neither selector axis.
   *
   * Redefined rather than respelled. It used to mean "neither `path` nor
   * `fileName`" — two keys exclusive of one another, where carrying neither was
   * one mistake and carrying both was the other. A selector is now `folders:`
   * and `fileNames:`, which INTERSECT, so carrying both is how an exact path is
   * spelled and only carrying neither is left to report. That is also why
   * `CONFIG_SELECTOR_AMBIGUOUS` was retired rather than renamed: two keys that
   * are not exclusive of one another cannot be ambiguous.
   */
  | 'CONFIG_SELECTOR_MISSING'
  /** A rule with no `intent`. */
  | 'CONFIG_MISSING_RULE_INTENT'
  /** A `pattern` with no sibling `intent`. */
  | 'CONFIG_MISSING_PATTERN_INTENT'
  /** Any `intent` key written and empty. */
  | 'CONFIG_EMPTY_INTENT'
  /** A constraint object stating nothing. */
  | 'CONFIG_EMPTY_CONSTRAINT'
  /** `frontmatter: forbidden` beside any payload key. */
  | 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD'
  /**
   * A rule whose effective `assess.stale` prompt has no
   * `stale_after: { presence: required }` beside it — a prompt that can never
   * fire, which is an Operator mistake nothing else would report.
   *
   * Same shape as `CONFIG_MISSING_PATTERN_INTENT`: one key meaningless without
   * another beside it. `presence: optional` does not satisfy it, because that is
   * precisely the accidental case. Reported at the RULE, and against the
   * EFFECTIVE prompt — so a Module-wide default forces the discipline on every
   * constraining rule, which is what makes one expensive to adopt and worth
   * knowing before writing it.
   */
  | 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD'
  /**
   * A `body-structure` heading entry carrying a key its `purpose` forbids:
   * `minCount` or `maxCount` on a `heading`, `presence` on an `enumeration`
   * (design-ADR 0020).
   */
  | 'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE'
  /** A `body-structure` enumeration with neither `minCount` nor `maxCount` (design-ADR 0020). */
  | 'CONFIG_ENUMERATION_WITHOUT_COUNT'
  /**
   * A `body-structure` enumeration whose `pattern` is an anchored literal: a
   * repeating heading whose text is known is a `heading` (design-ADR 0020).
   */
  | 'CONFIG_ENUMERATION_PINS_TEXT'
  /**
   * A `body-structure` enumeration whose `minCount` exceeds its `maxCount`.
   * Decided only when both bounds are valid, so an invalid bound is reported
   * once (design-ADR 0020).
   */
  | 'CONFIG_COUNT_BOUNDS_INVERTED'
  /**
   * A `body-structure` heading entry whose `level` exceeds the Rule's `maxLevel`.
   * Decided only when both are valid (design-ADR 0020).
   */
  | 'CONFIG_ENTRY_BEYOND_MAX_LEVEL'
  /**
   * A `body-structure` Rule writing `maxLevel` beside `undefinedHeadings: forbid`,
   * raised at `maxLevel`. Decided only when both keys are valid (design-ADR 0026).
   */
  | 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE'
  /**
   * A `body-structure` vocabulary whose `level` an earlier item already names,
   * raised at the later item's `level`. The `yaml` parser refuses a repeated
   * mapping key, so a list of items needs its own fault (design-ADR 0029).
   */
  | 'CONFIG_DUPLICATE_VOCABULARY_LEVEL'
  /**
   * A title an earlier element of the same `allowed` list already holds, raised
   * at the later element. Decided over valid titles only (design-ADR 0029).
   */
  | 'CONFIG_DUPLICATE_VOCABULARY_TITLE'
  /**
   * A vocabulary item whose `level` exceeds the Rule's `maxLevel`: a title no
   * heading can carry. Decided only when both are valid, and not beside
   * `undefinedHeadings: forbid` (design-ADR 0029).
   */
  | 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL'
  /**
   * A vocabulary item at a level some `headings:` entry also names, raised at
   * the item's `level`: one heading would be behind two kinds of judgement
   * (design-ADR 0027, 0029).
   */
  | 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES'
  /**
   * A kind an earlier element of the same `mayHold` list already holds, raised
   * at the later element. Decided over valid kinds only (design-ADR 0029).
   */
  | 'CONFIG_DUPLICATE_BLOCK_KIND';

/** One fault: which constraint failed, and where in the config to look. */
export interface ConfigFault {
  /** From §3.5's catalog. */
  code: ConfigFaultCode;
  /** The config's own notation, e.g. `frontmatter.rules[3].intent`. */
  location: string;
}
