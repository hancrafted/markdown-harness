/**
 * The config faults this Module's section can earn.
 *
 * The Core's catalog plus the three codes only this Module's grammar can earn.
 * They keep the `CONFIG_` prefix every config fault carries — a fault's
 * `location` already names the section — and they live here rather than in
 * `config-contract` so that Package stays Module-free (ARCH-008). `cli` derives
 * the whole catalog from the declared Module set.
 */

import type { ConfigFault, ConfigFaultCode } from '../../../config-contract/index.ts';

/** Every code a fault in this Module's section can carry. */
export type FrontmatterFaultCode =
  | ConfigFaultCode
  /** A `pattern` with no sibling `intent`. */
  | 'CONFIG_MISSING_PATTERN_INTENT'
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
  | 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD';

/** One fault in this Module's section. */
export type FrontmatterFault = ConfigFault<FrontmatterFaultCode>;
