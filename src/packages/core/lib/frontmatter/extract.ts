/**
 * The fence grammar.
 *
 * `check` takes FULL file text rather than a pre-split frontmatter block,
 * because this grammar is the difference between "no frontmatter" and
 * "forbidden frontmatter present" — so it is specification, and it belongs
 * behind the seam rather than in every caller.
 *
 * `unparseable` is never folded into `absent`. A broken block read as absent
 * would make a `frontmatter: forbidden` rule PASS on it: a silent false
 * negative, and the one bug a trust tool cannot have.
 */

import { parse } from 'yaml';
import type { Frontmatter, FrontmatterMapping } from '../../../contract/frontmatter.ts';

export type Extracted = { kind: 'absent' } | { kind: 'present'; frontmatter: Frontmatter } | { kind: 'unparseable' };

const FENCE = /^---[ \t]*$/;

export function extract(text: string): Extracted {
  // A BOM sits before byte 0 of the fence, and an editor puts it there without
  // being asked, so a file with one must not read as having no frontmatter.
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.length === 0 || !FENCE.test(lines[0])) return { kind: 'absent' };

  const close = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  // An unterminated opening fence is not frontmatter. A body horizontal rule
  // only ever CLOSES a block that was already open, which is why the search
  // starts at line 1 rather than scanning for pairs.
  if (close === -1) return { kind: 'absent' };

  const block = lines.slice(1, close).join('\n');
  // An empty block IS frontmatter — present, and holding nothing.
  if (block.trim() === '') return { kind: 'present', frontmatter: {} };

  return read(block);
}

function read(block: string): Extracted {
  let value: unknown;
  try {
    value = parse(block, { uniqueKeys: true });
  } catch {
    return { kind: 'unparseable' };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { kind: 'unparseable' };
  return { kind: 'present', frontmatter: value as FrontmatterMapping };
}
