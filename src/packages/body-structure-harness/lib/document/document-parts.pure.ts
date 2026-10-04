/**
 * Split one file into the frontmatter `type` this Module selects on and the
 * body whose headings it judges.
 *
 * The fence rule is Core's, reached through `foundation` (design-ADR 0014,
 * consequence 1), so this Module and `frontmatter-harness` cannot disagree
 * about where a block ends. Reading `type` out of the parsed block is this
 * Module's own business: the Core reads frontmatter without learning what any
 * field means (design-ADR 0012).
 */

import { frontmatterBlock } from '../../../foundation/frontmatter-block.ts';
import { parseYamlDocument } from '../../../foundation/yaml-document.ts';
import type { DocumentParts } from './document.types.ts';

/**
 * The `type` written in a parsed block, when it is a string.
 *
 * Exact and untouched: no trimming and no case folding, so `' research'`,
 * `Research` and `7` are not `research` (design-ADR 0012).
 */
function typeIn(block: string): string | undefined {
  const parsed = parseYamlDocument(block, 'empty-mapping');
  if (parsed.kind !== 'mapping') return undefined;
  const written = parsed.document.type;
  return typeof written === 'string' ? written : undefined;
}

/**
 * The parts of one file this Module reads.
 *
 * A block that opens and never closes leaves NO body (design-ADR 0014), so a
 * Rule governing the file reports its required headings missing rather than
 * reading YAML as Markdown.
 *
 * @param text The file's full contents.
 */
export function documentPartsOf(text: string): DocumentParts {
  const block = frontmatterBlock(text);
  if (block.kind === 'unterminated') return { type: undefined, body: '' };
  if (block.kind === 'absent') return { type: undefined, body: block.body };
  return { type: typeIn(block.text), body: block.body };
}
