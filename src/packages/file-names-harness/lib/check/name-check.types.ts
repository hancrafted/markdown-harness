/**
 * The shapes this Module uses while judging one name.
 *
 * Nothing here is part of the response contract — these are the working shapes
 * between the splitter, the constraint tier and the verdict.
 */

import type { Format, NameAllowedValue } from '../../../config-contract/index.ts';
import type { FileNameFindings } from '../../../response-contract/index.ts';

/**
 * The constraint keys a name and a part have IN COMMON.
 *
 * `SegmentConstraints` is this plus a mandatory `name`; `PlainSubject` is this
 * plus an excluded `segments`. Naming the intersection is what lets one
 * constraint tier serve both subjects, so the whole-stem shape and the
 * per-part shape cannot drift into judging `maxLength` differently.
 *
 * `presence` and the three list keys are absent here for the same reason they
 * are absent from both public shapes: every file has a stem, and a name is not
 * a list.
 */
export interface NameConstraints {
  /** Minimum length. */
  minLength?: number;
  /** Maximum length. */
  maxLength?: number;
  /** One of the named formats. */
  format?: Format;
  /** A regular expression the value must match. */
  pattern?: string;
  /** A closed set of permitted values, strings only. */
  allowed?: NameAllowedValue[];
  /** Why this constraint exists. Reported inside `requirement`, never as prose. */
  intent?: string;
}

/** One thing being judged: where it is addressed, and what it holds. */
export interface NameSite {
  /** The dotted address a violation reports — `file.slug`, or `file`. */
  segment: string;
  /** The part, or the whole stem, exactly as found. */
  value: string;
}

/**
 * One governed file and what this Module found in its name.
 *
 * Carries the findings block even when `violations` is EMPTY, because a
 * conforming governed file is invisible in a report and load-bearing in a
 * count: `summary.governedFiles` is the union across Modules, and the composer
 * can only union what each Module hands it.
 */
export interface NameOutcome {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** This Module's block for the file: its winning rule, and its findings. */
  findings: FileNameFindings;
}
