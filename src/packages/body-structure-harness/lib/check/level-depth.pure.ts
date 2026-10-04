/**
 * The `maxLevel` check: levels are open by default, and forbidding depth is an
 * explicit act (design-ADR 0017). One violation per level beyond the limit,
 * never per heading, so a report stays bounded.
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
