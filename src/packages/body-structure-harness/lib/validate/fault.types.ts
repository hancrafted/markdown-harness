/**
 * The config faults this Module's section can earn.
 *
 * The Core's catalog plus the codes only this Module's grammar can earn. They
 * keep the `CONFIG_` prefix every config fault carries — a fault's `location`
 * already names the section — and they live here rather than in
 * `config-contract` so that Package stays Module-free (ARCH-008). `cli` derives
 * the whole catalog from the declared Module set.
 */

import type { ConfigFault, ConfigFaultCode } from '../../../config-contract/index.ts';

/** Every code a fault in this Module's section can carry. */
export type BodyStructureFaultCode =
  | ConfigFaultCode
  /**
   * A `body-structure` heading entry carrying a key its `purpose` forbids:
   * `minCount` or `maxCount` on a `heading`, `presence` on an `enumeration`.
   */
  | 'CONFIG_ENTRY_KEY_NOT_FOR_PURPOSE'
  /** A `body-structure` enumeration with neither `minCount` nor `maxCount`. */
  | 'CONFIG_ENUMERATION_WITHOUT_COUNT'
  /**
   * A `body-structure` enumeration whose `pattern` is an anchored literal: a
   * repeating heading whose text is known is a `heading`.
   */
  | 'CONFIG_ENUMERATION_PINS_TEXT'
  /**
   * A `body-structure` enumeration whose `minCount` exceeds its `maxCount`.
   * Decided only when both bounds are valid, so an invalid bound is reported
   * once.
   */
  | 'CONFIG_COUNT_BOUNDS_INVERTED'
  /**
   * A `body-structure` heading entry whose `level` exceeds the Rule's `maxLevel`.
   * Decided only when both are valid.
   */
  | 'CONFIG_ENTRY_BEYOND_MAX_LEVEL'
  /**
   * A `body-structure` Rule writing `maxLevel` beside `undefinedHeadings: forbid`,
   * raised at `maxLevel`. Decided only when both keys are valid.
   */
  | 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE'
  /**
   * A `body-structure` vocabulary whose `level` an earlier item already names,
   * raised at the later item's `level`. The `yaml` parser refuses a repeated
   * mapping key, so a list of items needs its own fault.
   */
  | 'CONFIG_DUPLICATE_VOCABULARY_LEVEL'
  /**
   * A title an earlier element of the same `allowed` list already holds, raised
   * at the later element. Decided over valid titles only.
   */
  | 'CONFIG_DUPLICATE_VOCABULARY_TITLE'
  /**
   * A vocabulary item whose `level` exceeds the Rule's `maxLevel`: a title no
   * heading can carry. Decided only when both are valid, and not beside
   * `undefinedHeadings: forbid`.
   */
  | 'CONFIG_VOCABULARY_BEYOND_MAX_LEVEL'
  /**
   * A vocabulary item at a level some `headings:` entry also names, raised at
   * the item's `level`: one heading would be behind two kinds of judgement.
   */
  | 'CONFIG_VOCABULARY_LEVEL_HAS_ENTRIES'
  /**
   * A kind an earlier element of the same `mayHold` list already holds, raised
   * at the later element. Decided over valid kinds only.
   */
  | 'CONFIG_DUPLICATE_BLOCK_KIND';

/** One fault in this Module's section. */
export type BodyStructureFault = ConfigFault<BodyStructureFaultCode>;
