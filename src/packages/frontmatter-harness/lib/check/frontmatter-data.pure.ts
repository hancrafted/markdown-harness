/**
 * Turn a file into frontmatter data, or say why it never became any.
 *
 * Deterministic: the same bytes yield the same answer, so this carries the
 * `pure` classifier despite the `try`. `yaml` is an ordinary dependency rather
 * than a platform builtin, which is what keeps it admissible here — the same
 * reading `config-document.pure.ts` already relies on.
 */

import { parse } from 'yaml';
import type { FrontmatterData, FrontmatterMapping } from './check.types.ts';
import { frontmatterBlock } from './frontmatter-block.pure.ts';

/**
 * A mapping is the only shape frontmatter can have.
 *
 * Arrays are excluded explicitly: `typeof [] === 'object'`, so a block written
 * as a sequence would otherwise pass a bare object check and then answer every
 * field lookup with nothing, which reads as a conforming file.
 */
function isMapping(value: unknown): value is FrontmatterMapping {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Read a file's frontmatter.
 *
 * NOTE the null case, which is the one trap in this file. `parse('')` returns
 * `null`, and so does a block holding only a comment — but the spec is explicit
 * that an immediately-closed fence PARSES, to `{}`. Treating the parser's null
 * as an empty mapping is what makes `presence: required` fire on
 * `---`-then-`---` instead of being skipped, and it is why the two unparseable
 * shapes the spec names are a scalar and a list rather than "anything that is
 * not an object".
 *
 * @param text The file's full contents.
 */
export function frontmatterData(text: string): FrontmatterData {
  const block = frontmatterBlock(text);
  if (block.kind === 'absent') return { kind: 'absent' };
  if (block.kind === 'unterminated') return { kind: 'unparseable' };

  let parsed: unknown;
  try {
    parsed = parse(block.text);
  } catch {
    // The parser's own message is deliberately dropped: §4 stores no prose of
    // ours, and this violation carries neither a value nor a requirement.
    return { kind: 'unparseable' };
  }

  if (parsed === null || parsed === undefined) return { kind: 'mapping', data: {} };
  return isMapping(parsed) ? { kind: 'mapping', data: parsed } : { kind: 'unparseable' };
}
