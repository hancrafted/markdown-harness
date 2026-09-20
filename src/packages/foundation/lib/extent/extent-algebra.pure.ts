/**
 * Extent algebra: recursive extents with exclusions.
 *
 * One Selector minus a list of extents (design-ADR 0008).
 */

import type { ClaimExtent } from '../../../config-contract/index.ts';
import { selectorContains, selectorsOverlap } from './selector-overlap.pure.ts';

/**
 * Whether the outer extent contains every witness point the inner extent admits.
 */
export function contains(outer: ClaimExtent, inner: ClaimExtent): boolean {
  if (!selectorContains(outer.include, inner.include)) return false;

  for (const outerEx of outer.exclude) {
    if (extentsOverlap(outerEx, inner)) {
      const innerCoversExclusion = inner.exclude.some((innerEx) => contains(innerEx, outerEx));
      if (!innerCoversExclusion) return false;
    }
  }

  return true;
}

/**
 * Whether two recursive claim extents overlap.
 */
export function extentsOverlap(a: ClaimExtent, b: ClaimExtent): boolean {
  if (!selectorsOverlap(a.include, b.include)) return false;

  for (const exA of a.exclude) {
    if (contains(exA, b)) return false;
  }

  for (const exB of b.exclude) {
    if (contains(exB, a)) return false;
  }

  return true;
}
