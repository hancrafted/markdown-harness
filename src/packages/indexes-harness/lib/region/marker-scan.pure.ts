/**
 * Where the region's boundaries are, decided by block structure rather than by
 * bytes.
 *
 * THIS IS THE FILE THE MARKER DECISION IS ABOUT. A raw `indexOf` scan — what
 * markdown-toc, all-contributors and terraform-docs all ship — is wrong here in
 * two measured ways, and this repo triggers both: a marker quoted inside a
 * fenced code block is a `code_block` and never a boundary, and a marker
 * appearing mid-line inside a paragraph is `html_inline` and never a boundary.
 * `docs/research/parts/markdownlint-obsidian.md` already quotes four marker
 * strings, and the design record this map produces will show a marker in a fence
 * inside a governed directory.
 *
 * PROTOTYPE DIVERGENCE, stated plainly. Issue #107 settles the finder as "AST,
 * matching top-level `html_block` nodes only", measured against
 * `commonmark@0.31.2`. This file is NOT that: it is a hand-rolled line scanner
 * over the subset of CommonMark's block grammar the decision actually turns on —
 * fenced code, indented code, and the requirement that the marker be the whole
 * of its own line. Admitting `commonmark` as a dependency is a decision ARCH-001
 * reserves for a human, and a prototype may not clear that bar on its own. The
 * two disagree on constructs no marker case reaches today; the findings record
 * names each one.
 */

import type { MarkerScan } from './region.types.ts';

/** The opening boundary, recognised on the trimmed literal and nothing else. */
export const START_MARKER = '<!-- indexes:start -->';

/** The closing boundary. */
export const END_MARKER = '<!-- indexes:end -->';

/**
 * What a damaged start marker begins with.
 *
 * `<!--indexes:start-->` is deliberately NOT this prefix: different bytes, so it
 * is never recognised as anything at all and never touched.
 */
const START_PREFIX = '<!-- indexes:start';

/** The bytes that close an HTML comment. */
const COMMENT_CLOSE = '-->';

/** Four spaces begin an indented code block, which no marker may hide inside. */
const CODE_INDENT = 4;

/** A tab advances to the next multiple of this, per CommonMark's tab expansion. */
const TAB_STOP = 4;

/** The two fence characters CommonMark defines. */
const FENCE_CHARACTERS: readonly string[] = ['`', '~'];

/** The shortest run of fence characters that opens or closes a fence. */
const SHORTEST_FENCE = 3;

/**
 * How far a line is indented, counting a tab to the next tab stop.
 *
 * Counted rather than trimmed, because the four-space threshold is the whole of
 * what separates a recognised marker from one inside an indented code block —
 * and `trimStart` would throw away the number that decides it.
 */
function indentOf(line: string): number {
  let width = 0;
  for (const character of line) {
    if (character === ' ') width += 1;
    else if (character === '\t') width += TAB_STOP - (width % TAB_STOP);
    else break;
  }
  return width;
}

/** The run of fence characters a line opens with, or zero if it opens none. */
function fenceRun(line: string): number {
  const trimmed = line.trim();
  const character = trimmed[0];
  if (character === undefined || !FENCE_CHARACTERS.includes(character)) return 0;
  let run = 0;
  while (trimmed[run] === character) run += 1;
  return run >= SHORTEST_FENCE ? run : 0;
}

/**
 * Whether a line closes the fence that is currently open.
 *
 * A closing fence carries the same character, is at least as long as the
 * opening run, and carries no info string after it.
 */
function closesFence(line: string, open: { character: string; run: number }): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith(open.character)) return false;
  let run = 0;
  while (trimmed[run] === open.character) run += 1;
  return run >= open.run && trimmed.slice(run).trim() === '';
}

/**
 * Which of the three things a line is, once it is known to be at block level.
 *
 * Recognition is on the TRIMMED literal, which is what lets legal indentation
 * and a trailing space through while refusing `<!--indexes:start-->` and
 * `<!-- indexes:start --> text`. The first two are invisible to a reader and
 * refusing a file over them would be hostile for zero contract value; the last
 * two are different bytes, and the boundary bytes have to be unique for the
 * artifact to mean anything to a consumer that is not this generator.
 */
function markerKind(trimmed: string): keyof MarkerScan | undefined {
  if (trimmed === START_MARKER) return 'starts';
  if (trimmed === END_MARKER) return 'ends';
  if (trimmed.startsWith(START_PREFIX) && !trimmed.includes(COMMENT_CLOSE)) return 'unterminated';
  return undefined;
}

/**
 * Locate every recognised boundary in one file, plus the damage beside them.
 *
 * @param text The file's full contents.
 */
export function scanMarkers(text: string): MarkerScan {
  const found: Record<keyof MarkerScan, number[]> = { starts: [], ends: [], unterminated: [] };
  let fence: { character: string; run: number } | undefined;

  text.split('\n').forEach((line, index) => {
    if (fence !== undefined) {
      if (closesFence(line, fence)) fence = undefined;
      return;
    }

    const opening = fenceRun(line);
    if (opening > 0) {
      fence = { character: line.trim()[0], run: opening };
      return;
    }

    // An indented code block. The marker is content there, not structure, and
    // CommonMark gives it no way to be anything else.
    if (indentOf(line) >= CODE_INDENT) return;

    const kind = markerKind(line.trim());
    if (kind !== undefined) found[kind].push(index);
  });

  return found;
}
