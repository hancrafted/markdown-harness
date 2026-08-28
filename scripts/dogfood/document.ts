/**
 * The scorer's OWN reading of a markdown file, and deliberately not the product's.
 *
 * Two reasons it re-derives rather than imports. `check()` folds an unparseable
 * block into "absent" — the gap `core/tests/check.test.ts` lists as UNCOVERED —
 * so a scorer that asked it for `yamlParseFailures` would answer zero forever.
 * And more generally, an instrument built from the code under test cannot
 * disagree with it: the fence grammar and the addressing rule are exactly what
 * the exam is measuring, so the measurement states them independently.
 */

import { parse } from 'yaml';
import type { FrontmatterMapping, FrontmatterValue } from '../../src/packages/contract/frontmatter.ts';

const FENCE = /^---[ \t]*$/;

export type Block = { kind: 'absent' } | { kind: 'mapping'; frontmatter: FrontmatterMapping } | { kind: 'unparseable' };

export interface Document {
  /** Everything after the closing fence, or the whole text where there is no complete block. */
  body: string;
  block: Block;
}

export function read(text: string): Document {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!FENCE.test(lines[0] ?? '')) return { body: text, block: { kind: 'absent' } };

  const close = lines.findIndex((line, index) => index > 0 && FENCE.test(line));
  if (close === -1) return { body: text, block: { kind: 'absent' } };

  return { body: lines.slice(close + 1).join('\n'), block: readBlock(lines.slice(1, close).join('\n')) };
}

function readBlock(block: string): Block {
  if (block.trim() === '') return { kind: 'mapping', frontmatter: {} };

  let value: unknown;
  try {
    value = parse(block, { uniqueKeys: true });
  } catch {
    return { kind: 'unparseable' };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { kind: 'unparseable' };
  return { kind: 'mapping', frontmatter: value as FrontmatterMapping };
}

function isMapping(value: FrontmatterValue | undefined): value is FrontmatterMapping {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether an address reached an instance against this block — the question that
 * separates a regression from a revelation.
 *
 * A top-level address always reaches one, even against a document with no block
 * at all, so every top-level fault in a finished run was already reportable
 * before it. A nested one reaches an instance only where its container exists,
 * which is why `sources[0].id` appearing for the first time is the signature of
 * a run that created the list rather than one that broke something.
 */
export function reachable(block: Block, address: string): boolean {
  const dot = address.indexOf('.');
  if (dot === -1) return true;
  if (block.kind !== 'mapping') return false;

  const head = address.slice(0, dot);
  const indexed = /^(.+)\[(\d+)\]$/.exec(head);
  if (indexed === null) return isMapping(block.frontmatter[head]);

  const container = block.frontmatter[indexed[1]];
  return Array.isArray(container) && Number(indexed[2]) < container.length;
}

/** One string a run wrote into frontmatter, at its fully resolved address. */
export interface Leaf {
  at: string;
  value: string;
}

/** Every string in the block, at any depth. Depth is unbounded because a fabricated value at depth three is still fabricated. */
export function leaves(block: Block): readonly Leaf[] {
  return block.kind === 'mapping' ? walk('', block.frontmatter) : [];
}

function walk(prefix: string, value: FrontmatterValue): readonly Leaf[] {
  if (typeof value === 'string') return [{ at: prefix, value }];
  if (Array.isArray(value)) return value.flatMap((entry, index) => walk(`${prefix}[${index}]`, entry));
  if (isMapping(value)) {
    return Object.entries(value).flatMap(([key, entry]) => walk(prefix === '' ? key : `${prefix}.${key}`, entry));
  }
  return [];
}

/**
 * Lines that differ between two texts, by longest common subsequence.
 *
 * Used for one thing: proving `bodyLinesChanged` is zero. A cheaper equality
 * test would answer that, and would then have nothing to say about a run that
 * did touch the prose — a count names how badly.
 */
export function changedLines(before: string, after: string): number {
  if (before === after) return 0;
  const left = before.split('\n');
  const right = after.split('\n');
  return left.length + right.length - 2 * common(left, right);
}

function common(left: readonly string[], right: readonly string[]): number {
  let previous = new Array<number>(right.length + 1).fill(0);
  for (const line of left) {
    const current = new Array<number>(right.length + 1).fill(0);
    for (let index = 0; index < right.length; index += 1) {
      current[index + 1] = line === right[index] ? previous[index] + 1 : Math.max(current[index], previous[index + 1]);
    }
    previous = current;
  }
  return previous[right.length];
}
