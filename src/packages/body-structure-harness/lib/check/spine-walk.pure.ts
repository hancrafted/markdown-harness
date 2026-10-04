/**
 * The spine walk, in full (design-ADR 0017): entries processed in index order
 * with one cursor over the outline.
 *
 * A `heading` entry claims the first unclaimed match at or after the cursor and
 * the cursor moves just past it. An `enumeration` entry owns a RUN, the stretch
 * from the cursor to the first heading any LATER entry matches, and its repeats
 * are the headings of that run it matches. Neither moves the cursor on failure.
 * GREEDY, because a backtracking subsequence check can give one file two
 * readings, and tenet 1 asks every check be one a person can reproduce by hand.
 */

import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading } from '../document/document.types.ts';
import type { EntryFinding, HeadingMatcher, Spine, WalkState, Walked } from './spine-walk.types.ts';

/** `0 .. count - 1`. */
function positions(count: number): readonly number[] {
  return Array.from({ length: count }, (_, position) => position);
}

/** One entry's matcher: the level equal, and the pattern, when written, searched with the `u` flag and no other. */
function matcherFor(entry: HeadingEntry): HeadingMatcher {
  const pattern = entry.pattern === undefined ? undefined : new RegExp(entry.pattern, 'u');
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

/**
 * Walk one spine over one outline.
 *
 * @param entries The Rule's spine.
 * @param outline The body's top-level headings.
 */
export function walkSpine(entries: readonly HeadingEntry[], outline: readonly OutlineHeading[]): Walked & Spine {
  const spine: Spine = { entries, matchers: entries.map(matcherFor), outline };
  const state: WalkState = { cursor: 0, taken: new Set() };
  const findings = entries.map((entry, index) =>
    entry.purpose === 'enumeration' ? walkEnumeration(spine, index, state) : walkHeading(spine, index, state),
  );
  const leftovers = positions(outline.length).filter((position) => !state.taken.has(position));
  return { ...spine, findings, leftovers };
}
