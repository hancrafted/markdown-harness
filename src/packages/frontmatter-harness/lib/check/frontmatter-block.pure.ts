/**
 * Where a frontmatter block starts and where it ends.
 *
 * Fences only — nothing here knows what YAML is. The split is what lets the
 * three failures stay distinguishable: a file that never opened a block, a
 * block that opened and lost its closing fence, and bytes that opened and
 * closed and still will not parse are three different findings, and collapsing
 * any two of them makes a `frontmatter: forbidden` rule pass on a file it
 * should refuse.
 */

/** The only fence this tool reads. Other frontmatter syntaxes are out of scope. */
const FENCE = '---';

/** Editors and Windows tooling both write these; neither means the block is absent. */
const BYTE_ORDER_MARK = '﻿';

/**
 * A fence line, allowing for the trailing bytes a real file carries.
 *
 * `trimEnd` covers the carriage return of a CRLF file and the stray space an
 * editor leaves behind. Both would otherwise make the whole block invisible,
 * which is the silent false negative this tool cannot have.
 */
function isFence(line: string | undefined): boolean {
  return line !== undefined && line.trimEnd() === FENCE;
}

/**
 * Locate a file's frontmatter block.
 *
 * The opening fence must be the FIRST line: a `---` further down a document is
 * a horizontal rule, and reading one as frontmatter would invent a block the
 * author never wrote. The closing fence is the first one after it, for the same
 * reason in reverse — the last one would swallow the body.
 *
 * @param text The file's full contents.
 */
export function frontmatterBlock(
  text: string,
): { kind: 'absent' } | { kind: 'unterminated' } | { kind: 'present'; text: string } {
  const lines = (text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text).split('\n');
  if (!isFence(lines[0])) return { kind: 'absent' };

  const closing = lines.findIndex((line, index) => index > 0 && isFence(line));
  if (closing === -1) return { kind: 'unterminated' };

  return {
    kind: 'present',
    text: lines
      .slice(1, closing)
      .map((line) => line.replace(/\r$/, ''))
      .join('\n'),
  };
}
