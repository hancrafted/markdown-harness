/**
 * What one body breaks of one Rule: the whole body check behind one function.
 *
 * Four checks run over the body, in this order. Depth (`maxLevel`): levels are
 * open by default, one violation per level beyond the limit, never per heading,
 * so a report stays bounded. The headings a closed spine
 * (`undefinedHeadings: forbid`) has no entry for at their position, in
 * document order, which live in `outline-violations.pure.ts`. Spine
 * (`headings:`): the walk of `spine-walk.pure.ts`, run over the whole outline
 * for the Rule's own list and again, by `nested-walk.pure.ts`, over the headings
 * under every heading a parent entry claimed, for each nested spine. Each entry is reported
 * as missing, out of order, repeated or out of count, list by list in walk
 * order and entry by entry in index order, counting wherever a repeat sits
 * while judging place apart, so a misplaced repeat is one violation and a
 * missing one another. A finding carries its entry's index path and, inside a
 * nested list, the heading the list was walked under. Section content
 * (`mayHold`): the blocks of an unlisted kind in the section each entry
 * claimed, judged in `content-violations.pure.ts`.
 *
 * The walk, its matchers and leftover ownership are private to the Module:
 * callers hold a Rule and a body, never a cursor.
 */

import type { BodyStructureRule } from '../../section.ts';
import type { OutlineSection } from '../document/document.types.ts';
import { sectionsOf } from '../document/outline.pure.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import type { EntryFinding, Placement, Walk, WalkedSpine } from './body-check.types.ts';
import { contentViolations } from './content-violations.pure.ts';
import { walkNested } from './nested-walk.pure.ts';
import { levelViolations, unlistedViolations } from './outline-violations.pure.ts';
import { claimedPositions } from './spine-walk.pure.ts';
import type { BodyStructureViolation, EntryLocator } from './violation.types.ts';

/** A `heading` entry: missing or out of order, else repeated. */
function headingViolations(
  { entry, locator }: Placement,
  finding: EntryFinding,
  repeats: number,
): readonly BodyStructureViolation[] {
  if (finding.claimed === undefined) {
    if (finding.misplaced)
      return [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', ...locator, requirement: entry }];
    if (entry.presence === 'optional') return [];
    return [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', ...locator, requirement: entry }];
  }
  if (repeats === 0) return [];
  return [{ violation: 'BODY_STRUCTURE__HEADING_REPEATED', ...locator, found: 1 + repeats, requirement: entry }];
}

/** An `enumeration` entry: out of order when a repeat lay outside its run, then below its minimum or above its maximum. */
function enumerationViolations(
  { entry, locator }: Placement,
  found: number,
  outside: number,
): readonly BodyStructureViolation[] {
  const violations: BodyStructureViolation[] = [];
  if (outside > 0)
    violations.push({ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', ...locator, requirement: entry });
  if (entry.minCount !== undefined && found < entry.minCount) {
    violations.push({ violation: 'BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM', ...locator, found, requirement: entry });
  }
  if (entry.maxCount !== undefined && found > entry.maxCount) {
    violations.push({ violation: 'BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM', ...locator, found, requirement: entry });
  }
  return violations;
}

/** Where entry `index` of one walked list sits: its index path, and the heading the list was walked under. */
function locatorOf({ prefix, under }: WalkedSpine, index: number): EntryLocator {
  return { entry: [...prefix, index], ...(under === undefined ? {} : { under }) };
}

/** Every spine violation one walked list carries, in entry order, read off its entries' placements. */
function spineViolations(walk: Walk, placements: readonly Placement[]): readonly BodyStructureViolation[] {
  return placements.flatMap((placement, index) => {
    const finding = walk.findings[index] as EntryFinding;
    const leftover = walk.leftovers.get(index) ?? 0;
    return placement.entry.purpose === 'heading'
      ? headingViolations(placement, finding, leftover)
      : enumerationViolations(placement, finding.repeats.length + leftover, leftover);
  });
}

/**
 * The sections each entry of one walked list claimed, in index order: a
 * `heading` entry claims the heading it matched and an `enumeration` the
 * repeats of its run. A heading the walk left over is claimed by nobody and so
 * its section is judged by nobody.
 */
function placementsOf(walked: WalkedSpine, sections: readonly OutlineSection[]): readonly Placement[] {
  const { spine, walk, start } = walked;
  return spine.entries.map((entry, index) => ({
    entry,
    locator: locatorOf(walked, index),
    sections: claimedPositions(walk.findings[index] as EntryFinding).map(
      (position) => sections[start + position] as OutlineSection,
    ),
  }));
}

/**
 * Every violation one body carries against one Rule, in one defined order:
 * the levels beyond `maxLevel`; then the headings a closed spine has no entry
 * for, in document order; then spine entries, list by list in walk order;
 * then section content, list by list.
 *
 * @param rule The Rule that governs the file.
 * @param body The file's markdown below its frontmatter.
 */
export function bodyViolations(rule: BodyStructureRule, body: string): readonly BodyStructureViolation[] {
  const sections = sectionsOf(body);
  const outline = sections.map(({ heading }) => heading);
  const spines = walkNested(rule.headings ?? [], outline);
  const placed = spines.map((walked) => ({ walk: walked.walk, placements: placementsOf(walked, sections) }));
  return [
    ...levelViolations(rule.maxLevel, outline),
    ...unlistedViolations({ closed: closesSpine(rule), spines }, outline),
    ...placed.flatMap(({ walk, placements }) => spineViolations(walk, placements)),
    ...contentViolations(placed.flatMap(({ placements }) => placements)),
  ];
}
