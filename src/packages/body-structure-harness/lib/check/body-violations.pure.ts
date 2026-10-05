/**
 * What one body breaks of one Rule: the whole body check behind one function.
 *
 * Four checks run over the body, in this order. Depth (`maxLevel`): levels are
 * open by default, one violation per level beyond the limit, never per heading,
 * so a report stays bounded. The headings the outline alone condemns: those a
 * closed spine (`undefinedHeadings: forbid`) has no entry for, and those outside
 * the vocabulary of their level, together in document order; both live in
 * `outline-violations.pure.ts`. Spine (`headings:`): the walk of
 * `spine-walk.pure.ts`, each entry reported as missing, out of order, repeated
 * or out of count, in entry order, and counting wherever a repeat sits while
 * judging place apart, so a misplaced repeat is one violation and a missing one
 * another. Section content (`mayHold`): the blocks of an unlisted kind in the
 * section each entry claimed, judged in `content-violations.pure.ts`.
 *
 * The walk, its matchers and leftover ownership are private to the Module:
 * callers hold a Rule and a body, never a cursor.
 */

import type { BodyStructureViolation } from '../../../response-contract/index.ts';
import type { BodyStructureRule, HeadingEntry } from '../../section.ts';
import type { OutlineSection } from '../document/document.types.ts';
import { sectionsOf } from '../document/outline.pure.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import type { Claim, EntryFinding, Spine, Walk } from './body-check.types.ts';
import { contentViolations } from './content-violations.pure.ts';
import { levelViolations, unlistedViolations } from './outline-violations.pure.ts';
import { matcherFor, walkSpine } from './spine-walk.pure.ts';

/** One entry and its index in the spine. */
interface Slot {
  entry: HeadingEntry;
  index: number;
}

/** A `heading` entry: missing or out of order, else repeated. */
function headingViolations(
  { entry, index }: Slot,
  finding: EntryFinding,
  repeats: number,
): readonly BodyStructureViolation[] {
  if (finding.claimed === undefined) {
    if (finding.misplaced)
      return [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: index, requirement: entry }];
    if (entry.presence === 'optional') return [];
    return [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: index, requirement: entry }];
  }
  if (repeats === 0) return [];
  return [{ violation: 'BODY_STRUCTURE__HEADING_REPEATED', entry: index, found: 1 + repeats, requirement: entry }];
}

/** An `enumeration` entry: out of order when a repeat lay outside its run, then below its minimum or above its maximum. */
function enumerationViolations(
  { entry, index }: Slot,
  found: number,
  outside: number,
): readonly BodyStructureViolation[] {
  const violations: BodyStructureViolation[] = [];
  if (outside > 0)
    violations.push({ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: index, requirement: entry });
  if (entry.minCount !== undefined && found < entry.minCount) {
    violations.push({
      violation: 'BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM',
      entry: index,
      found,
      requirement: entry,
    });
  }
  if (entry.maxCount !== undefined && found > entry.maxCount) {
    violations.push({
      violation: 'BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM',
      entry: index,
      found,
      requirement: entry,
    });
  }
  return violations;
}

/** Every spine violation one walk carries, in entry order. */
function spineViolations({ entries }: Spine, { findings, given }: Walk): readonly BodyStructureViolation[] {
  return entries.flatMap((entry, index) => {
    const finding = findings[index] as EntryFinding;
    const extra = given.get(index) ?? 0;
    return entry.purpose === 'heading'
      ? headingViolations({ entry, index }, finding, extra)
      : enumerationViolations({ entry, index }, finding.repeats.length + extra, extra);
  });
}

/**
 * The sections each entry claimed, in index order: a `heading` entry claims the
 * heading it matched and an `enumeration` the repeats of its run. A heading the
 * walk left over, a repeat, a misplaced heading, one outside a run, or one no
 * entry matches, is claimed by nobody and so its section is judged by nobody.
 */
function claimsOf({ entries }: Spine, { findings }: Walk, sections: readonly OutlineSection[]): readonly Claim[] {
  return entries.map((entry, index) => {
    const { claimed, repeats } = findings[index] as EntryFinding;
    const positions = claimed === undefined ? repeats : [claimed];
    return { entry, index, sections: positions.map((position) => sections[position] as OutlineSection) };
  });
}

/**
 * Every violation one body carries against one Rule, in one defined order
 *: the levels beyond `maxLevel`; then the
 * headings the outline alone condemns, undefined and outside a vocabulary
 * together in document order; then spine entries in entry order; then section
 * content by entry.
 *
 * @param rule The Rule that governs the file.
 * @param body The file's markdown below its frontmatter.
 */
export function bodyViolations(rule: BodyStructureRule, body: string): readonly BodyStructureViolation[] {
  const sections = sectionsOf(body);
  const outline = sections.map(({ heading }) => heading);
  const entries = rule.headings ?? [];
  const matchers = entries.map(matcherFor);
  const listing = { closed: closesSpine(rule), vocabulary: rule.vocabulary ?? [], matchers };
  const spine = { entries, matchers, outline };
  const walk = walkSpine(spine);
  return [
    ...levelViolations(rule.maxLevel, outline),
    ...unlistedViolations(listing, outline),
    ...spineViolations(spine, walk),
    ...contentViolations(claimsOf(spine, walk, sections)),
  ];
}
