/**
 * The section-content check: which blocks of a section its entry's `mayHold`
 * does not list.
 *
 * It judges what it is handed and never decides which sections an entry
 * claimed: that is the walk's, in `body-violations.pure.ts`.
 */

import type { BlockKind, OutlineSection } from '../document/document.types.ts';
import type { Claim } from './body-check.types.ts';
import type { BodyStructureViolation } from './violation.types.ts';

/** How many blocks of each kind a section holds, in the order each kind first appears. */
function countsByKind(blocks: readonly BlockKind[]): ReadonlyMap<BlockKind, number> {
  const counts = new Map<BlockKind, number>();
  for (const kind of blocks) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return counts;
}

/** One violation per unlisted kind of one claimed section. */
function sectionViolations(
  { entry, locator }: Claim,
  allowed: readonly BlockKind[],
  { heading, blocks }: OutlineSection,
): readonly BodyStructureViolation[] {
  return [...countsByKind(blocks)]
    .filter(([kind]) => !allowed.includes(kind))
    .map(([kind, found]) => ({
      violation: 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED',
      ...locator,
      content: heading.content,
      kind,
      found,
      requirement: entry,
    }));
}

/**
 * Every block of an unlisted kind in a claimed section, one violation per
 * section and kind with the count of its blocks, ordered by claim, then section
 * in document order, then kind in the order it first appears. An entry that
 * writes no `mayHold` leaves its sections unconstrained.
 *
 * @param claims One per entry of every list walked, lists in walk order and entries in index order.
 */
export function contentViolations(claims: readonly Claim[]): readonly BodyStructureViolation[] {
  return claims.flatMap((claim) => {
    const { mayHold } = claim.entry;
    return mayHold === undefined ? [] : claim.sections.flatMap((section) => sectionViolations(claim, mayHold, section));
  });
}
