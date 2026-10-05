/**
 * Read a body's outline with a bought Markdown lexer.
 *
 * Bought, not built (design-ADR 0014, tenet 7): every row of 0014's
 * recognition table past the first is a way a line regex goes silently wrong —
 * fences, indented code, HTML blocks, containers, setext underlines — and a
 * correct scanner for all of them is a block parser. `marked` is used as a
 * LEXER only: its block tokens are read and nothing is rendered.
 *
 * What a block is reads straight off the lexer's top-level token (design-ADR
 * 0028): a paragraph is prose and a list is ordered or unordered by the token's
 * own `ordered` flag. Every other block is transparent and is never recorded.
 *
 * The lexer knows nothing about frontmatter, and reads a `# comment` line in a
 * YAML block as a title, so the caller hands over the body with the block
 * already split off.
 */

import { Lexer, Tokenizer, type Token, type Tokens } from 'marked';
import type { BlockKind } from '../section/section.types.ts';
import type { OutlineSection } from './document.types.ts';

/**
 * How the lexer's block rules spell "an ATX opening": one to six `#`, then any
 * whitespace or the end. `\s` admits a non-breaking space, a vertical tab, a
 * form feed and U+3000 among others, where design-ADR 0014 and CommonMark admit
 * only a space, a tab or the line end.
 *
 * The heading rule writes it as a lookahead; the paragraph, setext, blockquote
 * and table rules write it as the interruption they refuse to run past. Every
 * one is narrowed, so a line the heading rule now declines is read as text:
 * paragraph text that can still take a setext underline, as 0014's table
 * says, or the lazy continuation of a container it would otherwise have ended.
 */
const LOOSE_OPENINGS = [
  ['#{1,6})(?=\\s|$)', '#{1,6})(?=[ \\t\\n]|$)'],
  ['#{1,6}(?:\\s|$)', '#{1,6}(?:[ \\t\\n]|$)'],
] as const;

/** One block rule with every loose ATX opening narrowed to 0014's three. */
function strictOpening(rule: RegExp): RegExp {
  const source = LOOSE_OPENINGS.reduce((written, [loose, strict]) => written.replaceAll(loose, strict), rule.source);
  return new RegExp(source, rule.flags);
}

/**
 * Where a list item stops for a heading, at up to `indent` leading spaces. The
 * lexer stops it at any `#`, so `#Title` — which is no heading — ended the
 * item and stood at the top level, where an underline made it one.
 */
function headingBegin(indent: number): RegExp {
  return new RegExp(`^ {0,${Math.min(3, Math.max(0, indent - 1))}}#{1,6}(?:[ \\t]|$)`);
}

/**
 * A lexer whose options are written out rather than left to the library's
 * mutable global defaults, so another caller's `marked.use` cannot change what
 * this Module counts as a heading, and whose ATX-reading rules are narrowed to
 * 0014.
 *
 * FRESH per call, never a module-level constant: the lexer's constructor
 * writes its rules into the tokenizer it is handed, and a pure file holds no
 * module-level state that anything writes (ARCH-006 §4). The lexer itself
 * normalises a carriage return to a line feed before any rule runs, which is
 * why `\n` stands for the line end in the narrowed rules.
 */
function strictLexer(): Lexer {
  const tokenizer = new Tokenizer();
  const lexer = new Lexer({ gfm: true, pedantic: false, breaks: false, tokenizer });
  const { block, other } = tokenizer.rules;
  const narrowed = Object.fromEntries(Object.entries(block).map(([name, rule]) => [name, strictOpening(rule)]));
  tokenizer.rules = {
    ...tokenizer.rules,
    block: { ...block, ...narrowed },
    other: { ...other, headingBeginRegex: headingBegin },
  };
  return lexer;
}

/** Whether a token is a heading, narrowed to the lexer's own heading shape. */
function isHeading(token: Token): token is Tokens.Heading {
  return token.type === 'heading';
}

/**
 * The kind of one top-level block, or `undefined` for a transparent one: a
 * fence, an indented block, a quote, a table, HTML, a thematic break, a link
 * definition or blank lines (design-ADR 0028). A list nested in a list item is
 * a child of its item and never reaches here, so it belongs to the outer list.
 */
function blockKindOf(token: Token): BlockKind | undefined {
  if (token.type === 'paragraph') return 'prose';
  if (token.type === 'list') return (token as Tokens.List).ordered ? 'ordered-list' : 'unordered-list';
  return undefined;
}

/**
 * The body's sections, in document order: each top-level heading with the kinds
 * of the blocks between it and the next top-level heading of ANY level, in
 * document order, one entry per block.
 *
 * The lexer's top-level token list IS the document's children: a heading
 * inside a blockquote or a list item is a child token, never a sibling of it,
 * so only top-level headings open or end a section. Blocks before the first
 * heading belong to no section (design-ADR 0028).
 *
 * @param body The Markdown after the frontmatter block, or the whole file when it has none.
 */
export function sectionsOf(body: string): readonly OutlineSection[] {
  const sections: { heading: Tokens.Heading; blocks: BlockKind[] }[] = [];
  for (const token of strictLexer().lex(body)) {
    if (isHeading(token)) {
      sections.push({ heading: token, blocks: [] });
      continue;
    }
    const kind = blockKindOf(token);
    if (kind !== undefined) sections.at(-1)?.blocks.push(kind);
  }
  return sections.map(({ heading, blocks }) => ({ heading: { level: heading.depth, content: heading.text }, blocks }));
}
