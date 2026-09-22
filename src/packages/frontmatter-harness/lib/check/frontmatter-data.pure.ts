/**
 * Turn a file into frontmatter data, or say why it never became any.
 *
 * The parse itself, the try, and the mapping gate live in foundation's
 * `yaml-document.ts` entry point rather than here: `config-document.pure.ts`
 * used to hand-roll the identical three steps. `FrontmatterMapping` and the
 * seam's generic `Record<string, unknown>` are one shape under two names —
 * `FrontmatterMapping` is a plain alias, not a branded type — so the result
 * narrows here with no cast.
 *
 * NOTE the empty-document case, which is the one trap in this file and the
 * one place this reader disagrees with `config-document.pure.ts`. `parse('')`
 * returns `null`, and so does a block holding only a comment — but the spec is
 * explicit that an immediately-closed fence PARSES, to `{}`. That is why this
 * caller passes `'empty-mapping'` rather than `'fault'`: treating the parser's
 * empty result as an empty mapping is what makes `presence: required` fire on
 * `---`-then-`---` instead of being skipped, and it is why the two
 * unparseable shapes the spec names are a scalar and a list rather than
 * "anything that is not an object". See the seam's own docblock for why that
 * disagreement is kept explicit rather than settled one way for both readers.
 */

import { parseYamlDocument } from '../../../foundation/yaml-document.ts';
import type { FrontmatterData } from './check.types.ts';
import { frontmatterBlock } from './frontmatter-block.pure.ts';

/**
 * Read a file's frontmatter.
 *
 * @param text The file's full contents.
 */
export function frontmatterData(text: string): FrontmatterData {
  const block = frontmatterBlock(text);
  if (block.kind === 'absent') return { kind: 'absent' };
  if (block.kind === 'unterminated') return { kind: 'unparseable' };

  const result = parseYamlDocument(block.text, 'empty-mapping');
  return result.kind === 'mapping' ? { kind: 'mapping', data: result.document } : { kind: 'unparseable' };
}
