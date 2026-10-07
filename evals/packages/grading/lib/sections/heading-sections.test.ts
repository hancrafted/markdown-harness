// Colocated unit test for the heading splitter, which supplies the section
// boundary because the product's parser is not exposed by the command line.

import { describe, expect, it } from 'vitest';
import { findSection, splitSections } from './heading-sections.pure.ts';

const DOCUMENT = [
  '---',
  'type: research',
  '---',
  '# Title',
  'intro',
  '## Findings',
  'found',
  '### Detail',
  'deep',
  '## Sources',
  'src',
  '',
].join('\n');

describe('splitSections', () => {
  describe('success cases', () => {
    it('ends a section at the next heading of the same or a higher level, never at a deeper one', () => {
      // ARRANGE
      const expected = ['## Findings\nfound\n### Detail\ndeep\n'];
      // ACT
      const sections = splitSections(DOCUMENT);
      const findings = sections.find((section) => section.title === 'Findings');
      // ASSERT
      expect([DOCUMENT.slice(findings?.start, findings?.end)]).toEqual(expected);
    });

    it('lists every heading with its level and title', () => {
      // ARRANGE
      const expected = [
        [1, 'Title'],
        [2, 'Findings'],
        [3, 'Detail'],
        [2, 'Sources'],
      ];
      // ACT
      const actual = splitSections(DOCUMENT).map((section) => [section.level, section.title]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not read a hash line inside a code fence as a heading', () => {
      // ARRANGE
      const text = '# Real\n```\n# not a heading\n```\n';
      const expected = ['Real'];
      // ACT
      const actual = splitSections(text).map((section) => section.title);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds no section when no heading matches the scope, and one when it does', () => {
      // ARRANGE
      const sections = splitSections(DOCUMENT);
      const expectedTitle = 'Findings';
      // ACT
      const missing = findSection(sections, { level: 2, titlePattern: '^Nope$' });
      const found = findSection(sections, { level: 2, titlePattern: '^Findings$' });
      // ASSERT
      expect(missing).toBeUndefined();
      expect(found?.title).toBe(expectedTitle);
    });

    it('ignores a hash line inside frontmatter and a document with no headings', () => {
      // ARRANGE
      const text = '---\n# comment\n---\nplain\n';
      // ACT
      const actual = splitSections(text);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
