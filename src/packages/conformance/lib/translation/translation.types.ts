/**
 * The two frozen halves of a selector translation.
 *
 * Both are read from JSON at the tier root, so these types are what a reader
 * has instead of comments inside the data: a JSON file cannot explain itself,
 * and neither half means anything without knowing which paths it is about.
 */

/** One corpus file and the rule that won it under first-match, or nothing. */
export interface FrozenAttribution {
  /** A tier-relative path to a file that EXISTS. */
  path: string;
  /** The winning `ruleId`, or `null` where no rule claims the file. */
  ruleId: string | null;
}

/** One path with no document behind it, and the steering answer it must get. */
export interface FrozenWitness {
  /** A tier-relative path to a file that does NOT exist, in a folder that does. */
  path: string;
  /** The response contract's whole-config governance discriminant. */
  governance: QueryResult['governance'];
  /** The winning `ruleId`, or `null` where the path is invisible. */
  ruleId: string | null;
  /**
   * The translation unit whose deliberately-accepted divergence this witness
   * records, if any.
   *
   * Absent on a witness whose answer the grammar change left alone. Present,
   * and naming a unit in `docs/research/selector-migration-both-grammars.md`,
   * on one whose answer the migration knowingly changed — so a reader can tell
   * a divergence someone argued for from one nobody noticed.
   */
  divergesFrom?: string;
}
import type { QueryResult } from '../../../response-contract/index.ts';
