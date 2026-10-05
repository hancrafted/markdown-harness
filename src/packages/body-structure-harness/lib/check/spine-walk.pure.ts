/**
 * The spine walk: entries processed in index order with
 * one cursor over the outline, and what each entry found.
 *
 * A `heading` entry claims the first unclaimed match at or after the cursor and
 * the cursor moves just past it. An `enumeration` entry owns a RUN, the stretch
 * from the cursor to the first heading any LATER entry matches, and its repeats
 * are the headings of that run it matches. Neither moves the cursor on failure.
 * GREEDY, because a backtracking subsequence check can give one file two
 * readings, and tenet 1 asks every check be one a person can reproduce by hand.
 *
 * Every leftover heading goes to the first rule that fits: it repeats a
 * `heading` entry that has claimed a heading, or an enumeration finds it outside
 * its run, or it belongs to `maxLevel` alone. A leftover matching a `heading`
 * entry that claimed nothing is reported by that entry as missing or out of
 * order and so never twice.
 *
 * What the walk found is read twice, by the spine violations and by the
 * section-content claims, so it is walked once and handed to both.
 */

import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading } from '../document/document.types.ts';
import { dialectPattern } from '../validate/pattern-dialect.pure.ts';
import type { EntryFinding, HeadingMatcher, Spine, Walk } from './body-check.types.ts';

/** The mutable position of a walk: the cursor, and every outline position an entry has taken. */
interface WalkState {
  cursor: number;
  taken: Set<number>;
}

/** `0 .. count - 1`. */
function positions(count: number): readonly number[] {
  return Array.from({ length: count }, (_, position) => position);
}

/**
 * One entry's matcher: the level equal, then the pattern, when written,
 * searched with the `u` flag and no other, or the content, when `allowed` is
 * written, equal to one of its titles whole and case-sensitively.
 */
export function matcherFor(entry: HeadingEntry): HeadingMatcher {
  const pattern = entry.pattern === undefined ? undefined : dialectPattern(entry.pattern);
  const titles = entry.allowed?.map(({ title }) => title);
  return (heading) =>
    heading.level === entry.level &&
    (pattern === undefined || pattern.test(heading.content)) &&
    (titles === undefined || titles.includes(heading.content));
}

/**
 * The positions of the headings one entry claimed: the heading a `heading`
 * entry matched, or the repeats of an enumeration's run.
 */
export function claimedPositions({ claimed, repeats }: EntryFinding): readonly number[] {
  return claimed === undefined ? repeats : [claimed];
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

/** Walk one spine over one outline, then say what each entry found and how many leftover headings each was given. */
export function walkSpine(spine: Spine): Walk {
  const { entries, outline } = spine;
  const state: WalkState = { cursor: 0, taken: new Set() };
  const findings = entries.map((entry, index) =>
    entry.purpose === 'enumeration' ? walkEnumeration(spine, index, state) : walkHeading(spine, index, state),
  );
  const leftovers = positions(outline.length).filter((position) => !state.taken.has(position));
  return { findings, given: leftoversPerEntry(spine, findings, leftovers) };
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
function leftoversPerEntry(
  spine: Spine,
  findings: readonly EntryFinding[],
  leftovers: readonly number[],
): ReadonlyMap<number, number> {
  const given = new Map<number, number>();
  for (const position of leftovers) {
    const owner = ownerOf(spine, findings, spine.outline[position] as OutlineHeading);
    if (owner !== undefined) given.set(owner, (given.get(owner) ?? 0) + 1);
  }
  return given;
}
