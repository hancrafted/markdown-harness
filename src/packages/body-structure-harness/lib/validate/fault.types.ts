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
   * A title an earlier element of the same `allowed` list already holds, raised
   * at the later element's `title`. Decided over valid titles only. The name
   * predates the `allowed` key: it was the Rule-level vocabulary's, retired
   * with it (#229), and is kept so the one duplicate-title outcome keeps one code.
   */
  | 'CONFIG_DUPLICATE_VOCABULARY_TITLE'
  /**
   * A kind an earlier element of the same `mayHold` list already holds, raised
   * at the later element. Decided over valid kinds only.
   */
  | 'CONFIG_DUPLICATE_BLOCK_KIND'
  /**
   * A nested entry whose `level` is not deeper than its parent entry's, raised
   * at the child's `level`: a heading inside the parent's section is always
   * deeper, so the entry could never match. Decided only when both are valid.
   */
  | 'CONFIG_NESTED_ENTRY_NOT_DEEPER'
  /**
   * A heading entry writing both `pattern` and `allowed`, raised at `allowed`:
   * one entry names its title one way. Decided only when the pattern is valid
   * and the list non-empty, whatever its items hold, so a bad item is reported
   * at the item and the exclusion once.
   */
  | 'CONFIG_PATTERN_WITH_ALLOWED';

/** One fault in this Module's section. */
export type BodyStructureFault = ConfigFault<BodyStructureFaultCode>;
