/**
 * The checks judged on a body's outline alone, before any spine is walked:
 * depth (`maxLevel`), and the headings nothing lists, which are the closure
 * (`undefinedHeadings: forbid`) and the heading vocabulary.
 */

import type { BodyStructureViolation } from '../../../response-contract/index.ts';
import type { OutlineHeading } from '../document/document.types.ts';
import type { Listing } from './body-check.types.ts';

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
 * The finding one heading earns from the outline alone, if any.
 * A heading at a vocabulary's level is judged by the vocabulary
 * and by nothing else, so it is never also undefined; any other heading is
 * undefined when the spine is closed and no entry matches it.
 */
function unlistedFinding(
  { closed, vocabulary, matchers }: Listing,
  heading: OutlineHeading,
): BodyStructureViolation | undefined {
  const { level, content } = heading;
  const item = vocabulary.find((candidate) => candidate.level === level);
  if (item !== undefined) {
    return item.allowed.includes(content)
      ? undefined
      : { violation: 'BODY_STRUCTURE__HEADING_NOT_IN_VOCABULARY', level, content, requirement: item };
  }
  if (!closed || matchers.some((matches) => matches(heading))) return undefined;
  return {
    violation: 'BODY_STRUCTURE__HEADING_UNDEFINED',
    level,
    content,
    requirement: { undefinedHeadings: 'forbid' },
  };
}

/**
 * Every heading no entry and no vocabulary lists, in document order whatever
 * the level: those outside a vocabulary, and, under a closed spine, those no
 * entry matches. Decided by asking each entry's matcher and never from the
 * walk, so a heading the walk left over is still defined when an entry matches
 * it.
 *
 * @param listing What lists a heading besides the outline itself: the closure, the vocabulary and the entries' matchers.
 * @param outline The body's top-level headings.
 */
export function unlistedViolations(
  listing: Listing,
  outline: readonly OutlineHeading[],
): readonly BodyStructureViolation[] {
  return outline.flatMap((heading) => unlistedFinding(listing, heading) ?? []);
}
