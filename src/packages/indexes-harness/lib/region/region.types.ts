/**
 * The bounded span the generator owns inside a file, and what happened to it.
 *
 * PROTOTYPE. The vocabulary here is provisional in one specific way: issue #91
 * owns the violation family, so every code below is a placeholder name for a
 * state this prototype had to distinguish in order to act on it. What is NOT
 * provisional is the set of states — those are fixed by issue #107 part 7.
 */

/** What the generator did to one file. */
export type RegionOutcome =
  /** No `index.md` existed. One was created from the shipped template. */
  | 'created'
  /** An `index.md` existed carrying no recognised marker. A pair was appended at end of file. */
  | 'appended'
  /** Both markers were found, and the span between them was rewritten whole, wherever it sat. */
  | 'regenerated'
  /** Exactly one marker was found. The survivor was deleted and a fresh pair appended. */
  | 'healed';

/**
 * Why the generator wrote nothing at all for one directory.
 *
 * A refusal is not a repair and not a partial write: the region stays exactly as
 * it was. The precedent is `terraform-docs`, which hard-fails when its own input
 * does not parse — unlike OKF's own generator, which validates at no point and
 * silently skips a sibling it cannot read.
 */
export type RegionRefusal =
  /**
   * Two well-formed pairs in one file.
   *
   * Nothing is damaged, so the delete-and-reappend path does not apply, and
   * choosing one of the two would be a guess about intent. One directory gives
   * one `index.md` gives one region, so no config construct can produce a
   * second — a file holding two was written by hand.
   */
  | 'REGION_PAIR_REPEATED'
  /**
   * A `<!-- indexes:start` that never closes.
   *
   * Per CommonMark this opens an HTML block of type 2 that runs to the end of
   * the document, so it never matches the marker literal and is never
   * recognised. The one state healing cannot reach: there is no recognised
   * survivor to delete, and deleting an unrecognised comment would mean judging
   * whether it is a typo of ours or an unrelated comment.
   */
  | 'REGION_START_UNTERMINATED'
  /** An end marker sits above a start marker, so there is no span to rewrite. */
  | 'REGION_MARKERS_CROSSED';

/** A state worth a trace in the log, which changed nothing about what was written. */
export type RegionWarning =
  /**
   * A half-deleted pair was healed.
   *
   * The Operator asked for this logged so a trace survives. The orphaned list
   * stays in the file for a human to remove: determinism is not what makes
   * healing safe, non-destructiveness is.
   */
  'REGION_MARKER_HALF_DELETED';

/** Where the two recognised markers sit, and what damage was found beside them. */
export interface MarkerScan {
  /** Line indices of every recognised start marker, in file order. */
  starts: readonly number[];
  /** Line indices of every recognised end marker, in file order. */
  ends: readonly number[];
  /** Line indices of every `<!-- indexes:start` that carries no `-->`. */
  unterminated: readonly number[];
}

/** What splicing one region into one file produced. */
export interface RegionSplice {
  /** The file's full new contents, absent when the splice was refused. */
  text?: string;
  /** What was done, absent when the splice was refused. */
  outcome?: RegionOutcome;
  /** Why nothing was written, absent when something was. */
  refusal?: RegionRefusal;
  /** Everything worth a trace; empty when there is nothing. */
  warnings: readonly RegionWarning[];
}
