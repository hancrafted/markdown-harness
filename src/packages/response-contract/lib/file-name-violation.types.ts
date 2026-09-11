/**
 * What one thing wrong with one file's NAME looks like in a report.
 *
 * Its own union and its own catalog, rather than members added to `Violation`.
 * The two report opposite repairs — rename the file, or edit the frontmatter —
 * and a consumer that had to read a sibling field to know which is which would
 * be doing the discrimination the code is supposed to have already done.
 */

import type { FileSubject, SegmentConstraints } from '../../config-contract/index.ts';
import type { FILE_NAME_VIOLATION_CODES } from './file-name-violation.pure.ts';

/**
 * The seven codes, discriminated on the OUTCOME rather than the constraint.
 *
 * DERIVED FROM THE CATALOG, never written out twice: the codes ship as a
 * `const` object so something can enumerate them at run time, and a `types`
 * file may hold no runtime value (ARCH-005) — so the object lives in the `pure`
 * sibling and this union reads its values.
 *
 * A union of string literals rather than an `enum`, so a consumer can compare
 * against a plain string read out of JSON.
 */
export type FileNameViolationCode = (typeof FILE_NAME_VIOLATION_CODES)[keyof typeof FILE_NAME_VIOLATION_CODES];

/**
 * A constraint on a name, or on one part of it, failed.
 *
 * There is exactly one shape here, where the frontmatter Module has five. A
 * name has no block that can fail to parse, no unknown keys, and no set
 * constraints across several addresses — so the four shapes that exist for
 * those cases have nothing to describe.
 */
export interface SegmentViolation {
  /**
   * WHICH PART FAILED, as a dotted address: `file.slug`, or `file` alone.
   *
   * A new key rather than widening `field`, which is a frontmatter field
   * address in both `violation.types.ts` and `--query` and would start meaning
   * two things at once.
   *
   * Dotted rather than a bare segment name so a returning `folder:` subject
   * inherits the spelling — `folder.kind` beside `file.category` — without the
   * address changing shape for anyone who already stored one. `file` alone is
   * what a whole-stem finding and a part-count finding report, because neither
   * is about any single declared part.
   */
  segment: string;

  /**
   * The part, or the whole stem, exactly as found.
   *
   * ABSENT AS A KEY when nothing was found to report — a part-count failure has
   * no single offending part, so it carries the stem instead and a reader is
   * never handed a `null` to interpret.
   */
  value?: string;

  /** Which outcome fired. */
  violation: FileNameViolationCode;

  /** What was asked, and what the whole name was supposed to look like. */
  requirement: NameRequirement;
}

/**
 * The failing block VERBATIM, beside a DERIVED roster of the declared names.
 *
 * The second capped exception to "every requirement is verbatim"
 * (`UnknownKeyViolation.allowedKeys` is the first), and capped the same way:
 * the roster is names only, never the whole `segments:` list. Two reasons it is
 * not the whole list — `--check` has never shown a consumer a whole rule, which
 * is `--query`'s `ConstrainingRequirements` and its job; and one misnamed file
 * can carry several findings, so the whole list would be repeated per finding.
 *
 * The roster is what makes a single finding actionable. Told only that
 * `file.slug` failed `format: kebab-case`, an agent cannot see that the name it
 * must produce is `<category>__<slug>`. Told the roster, it can.
 */
export interface NameRequirement {
  /**
   * The declared part names, in order. Present only where `segments:` was
   * declared, so its absence is what marks a whole-stem finding.
   */
  segments?: readonly string[];

  /**
   * The block that failed, verbatim from the config.
   *
   * One segment's own object for a part-level finding; the `file:` subject
   * itself for a whole-stem or part-count finding.
   */
  declared: SegmentConstraints | FileSubject;
}
