/**
 * The frontmatter `type` this Module selects on.
 *
 * The Core hands back the parsed mapping and never says what a field means
 * (design-ADR 0012); reading `type` out of it is this Module's own business.
 * The body, and the rule that an unterminated block leaves none (design-ADR
 * 0014), arrive already decided on the Core's document.
 */

import type { Frontmatter } from '../../../foundation/read-corpus.ts';

/**
 * The `type` written in a parsed block, when it is a string.
 *
 * Exact and untouched: no trimming and no case folding, so `' research'`,
 * `Research` and `7` are not `research` (design-ADR 0012).
 */
export function documentTypeOf(frontmatter: Frontmatter): string | undefined {
  if (frontmatter.kind !== 'mapping') return undefined;
  const written = frontmatter.data.type;
  return typeof written === 'string' ? written : undefined;
}
