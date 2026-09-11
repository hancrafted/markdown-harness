/**
 * Putting the region into the file, in whatever state the file is found.
 *
 * Six states and one rule connecting them: the generator owns the marker bytes
 * and creates them, but it never deletes an adopter's content. Healing is safe
 * because it is non-destructive, NOT because it is deterministic — every
 * destructive alternative was equally deterministic and worse. Inserting the
 * missing end marker after the following contiguous list swallows a
 * hand-written list below it, because CommonMark merges blank-line-separated
 * lists into one loose list; inserting it at end of file swallows the adopter's
 * prose and deletes it on the same run.
 *
 * Appending happens ONCE. From the second run the pair is found wherever it
 * sits, so an adopter may move the region and the generator honours the move.
 * This is not end-of-file pinning: "everything after the end marker is yours"
 * holds from the first write onwards.
 */

import { scanMarkers } from './marker-scan.pure.ts';
import { CREATION_TEMPLATE } from './region-bytes.pure.ts';
import type { MarkerScan, RegionRefusal, RegionSplice, RegionWarning } from './region.types.ts';

/** Nothing was worth a trace. Named so the empty case is not a bare literal. */
const NO_WARNINGS: readonly RegionWarning[] = [];

/** Drop the trailing blank lines a file ends with, so appending cannot stack them. */
function withoutTrailingBlanks(lines: readonly string[]): readonly string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(0, end);
}

/**
 * Rejoin lines into a file: exactly one trailing newline, never a blank line
 * before it.
 *
 * The trim is not tidiness. `split('\n')` on a newline-terminated file yields a
 * final empty element, so rejoining without it appends a blank line on every
 * pass — and the template ends with a marker, so creation stacked one
 * immediately. Prettier strips trailing blanks, which makes this the difference
 * between a generated file that is a Prettier fixed point and one the repo's
 * own gate rewrites the moment it is written. Measured, not reasoned: the first
 * run of the planner produced it.
 */
function asFile(lines: readonly string[]): string {
  return `${withoutTrailingBlanks(lines).join('\n')}\n`;
}

/**
 * Append the pair at end of file, separated by one blank line.
 *
 * The one write path shared by three states — a file with no marker, a healed
 * file, and (through the template) a file that did not exist. Reusing it is why
 * the healing rule is delete-the-survivor-and-re-append rather than
 * insert-the-missing-half: one append path instead of two.
 */
function appended(lines: readonly string[], region: readonly string[]): string {
  return asFile([...withoutTrailingBlanks(lines), '', ...region]);
}

/** The three states in which nothing may be written, and nothing may be repaired. */
function refusalFor(found: MarkerScan): RegionRefusal | undefined {
  // Never recognised, so never healable — there is no survivor to delete, and
  // deleting an unrecognised comment would mean judging whether it is a typo of
  // ours or an unrelated comment.
  if (found.unterminated.length > 0) return 'REGION_START_UNTERMINATED';

  // Nothing is damaged, so healing does not apply, and choosing one of the two
  // pairs would be a guess about intent.
  if (found.starts.length > 1 || found.ends.length > 1) return 'REGION_PAIR_REPEATED';

  const [start] = found.starts;
  const [end] = found.ends;
  if (start === undefined || end === undefined) return undefined;
  return end < start ? 'REGION_MARKERS_CROSSED' : undefined;
}

/** Where the region goes, once the file is known to be writable at all. */
function placed(lines: readonly string[], found: MarkerScan, region: readonly string[]): RegionSplice {
  const [start] = found.starts;
  const [end] = found.ends;

  if (start === undefined && end === undefined)
    return { text: appended(lines, region), outcome: 'appended', warnings: NO_WARNINGS };

  // The survivor goes; the orphaned text below it stays in the file for a human
  // to remove. A fresh pair is appended at end of file through the SAME path an
  // unmarked file takes, which is why the healing rule needs no second write
  // path — and the Operator asked for the trace.
  if (start === undefined || end === undefined) {
    const survivor = start ?? end;
    const orphaned = lines.filter((_line, index) => index !== survivor);
    return { text: appended(orphaned, region), outcome: 'healed', warnings: ['REGION_MARKER_HALF_DELETED'] };
  }

  // Regenerated WHEREVER THE PAIR SITS. The adopter's bytes above the start
  // marker and below the end marker are carried across untouched.
  const rewritten = [...lines.slice(0, start), ...region, ...lines.slice(end + 1)];
  return { text: asFile(rewritten), outcome: 'regenerated', warnings: NO_WARNINGS };
}

/**
 * Splice one region into one file.
 *
 * @param existing The file's current contents, or `undefined` when no file exists.
 * @param region The region to write, markers included, as lines.
 */
export function spliceRegion(existing: string | undefined, region: readonly string[]): RegionSplice {
  // Creation is scaffolding, not ownership: everything above the start marker
  // is the adopter's from the moment the file exists. The template carries a
  // well-formed pair, so the real list arrives through the ordinary regenerate
  // path below rather than through a second write path.
  if (existing === undefined) {
    const created = spliceRegion(CREATION_TEMPLATE, region);
    return { ...created, outcome: 'created' };
  }

  const found = scanMarkers(existing);
  const refusal = refusalFor(found);
  if (refusal !== undefined) return { refusal, warnings: NO_WARNINGS };

  return placed(existing.split('\n'), found, region);
}
