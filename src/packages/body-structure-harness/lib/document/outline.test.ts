// Colocated unit test for the outline: a body's top-level headings, in
// document order, each with its level and its raw content.
//
// The expected outlines are written by hand from design-ADR 0014's table of
// what counts as a heading, never read back off the lexer.

import { describe, expect, it } from 'vitest';
import { outlineOf } from './outline.pure.ts';

describe('outlineOf', () => {
  describe('success cases', () => {
    it('reads ATX headings at every level, in document order', () => {
      // ARRANGE
      const body = '# Title\n\nProse.\n\n## Findings\n\n### Detail\n\n###### Deepest\n';
      const expected = [
        { level: 1, content: 'Title' },
        { level: 2, content: 'Findings' },
        { level: 3, content: 'Detail' },
        { level: 6, content: 'Deepest' },
      ];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads setext headings as level one and level two', () => {
      // ARRANGE
      const body = 'Title\n=====\n\nSection\n-------\n';
      const expected = [
        { level: 1, content: 'Title' },
        { level: 2, content: 'Section' },
      ];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps inline markup in the raw content rather than rendering it', () => {
      // ARRANGE
      const body = '## **Findings**\n';
      const expected = [{ level: 2, content: '**Findings**' }];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('drops the closing sequence and surrounding whitespace from the content', () => {
      // ARRANGE
      const body = '##  Findings   ##   \n';
      const expected = [{ level: 2, content: 'Findings' }];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads no heading inside a backtick or tilde fence', () => {
      // ARRANGE
      const body = '```\n# not a title\n```\n\n~~~\n## nor this\n~~~\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading in a blockquote, a list item, or an HTML block', () => {
      // A heading nested in a container belongs to the container, not to the
      // document's own structure.
      // ARRANGE
      const body = '> # quoted\n\n- # listed\n\n<div>\n# inside html\n</div>\n\n<h1>element</h1>\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading from a missing space, seven hashes, an escape, or four leading spaces', () => {
      // ARRANGE
      const body = '#Title\n\n####### Seven\n\n\\# Escaped\n\n    # Indented code\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    // design-ADR 0014 admits a space, a tab or the line end after the `#` run,
    // as CommonMark does. The lexer also accepts any other whitespace there,
    // so each of these four would otherwise read as a heading.
    it.each([
      ['a non-breaking space', ' '],
      ['a vertical tab', '\u000b'],
      ['a form feed', '\u000c'],
      ['an ideographic space', '　'],
    ])('reads no heading when %s follows the # run', (_name, separator) => {
      // ARRANGE
      const body = `#${separator}Title\n\n###${separator}Detail\n`;
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading from a line that continues a paragraph after a non-breaking space', () => {
      // CommonMark reads both lines as one paragraph; the lexer had split the
      // second off as a heading of its own.
      // ARRANGE
      const body = 'Prose.\n# Title\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading from a line that lazily continues a blockquote or a list item, underline or not', () => {
      // In CommonMark each `#` line below is the lazy continuation of the
      // container's paragraph, and so is the underline after it. Ending the
      // container at that line would leave a setext heading at the top level.
      // ARRANGE
      const bodies = ['> Quoted\n# Title\n===\n', '- Item\n#\u000cTitle\n===\n', '- Item\n#Title\n===\n'];
      const expected = [[], [], []];
      // ACT
      const actual = bodies.map(outlineOf);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a # line that is not an ATX heading as setext content when an underline follows', () => {
      // design-ADR 0014: such a line is paragraph text, and a setext
      // underline makes paragraph text a heading whose content it is. A form
      // feed is the fourth character; it takes the setext path the same way.
      // ARRANGE
      const body = '# Title\n===\n\n#\u000bTitle\n---\n\nPara\n#　Title\n===\n\n#\u000cTitle\n---\n';
      const expected = [
        { level: 1, content: '# Title' },
        { level: 2, content: '#\u000bTitle' },
        { level: 1, content: 'Para\n#　Title' },
        { level: 2, content: '#\u000cTitle' },
      ];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads an empty heading with its level and empty content', () => {
      // ARRANGE
      const body = '##\n\n## \n';
      const expected = [
        { level: 2, content: '' },
        { level: 2, content: '' },
      ];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the line break inside a two-line setext heading', () => {
      // ARRANGE
      const body = 'Source:\nOne\n---\n';
      const expected = [{ level: 2, content: 'Source:\nOne' }];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a thematic break after a blank line as no heading', () => {
      // ARRANGE
      const body = 'Prose.\n\n---\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads CRLF line endings and up to three leading spaces as Markdown does', () => {
      // ARRANGE
      const body = '   # Title\r\n\r\n#\tTabbed\r\n';
      const expected = [
        { level: 1, content: 'Title' },
        { level: 1, content: 'Tabbed' },
      ];
      // ACT
      const actual = outlineOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
