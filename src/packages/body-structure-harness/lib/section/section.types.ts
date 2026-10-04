/**
 * The `body-structure-harness` Module's own section of the config file.
 *
 * It lives in this Package and no other (ARCH-008 §1.4): no Package outside
 * this one may name these declarations. What `config-contract` holds is the
 * vocabulary a section is BUILT from — here `Selector`, Core's two literal
 * axes — and this Module takes it as given.
 *
 * Below the root rather than at it, because ARCH-004 §2.4 fails a classified
 * file at a Package root; `../../section.ts` re-exports these type-only.
 *
 * The semantics, the loosening direction of every key and the fault catalog
 * are in design-ADRs 0012, 0017, 0018 and 0020.
 */

import type { Selector } from '../../../config-contract/index.ts';

/** Everything the `body-structure` section holds. */
export interface BodyStructureConfig {
  /** The ordered Rule list: the first Rule matching on every axis it carries wins, and nothing merges. */
  rules: readonly BodyStructureRule[];
}

/**
 * One Rule: a selector, a reason, and a template.
 *
 * Selects on Core's two literal axes plus `types`, the third axis this Module
 * alone owns (design-ADR 0012). Every axis the Rule carries must match, an
 * absent axis means every, and at least one of the three is written.
 */
export interface BodyStructureRule extends Selector {
  /** Unique within the section. */
  ruleId: string;
  /** Why this structure is asked for, in the Operator's words. Mandatory. */
  intent: string;
  /**
   * Literal frontmatter `type` values, compared by exact, case-sensitive
   * string equality. A file whose `type` is absent, not a string, or in an
   * unreadable block selects no Rule that writes this axis.
   */
  types?: readonly string[];
  /** Files this Rule gives back, in Core's selector vocabulary; decided from the path alone. */
  excludeFiles?: readonly Selector[];
  /**
   * The deepest heading level permitted, an integer from 1 to 6. Absent means
   * any depth is permitted: levels are open by default and forbidding depth is
   * an explicit act (design-ADR 0017).
   */
  maxLevel?: number;
  /**
   * Whether a heading no entry matches is permitted. `allow` is the open spine,
   * the default written out and the same as omission; `forbid` closes the spine
   * and reports each such heading (design-ADR 0025). Mutually exclusive with
   * `maxLevel` when `forbid` (design-ADR 0026).
   */
  undefinedHeadings?: UndefinedHeadings;
  /** The document's spine: entries processed in order by the walk of design-ADR 0017. */
  headings?: readonly HeadingEntry[];
}

/** The two values of `undefinedHeadings`. */
export type UndefinedHeadings = 'allow' | 'forbid';

/** Whether an entry is one fixed heading or a counted run of repeats. */
export type HeadingPurpose = 'heading' | 'enumeration';

/** Whether a `heading` entry must be matched. */
export type HeadingPresence = 'required' | 'optional';

/**
 * One entry of the spine.
 *
 * A `heading` is exactly one heading and may carry `presence`; an
 * `enumeration` counts the repeats of that entry alone and carries `minCount`,
 * `maxCount` or both. Which keys belong to which purpose is config validation's
 * to enforce (design-ADR 0020), not the type's, so one shape reads straight off
 * the YAML and rides the wire verbatim.
 */
export interface HeadingEntry {
  /** Mandatory, no default. */
  purpose: HeadingPurpose;
  /** An integer from 1 to 6. */
  level: number;
  /** ECMAScript regular expression, `u` flag, searched; absent matches any heading at `level` (design-ADR 0018). */
  pattern?: string;
  /** `heading` only; `required` when absent. */
  presence?: HeadingPresence;
  /** `enumeration` only: an integer of 0 or more. */
  minCount?: number;
  /** `enumeration` only: an integer of 1 or more. */
  maxCount?: number;
  /** What the section should contain: Steering only, never enforced. */
  intent?: string;
}
