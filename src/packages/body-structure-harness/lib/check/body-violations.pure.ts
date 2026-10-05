/**
 * What one body breaks of one Rule: the whole spine check behind one function
 * (design-ADR 0017, 0018, 0019, 0025).
 *
 * Three checks run over the body's top-level headings. Depth (`maxLevel`): levels
 * are open by default, and forbidding depth is an explicit act, one violation
 * per level beyond the limit, never per heading, so a report stays bounded.
 * Closure (`undefinedHeadings: forbid`): a heading no entry matches is a
 * violation of its own, judged on the outline before the walk, and exclusive
 * with depth. Both outline checks live in `outline-violations.pure.ts`.
 * Spine (`headings:`): entries processed in index order with one cursor over
 * the outline. A `heading` entry claims the first unclaimed match at or after
 * the cursor and the cursor moves just past it. An `enumeration` entry owns a
 * RUN, the stretch from the cursor to the first heading any LATER entry matches,
 * and its repeats are the headings of that run it matches. Neither moves the
 * cursor on failure. GREEDY, because a backtracking subsequence check can give
 * one file two readings, and tenet 1 asks every check be one a person can
 * reproduce by hand.
 *
 * Every leftover heading goes to the first rule that fits: it repeats a
 * `heading` entry that has claimed a heading, or an enumeration finds it outside
 * its run, or it belongs to `maxLevel` alone. A leftover matching a `heading`
 * entry that claimed nothing is reported by that entry as missing or out of
 * order and so never twice. Counting wherever a repeat sits and judging place
 * apart means a misplaced repeat is one violation and a missing one another,
 * and the Contributor is never told to add a heading that already exists.
 *
 * The walk, its matchers and leftover ownership are private: callers hold a
 * Rule and a body, never a cursor.
 */

import type { BodyStructureViolation } from '../../../response-contract/index.ts';
import type { BodyStructureRule, HeadingEntry } from '../../section.ts';
import type { OutlineHeading, OutlineSection } from '../document/document.types.ts';
import { sectionsOf } from '../document/outline.pure.ts';
import { closesSpine } from '../section/spine-closure.pure.ts';
import { dialectPattern } from '../validate/pattern-dialect.pure.ts';
import type { Claim } from './body-check.types.ts';
import { contentViolations } from './content-violations.pure.ts';
import { levelViolations, unnamedViolations } from './outline-violations.pure.ts';

/** Whether one heading matches one entry: its level, then its pattern searched over the raw content. */
type HeadingMatcher = (heading: OutlineHeading) => boolean;

/** The spine and the outline it is walked against, with one matcher per entry. */
interface Spine {
  entries: readonly HeadingEntry[];
  matchers: readonly HeadingMatcher[];
  outline: readonly OutlineHeading[];
}

/** What the walk found for one entry. */
interface EntryFinding {
  /** The position of the heading a `heading` entry claimed, when it claimed one. */
  claimed: number | undefined;
  /** For an `enumeration`: the positions of the headings of its run it matches. */
  repeats: readonly number[];
  /** Whether a `heading` entry found no heading at or after the cursor but one before it. */
  misplaced: boolean;
}

/** The mutable position of a walk: the cursor, and every outline position an entry has taken. */
interface WalkState {
  cursor: number;
  taken: Set<number>;
}

/** One entry and its index in the spine. */
interface Slot {
  entry: HeadingEntry;
  index: number;
}

/** `0 .. count - 1`. */
function positions(count: number): readonly number[] {
  return Array.from({ length: count }, (_, position) => position);
}

/** One entry's matcher: the level equal, and the pattern, when written, searched with the `u` flag and no other. */
function matcherFor(entry: HeadingEntry): HeadingMatcher {
  const pattern = entry.pattern === undefined ? undefined : dialectPattern(entry.pattern);
  return (heading) => heading.level === entry.level && (pattern === undefined || pattern.test(heading.content));
}

/** One `heading` entry: the first untaken match at or after the cursor, else misplaced or missing. */
function walkHeading(spine: Spine, index: number, state: WalkState): EntryFinding {
  const matches = spine.matchers[index] as HeadingMatcher;
  const free = (position: number): boolean =>
    !state.taken.has(position) && matches(spine.outline[position] as OutlineHeading);
  const claimed = positions(spine.outline.length).find((position) => position >= state.cursor && free(position));
  if (claimed === undefined) {
    return { claimed, repeats: [], misplaced: positions(state.cursor).some(free) };
  }
  state.taken.add(claimed);
  state.cursor = claimed + 1;
  return { claimed, repeats: [], misplaced: false };
}

/** One `enumeration` entry: its matches between the cursor and the first heading a later entry matches. */
function walkEnumeration(spine: Spine, index: number, state: WalkState): EntryFinding {
  const matches = spine.matchers[index] as HeadingMatcher;
  const later = spine.matchers.slice(index + 1);
  const yielded = (position: number): boolean =>
    later.some((match) => match(spine.outline[position] as OutlineHeading));
  const boundary = positions(spine.outline.length).find((position) => position >= state.cursor && yielded(position));
  const repeats = positions(boundary ?? spine.outline.length).filter(
    (position) =>
      position >= state.cursor && !state.taken.has(position) && matches(spine.outline[position] as OutlineHeading),
  );
  repeats.forEach((position) => state.taken.add(position));
  state.cursor = (repeats.at(-1) ?? state.cursor - 1) + 1;
  return { claimed: undefined, repeats, misplaced: false };
}

/** Walk one spine over one outline, then say what each entry found and which headings no entry took. */
function walkSpine(spine: Spine) {
  const { entries, outline } = spine;
  const state: WalkState = { cursor: 0, taken: new Set() };
  const findings = entries.map((entry, index) =>
    entry.purpose === 'enumeration' ? walkEnumeration(spine, index, state) : walkHeading(spine, index, state),
  );
  const leftovers = positions(outline.length).filter((position) => !state.taken.has(position));
  return { spine, findings, leftovers };
}

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

/** Every spine violation one outline carries, in entry order. */
function spineViolations(spine: Spine): readonly BodyStructureViolation[] {
  const { entries } = spine;
  const { findings, leftovers } = walkSpine(spine);
  const given = leftoversPerEntry(spine, findings, leftovers);
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
 * entry matches, is claimed by nobody and so its section is judged by nobody
 * (design-ADR 0028).
 */
function claimsOf(spine: Spine, sections: readonly OutlineSection[]): readonly Claim[] {
  const { findings } = walkSpine(spine);
  return spine.entries.map((entry, index) => {
    const { claimed, repeats } = findings[index] as EntryFinding;
    const positions = claimed === undefined ? repeats : [claimed];
    return { entry, index, sections: positions.map((position) => sections[position] as OutlineSection) };
  });
}

/**
 * Every violation one body carries against one Rule, in one defined order
 * (design-ADR 0019, 0025, 0027, 0028): the levels beyond `maxLevel`; then the
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
  const naming = { closed: closesSpine(rule), vocabulary: rule.vocabulary ?? [], matchers };
  const spine = { entries, matchers, outline };
  return [
    ...levelViolations(rule.maxLevel, outline),
    ...unnamedViolations(naming, outline),
    ...spineViolations(spine),
    ...contentViolations(claimsOf(spine, sections)),
  ];
}
