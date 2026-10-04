/**
 * The checks judged on a body's outline alone, before any spine is walked:
 * depth (`maxLevel`) and closure (`undefinedHeadings: forbid`), the two a Rule
 * never carries together (design-ADR 0019, 0025, 0026).
 */

import type { BodyStructureViolation } from '../../../response-contract/index.ts';
import type { OutlineHeading } from '../document/document.types.ts';

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

/**
 * Every heading no entry matches, in document order. Decided by asking each
 * entry's matcher and never from the walk, so a heading the walk left over is
 * still defined when an entry matches it (design-ADR 0025).
 *
 * @param matchers One per entry of the Rule's spine, which may have none.
 * @param outline The body's top-level headings.
 */
export function undefinedViolations(
  matchers: readonly ((heading: OutlineHeading) => boolean)[],
  outline: readonly OutlineHeading[],
): readonly BodyStructureViolation[] {
  return outline
    .filter((heading) => !matchers.some((matches) => matches(heading)))
    .map(({ level, content }) => ({
      violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
      level,
      content,
      requirement: { undefinedHeadings: 'forbid' },
    }));
}
