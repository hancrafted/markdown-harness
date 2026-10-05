/**
 * Walk a Rule's spine at every depth.
 *
 * The Rule's own `headings:` list is walked over the whole outline. An entry
 * carrying a nested `headings:` list has it walked again over the headings
 * under every heading the entry claimed, once per claim: those after the
 * parent up to the next heading at its level or shallower, CommonMark's
 * nesting. Not the parent's section, which ends at the next heading of any
 * level and holds the blocks `mayHold` judges. Every list is walked by the same `walkSpine`, so a nested list
 * has exactly the semantics of the top one, only over a shorter stretch.
 *
 * A heading the walk left over, a repeat, a misplaced heading or one no entry
 * matches, is claimed by nobody, so no nested list is walked under it.
 */

import type { HeadingEntry } from '../../section.ts';
import type { OutlineHeading } from '../document/document.types.ts';
import type { EntryFinding, WalkedSpine } from './body-check.types.ts';
import { claimedPositions, matcherFor, walkSpine } from './spine-walk.pure.ts';

/** One list and the stretch of the outline it is walked over, with where it sits in the config. */
interface Stretch extends Pick<WalkedSpine, 'prefix' | 'under' | 'start'> {
  /** The list to walk. */
  entries: readonly HeadingEntry[];
  /** The whole-outline position just past the stretch's last heading. */
  end: number;
}

/**
 * The position just past the headings under the heading at `position`: the
 * next heading at its level or shallower, else the end of the outline.
 *
 * @param outline The body's top-level headings.
 * @param position The position of the parent heading.
 */
export function endOfHeadingsUnder(outline: readonly OutlineHeading[], position: number): number {
  const { level } = outline[position] as OutlineHeading;
  const next = outline.findIndex((heading, index) => index > position && heading.level <= level);
  return next === -1 ? outline.length : next;
}

/** Walk one list over its stretch. */
function walkStretch(outline: readonly OutlineHeading[], stretch: Stretch): WalkedSpine {
  const { entries, end, ...place } = stretch;
  const spine = { entries, matchers: entries.map(matcherFor), outline: outline.slice(place.start, end) };
  return { ...place, spine, walk: walkSpine(spine) };
}

/** The stretches one walked list's nested lists are walked over: in entry order, then in document order. */
function nestedStretches(outline: readonly OutlineHeading[], walked: WalkedSpine): readonly Stretch[] {
  const { spine, walk, start, prefix } = walked;
  return spine.entries.flatMap((entry, index) => {
    const nested = entry.headings;
    if (nested === undefined) return [];
    return claimedPositions(walk.findings[index] as EntryFinding).map((relative) => {
      const position = start + relative;
      const { content } = outline[position] as OutlineHeading;
      return {
        entries: nested,
        prefix: [...prefix, index],
        under: content,
        start: position + 1,
        end: endOfHeadingsUnder(outline, position),
      };
    });
  });
}

/** One list walked, then every list nested under it, depth-first. */
function walkFrom(outline: readonly OutlineHeading[], stretch: Stretch): readonly WalkedSpine[] {
  const walked = walkStretch(outline, stretch);
  return [walked, ...nestedStretches(outline, walked).flatMap((child) => walkFrom(outline, child))];
}

/**
 * Every list of a spine walked, the Rule's own first, then each nested list
 * depth-first: by parent entry in index order, then by parent heading in
 * document order.
 *
 * @param entries The Rule's `headings:` list, empty when it wrote none.
 * @param outline The body's top-level headings.
 */
export function walkNested(
  entries: readonly HeadingEntry[],
  outline: readonly OutlineHeading[],
): readonly WalkedSpine[] {
  return walkFrom(outline, { entries, prefix: [], start: 0, end: outline.length });
}
