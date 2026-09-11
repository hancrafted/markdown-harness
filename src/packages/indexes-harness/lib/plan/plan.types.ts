/**
 * What a run WOULD write, before anything writes.
 *
 * The plan is the whole public shape of this prototype, and the dry run is the
 * point rather than a convenience. *No mutation without an explicit command*
 * holds: generation is a command an Operator runs, never a side effect of
 * `--check`. A plan is what lets the Conformance suite assert the exact bytes
 * without ever touching the tree it asserts on.
 */

import type { DirectoryPath } from '../../../config-contract/index.ts';
import type { EntryRefusal } from '../entries/entries.types.ts';
import type { RegionOutcome, RegionRefusal, RegionWarning } from '../region/region.types.ts';

/** What one declared directory's index would become. */
export interface PlannedIndex {
  /** The directory as the config spelled it, trailing slash included. */
  directory: DirectoryPath;
  /** Where the region would be written, root-relative. Always `<directory>index.md`. */
  index: string;
  /** What would be done, absent when the directory is refused. */
  outcome?: RegionOutcome;
  /**
   * Why nothing would be written, absent when something would.
   *
   * Two families in one field, and they stay distinguishable by their prefixes:
   * a `REGION_` refusal is about the file's markers, an `ENTRY_` refusal about
   * a string this Module refuses to copy. Issue #91 owns the final vocabulary
   * and its tiers; these are the states this prototype had to act on.
   */
  refusal?: RegionRefusal | EntryRefusal;
  /** The path whose text caused an `ENTRY_` refusal, so an Operator has somewhere to go. */
  refusedAt?: string;
  /** Everything worth a trace, which changed nothing about what would be written. */
  warnings: readonly RegionWarning[];
  /** The file's full planned contents, absent when refused. */
  text?: string;
  /**
   * Whether writing would change anything on disk.
   *
   * False on a second run over an unchanged tree, which is B4 stated as
   * something observable rather than as an intention.
   */
  changed: boolean;
}

/** Everything one run would write, one entry per declared directory, in config order. */
export interface IndexPlan {
  /** One plan per declared directory, including the refused ones. */
  indexes: readonly PlannedIndex[];
}
