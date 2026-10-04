/**
 * The spine's violations: what the walk of `spine-walk.pure.ts` found, judged
 * against what each entry is (design-ADR 0017, 0019).
 *
 * Every leftover heading goes to the first rule that fits: it repeats a
 * `heading` entry that has claimed a heading, or an enumeration finds it outside
 * its run, or it belongs to `maxLevel` alone. A leftover matching a `heading`
 * entry that claimed nothing is reported by that entry as missing or out of
 * order and so never twice. Counting wherever a repeat sits and judging place
 * apart means a misplaced repeat is one violation and a missing one another,
 * and the Contributor is never told to add a heading that already exists.
 */

import type { BodyStructureViolation } from '../../../response-contract/index.ts';
import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading } from '../document/document.types.ts';
import { walkSpine } from './spine-walk.pure.ts';
import type { EntryFinding, Spine } from './spine-walk.types.ts';

/** The index of the entry a leftover heading is given to, when there is one. */
function ownerOf(spine: Spine, findings: readonly EntryFinding[], heading: OutlineHeading): number | undefined {
  const matching = spine.entries.flatMap((entry, index) =>
    spine.matchers[index]?.(heading) === true ? [{ entry, index }] : [],
  );
  const repeated = matching.find(
    ({ entry, index }) => entry.purpose === 'heading' && findings[index]?.claimed !== undefined,
  );
  return (repeated ?? matching.find(({ entry }) => entry.purpose === 'enumeration'))?.index;
}

/** For each entry, how many leftovers it was given: repeats of a `heading`, or repeats an enumeration found outside its run. */
function leftoversPerEntry(spine: Spine, findings: readonly EntryFinding[], leftovers: readonly number[]) {
  const given = new Map<number, number>();
  for (const position of leftovers) {
    const owner = ownerOf(spine, findings, spine.outline[position] as OutlineHeading);
    if (owner !== undefined) given.set(owner, (given.get(owner) ?? 0) + 1);
  }
  return given;
}

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

/**
 * Every spine violation one outline carries against one Rule's `headings:`, in
 * entry order. Depth is `maxLevel`'s business, reported elsewhere.
 *
 * @param entries The Rule's spine, or `undefined` when it wrote none.
 * @param outline The body's top-level headings.
 */
export function headingEntryViolations(
  entries: readonly HeadingEntry[] | undefined,
  outline: readonly OutlineHeading[],
): readonly BodyStructureViolation[] {
  const walked = walkSpine(entries ?? [], outline);
  const given = leftoversPerEntry(walked, walked.findings, walked.leftovers);
  return walked.entries.flatMap((entry, index) => {
    const finding = walked.findings[index] as EntryFinding;
    const extra = given.get(index) ?? 0;
    return entry.purpose === 'heading'
      ? headingViolations({ entry, index }, finding, extra)
      : enumerationViolations({ entry, index }, finding.repeats.length + extra, extra);
  });
}
