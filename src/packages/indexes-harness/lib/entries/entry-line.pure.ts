/**
 * One entry, as one line — or the reason it cannot be one.
 *
 * The text is copied unchanged: no escaping, no truncation, no reflowing. Three
 * strings cannot be copied and each is REFUSED rather than rewritten, which
 * aborts the whole directory rather than quietly producing a region with one
 * repaired line in it.
 *
 * Cost measured before the rule was written: zero files in either real corpus
 * trip any of the three today. That is what makes strictness affordable — and
 * strictness is the reversible direction.
 */

import { END_MARKER, START_MARKER } from '../region/marker-scan.pure.ts';
import type { EntryRefusal, IndexEntry } from './entries.types.ts';

/** What separates the link from its description. One hyphen, one space either side. */
const SEPARATOR = ' - ';

/** The list marker Prettier normalises to, which is what makes the region a fixed point. */
const BULLET = '- ';

/**
 * Whether the brackets in a string would survive being used as link text.
 *
 * A `]` with no `[` before it ends the link early and leaks the rest of the
 * entry into the document as prose, which is a corruption of the region rather
 * than an ugly line. An unclosed `[` is refused on the same terms: it swallows
 * the target.
 */
function bracketsBalance(text: string): boolean {
  let depth = 0;
  for (const character of text) {
    if (character === '[') depth += 1;
    if (character === ']') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Why this entry cannot be rendered, if it cannot.
 *
 * The bracket rule applies to the LINK TEXT only — a `]` in a description sits
 * outside the link and harms nothing. The other two apply to both strings: a
 * line break ends the list item wherever it appears, and a boundary literal
 * breaks the artifact's uniqueness invariant wherever it appears.
 *
 * @param entry One resolved entry.
 */
export function entryRefusal(entry: IndexEntry): EntryRefusal | undefined {
  const copied = [entry.text, entry.description ?? ''];

  if (copied.some((text) => text.includes('\n'))) return 'ENTRY_TEXT_HOLDS_LINE_BREAK';
  if (copied.some((text) => text.includes(START_MARKER) || text.includes(END_MARKER)))
    return 'ENTRY_TEXT_HOLDS_REGION_MARKER';
  if (!bracketsBalance(entry.text)) return 'ENTRY_TEXT_HOLDS_UNBALANCED_BRACKET';

  return undefined;
}

/**
 * Render one entry as one list item.
 *
 * A name-only entry is the ordinary degraded form, not an error: the separator
 * and the description are omitted together, so the line ends at the link.
 *
 * @param entry One resolved entry, already checked for refusal.
 */
export function entryLine(entry: IndexEntry): string {
  const link = `[${entry.text}](${entry.target})`;
  return entry.description === undefined ? `${BULLET}${link}` : `${BULLET}${link}${SEPARATOR}${entry.description}`;
}
