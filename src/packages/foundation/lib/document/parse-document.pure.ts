/**
 * Split one file's bytes into parsed frontmatter and body.
 *
 * The fence rule is Core's (design-ADR 0014) and the parse is the one every
 * Module needs: `'empty-mapping'`, because an immediately-closed fence PARSES,
 * to `{}`, which is what lets `presence: required` fire on `---`-then-`---`
 * instead of being skipped. What any key means is the Module's business
 * (design-ADR 0012).
 */

import { frontmatterBlock } from '../frontmatter/frontmatter-block.pure.ts';
import { parseYamlDocument } from '../yaml/yaml-document.pure.ts';
import type { ParsedDocument } from './document.types.ts';

/**
 * @param text The file's full contents.
 */
export function parseDocument(text: string): ParsedDocument {
  const block = frontmatterBlock(text);
  if (block.kind === 'absent') return { frontmatter: { kind: 'absent' }, body: block.body };
  if (block.kind === 'unterminated') return { frontmatter: { kind: 'unterminated' }, body: '' };

  const parsed = parseYamlDocument(block.text, 'empty-mapping');
  return {
    frontmatter: parsed.kind === 'mapping' ? { kind: 'mapping', data: parsed.document } : { kind: 'unparseable' },
    body: block.body,
  };
}
