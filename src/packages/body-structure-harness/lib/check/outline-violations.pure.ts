/**
 * The checks judged on a body's outline alone, before any spine is walked:
 * depth (`maxLevel`), and the headings no list at their position names under
 * a closed spine (`undefinedHeadings: forbid`).
 */

import type { OutlineHeading } from '../document/document.types.ts';
import type { Listing, WalkedSpine } from './body-check.types.ts';
import type { BodyStructureViolation } from './violation.types.ts';

/**
 * Every level deeper than `maxLevel` the outline uses, ascending, each with how
 * many headings sit at it.
 *
 * @param maxLevel The Rule's limit, or `undefined` when it wrote none, which permits any depth.
 * @param outline The body's top-level headings.
 */
export function levelViolations(
  maxLevel: number | undefined,
  outline: readonly OutlineHeading[],
): readonly BodyStructureViolation[] {
  if (maxLevel === undefined) return [];
  const counts = new Map<number, number>();
  for (const heading of outline) {
    if (heading.level > maxLevel) counts.set(heading.level, (counts.get(heading.level) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([level, found]) => ({
      violation: 'BODY_STRUCTURE__LEVEL_TOO_DEEP',
      level,
      found,
      requirement: { maxLevel },
    }));
}

/** Whether one walked list's stretch holds the heading at `position` and one of its entries matches it. */
function defines({ start, spine }: WalkedSpine, position: number, heading: OutlineHeading): boolean {
  const relative = position - start;
  return relative >= 0 && relative < spine.outline.length && spine.matchers.some((matches) => matches(heading));
}

/**
 * Every heading no list at its position names, in document order whatever the
 * level, when the spine is closed. A heading is defined when an entry of a
 * list whose stretch holds it matches it: the Rule's own list holds every
 * heading, and a nested spine only the headings under the heading it was
 * walked under.
 * Decided by asking each entry's matcher and never from the walk, so a heading
 * the walk left over is still defined when an entry matches it.
 *
 * @param listing Whether the spine is closed, and every list walked.
 * @param outline The body's top-level headings.
 */
export function unlistedViolations(
  { closed, spines }: Listing,
  outline: readonly OutlineHeading[],
): readonly BodyStructureViolation[] {
  if (!closed) return [];
  return outline.flatMap((heading, position): readonly BodyStructureViolation[] =>
    spines.some((walked) => defines(walked, position, heading))
      ? []
      : [
          {
            violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
            level: heading.level,
            content: heading.content,
            requirement: { undefinedHeadings: 'forbid' },
          },
        ],
  );
}
