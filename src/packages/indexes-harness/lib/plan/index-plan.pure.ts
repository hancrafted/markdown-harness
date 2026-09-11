/**
 * Every declared directory's index, planned but not written.
 *
 * A composition of deterministic functions, so it carries the deterministic
 * classifier rather than the impure one: composing is explicitly not a signal
 * for `impure`. Every byte it reads arrives inside the context — the corpus,
 * the sources, and the matcher — which is what lets the whole planner be
 * exercised without a filesystem.
 */

import type { DirectoryPath } from '../../../config-contract/index.ts';
import { declaredDirectories, directoryListing, indexPathFor } from '../entries/directory-listing.pure.ts';
import type { ListingContext } from '../entries/entries.types.ts';
import { regionLines } from '../region/region-bytes.pure.ts';
import { spliceRegion } from '../region/region-splice.pure.ts';
import type { RegionSplice, RegionWarning } from '../region/region.types.ts';
import type { IndexPlan, PlannedIndex } from './plan.types.ts';

/** Nothing was worth a trace. Named so the empty case is not a bare literal. */
const NO_WARNINGS: readonly RegionWarning[] = [];

/** What one directory's plan says, minus the two fields naming which directory it is. */
type PlannedFate = Omit<PlannedIndex, 'directory' | 'index'>;

/**
 * What the splice means for the plan.
 *
 * `changed` is the half a caller cannot work out for itself, and it is what
 * makes B4 observable rather than merely intended: a second run over an
 * unchanged tree reports `false` everywhere.
 */
function fateOf(spliced: RegionSplice, existing: string | undefined): PlannedFate {
  if (spliced.text === undefined) return { refusal: spliced.refusal, warnings: spliced.warnings, changed: false };

  return {
    outcome: spliced.outcome,
    warnings: spliced.warnings,
    text: spliced.text,
    changed: spliced.text !== existing,
  };
}

/** Plan one directory: resolve what it publishes, render it, then place it. */
function planOne(directory: DirectoryPath, context: ListingContext): PlannedIndex {
  const index = indexPathFor(directory);
  const existing = context.sources[index];
  const listing = directoryListing(directory, context);

  // An entry refusal aborts BEFORE the region is rendered at all, so a refused
  // directory never produces a half-written region — the file stays exactly as
  // it was, and a file that did not exist is still not created.
  if (listing.refusal !== undefined) {
    const refused = { refusal: listing.refusal, refusedAt: listing.refusedAt, warnings: NO_WARNINGS, changed: false };
    return { directory, index, ...refused };
  }

  const spliced = spliceRegion(existing, regionLines(listing.entries, listing.disclosed));
  return { directory, index, ...fateOf(spliced, existing) };
}

/**
 * Plan every declared directory, in config order.
 *
 * Config order has no meaning to the output — each directory is claimed once by
 * name and the list inside each region reuses `inTreeOrder`. It survives here
 * only so a report reads down the config the way an Operator wrote it.
 *
 * @param context The config, the corpus, its bytes, and the glob matcher.
 */
export function indexPlan(context: ListingContext): IndexPlan {
  return { indexes: declaredDirectories(context.config).map((directory) => planOne(directory, context)) };
}
