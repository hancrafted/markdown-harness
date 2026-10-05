// Colocated unit test for the outline: a body's top-level headings, in
// document order, each with its level and its raw content, and the blocks of
// the section each one opens.
//
// The expected outlines are written by hand from CommonMark's rules of
// what counts as a heading and the three block kinds,
// never read back off the lexer.

import { describe, expect, it } from 'vitest';
import { sectionsOf } from './outline.pure.ts';

/** The headings alone, which is what the first `describe` states. */
const headingsOf = (body: string) => sectionsOf(body).map(({ heading }) => heading);

/** The kinds of each section's blocks, in document order, headed by the heading's content. */
const kindsOf = (body: string) => sectionsOf(body).map(({ heading, blocks }) => [heading.content, blocks]);

describe('headings of the outline', () => {
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
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps inline markup in the raw content rather than rendering it', () => {
      // ARRANGE
      const body = '## **Findings**\n';
      const expected = [{ level: 2, content: '**Findings**' }];
      // ACT
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('drops the closing sequence and surrounding whitespace from the content', () => {
      // ARRANGE
      const body = '##  Findings   ##   \n';
      const expected = [{ level: 2, content: 'Findings' }];
      // ACT
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no heading from a missing space, seven hashes, an escape, or four leading spaces', () => {
      // ARRANGE
      const body = '#Title\n\n####### Seven\n\n\\# Escaped\n\n    # Indented code\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    // A heading opening admits a space, a tab or the line end after the `#` run,
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
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
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
      const actual = bodies.map(headingsOf);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a # line that is not an ATX heading as setext content when an underline follows', () => {
      // Such a line is paragraph text, and a setext
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
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the line break inside a two-line setext heading', () => {
      // ARRANGE
      const body = 'Source:\nOne\n---\n';
      const expected = [{ level: 2, content: 'Source:\nOne' }];
      // ACT
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a thematic break after a blank line as no heading', () => {
      // ARRANGE
      const body = 'Prose.\n\n---\n';
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingsOf(body);
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
      const actual = headingsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('sectionsOf', () => {
  describe('success cases', () => {
    it('reads a paragraph as prose and each list as ordered or unordered by its own marker', () => {
      // ARRANGE
      const body = '## A\n\nProse.\n\n1. one\n2. two\n\n- bullet\n\n## B\n\n* star\n\n1) paren\n';
      const expected = [
        ['A', ['prose', 'ordered-list', 'unordered-list']],
        ['B', ['unordered-list', 'ordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the blocks of each section in document order, one entry per block, never merged', () => {
      // ARRANGE
      const body = '## A\n\nOne.\n\nTwo.\n\n- x\n\nThree.\n';
      const expected = [['A', ['prose', 'prose', 'unordered-list', 'prose']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('ends a section at the next heading of ANY level, so a subsection has a section of its own', () => {
      // ARRANGE
      const body = '## Decision\n\n### 1. First\n\n1. a\n\n### 2. Second\n\n- b\n\n## Next\n\nProse.\n';
      const expected = [
        ['Decision', []],
        ['1. First', ['ordered-list']],
        ['2. Second', ['unordered-list']],
        ['Next', ['prose']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('ends a section at a setext heading too', () => {
      // ARRANGE
      const body = '## A\n\nProse.\n\nSetext\n------\n\n- x\n';
      const expected = [
        ['A', ['prose']],
        ['Setext', ['unordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives a heading with nothing under it an empty section', () => {
      // ARRANGE
      const body = '## A\n\n## B\n';
      const expected = [
        ['A', []],
        ['B', []],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
    it('reads a bold label ahead of a list as prose, with the list a block of its own', () => {
      // ARRANGE
      const body = '## A\n\n**Positive:**\n\n1. one\n\n**Negative:**\n- two\n';
      const expected = [['A', ['prose', 'ordered-list', 'prose', 'unordered-list']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a list split by a paragraph at the left margin as two lists', () => {
      // ARRANGE
      const body = '## A\n\n1. a\n\nprose\n\n2. b\n';
      const expected = [['A', ['ordered-list', 'prose', 'ordered-list']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a bullet list straight after a numbered one as a second list, and a changed marker as a new list', () => {
      // ARRANGE
      const body = '## A\n\n1. a\n2. b\n- c\n- d\n\n## B\n\n- a\n* b\n';
      const expected = [
        ['A', ['ordered-list', 'unordered-list']],
        ['B', ['unordered-list', 'unordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a line that cannot interrupt a paragraph as part of it', () => {
      // Only a list starting at 1 may interrupt a paragraph.
      // ARRANGE
      const body = '## A\n\npara\n2. a\n\n## B\n\npara\n1. a\n';
      const expected = [
        ['A', ['prose']],
        ['B', ['prose', 'ordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads the blocks no kind names as transparent: they are neither a kind nor an end of the section', () => {
      // ARRANGE
      const body = [
        '## A',
        '',
        '```',
        'fence',
        '```',
        '',
        '    indented code',
        '',
        '> quote',
        '',
        '| a | b |',
        '| - | - |',
        '| 1 | 2 |',
        '',
        '<div>',
        'html',
        '</div>',
        '',
        '<!-- comment -->',
        '',
        '***',
        '',
        '[ref]: /x',
        '',
        'Prose.',
        '',
      ].join('\n');
      const expected = [['A', ['prose']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets a heading inside a fence, a quote or a list item end nothing', () => {
      // ARRANGE
      const body = '## A\n\n```\n## in fence\n```\n\n> ## in quote\n\n- ## in item\n\nProse.\n';
      const expected = [['A', ['unordered-list', 'prose']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('gives the blocks before the first heading to no section', () => {
      // ARRANGE
      const body = '<!-- marker -->\n\nA preamble.\n\n- a bullet\n\n## A\n\nProse.\n';
      const expected = [['A', ['prose']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a body with no heading as no section at all', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [kindsOf('Only prose.\n\n- and a list\n'), kindsOf('')];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a list nested in a list item as part of the outer list, whatever its own marker', () => {
      // ARRANGE
      const body =
        '## A\n\n1. a\n   - nested bullet\n   - another\n2. b\n\n## B\n\n- a\n  1. nested number\n  2. another\n';
      const expected = [
        ['A', ['ordered-list']],
        ['B', ['unordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a loose list, or one whose item holds a second paragraph or a fence, as one list', () => {
      // ARRANGE
      const body = '## A\n\n1. a\n\n2. b\n\n## B\n\n1. a\n\n   more\n\n   ```\n   code\n   ```\n\n2. b\n';
      const expected = [
        ['A', ['ordered-list']],
        ['B', ['ordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('splits a list on a transparent block between its items, as the lexer does', () => {
      // ARRANGE
      const body = '## A\n\n1. a\n\n<!-- c -->\n\n2. b\n';
      const expected = [['A', ['ordered-list', 'ordered-list']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a line of inline HTML, a bare image and an escaped bullet as prose', () => {
      // ARRANGE
      const body = '## A\n\n<b>x</b> bold\n\n![alt](/x.png)\n\n\\- not a list\n';
      const expected = [['A', ['prose', 'prose', 'prose']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a numbered list whatever number it starts at', () => {
      // ARRANGE
      const body = '## A\n\n5. five\n6. six\n\n## B\n\n0. zero\n';
      const expected = [
        ['A', ['ordered-list']],
        ['B', ['ordered-list']],
      ];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a task list as a bullet list', () => {
      // ARRANGE
      const body = '## A\n\n- [ ] todo\n- [x] done\n';
      const expected = [['A', ['unordered-list']]];
      // ACT
      const actual = kindsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps each heading with its own content, level included', () => {
      // ARRANGE
      const body = '# T\n\nProse.\n\n### D\n\n- x\n';
      const expected = [
        { heading: { level: 1, content: 'T' }, blocks: ['prose'] },
        { heading: { level: 3, content: 'D' }, blocks: ['unordered-list'] },
      ];
      // ACT
      const actual = sectionsOf(body);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
