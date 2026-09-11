// The three fields an entry is built from, and the one answer every failure gets.

import { describe, expect, it } from 'vitest';
import { descriptorFields } from './descriptor-fields.pure.ts';

describe('descriptorFields', () => {
  describe('success cases', () => {
    it('reads all three fields out of a frontmatter block', () => {
      // ARRANGE
      const text = [
        '---',
        'title: Legacy',
        'name: legacy',
        'description: Carries both names.',
        '---',
        '',
        '# Legacy',
      ].join('\n');
      const expected = { title: 'Legacy', name: 'legacy', description: 'Carries both names.' };
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('folds a `>-` block to the single line it parses to', () => {
      // "Copied byte for byte" means byte for byte out of the PARSER, never out
      // of the file: a folded description has no byte-identical single-line
      // source form, and the folded string is the only single-line value there is.
      // ARRANGE
      const text = ['---', 'description: >-', '  One sentence spread', '  over two source lines.', '---'].join('\n');
      const expected = 'One sentence spread over two source lines.';
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual.description).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('answers nothing for a file carrying no frontmatter at all', () => {
      // Absence is not this Module's finding to report. It degrades the entry
      // to name-only and says nothing, which is what keeps one missing
      // description from yielding two findings from two Modules.
      // ARRANGE
      const text = ['# Just a heading', '', 'And prose.'].join('\n');
      const nothing = {};
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('answers nothing for a block that never closes', () => {
      // ARRANGE
      const text = ['---', 'title: Unterminated', '', '# Body'].join('\n');
      const nothing = {};
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });

    it('answers nothing for bytes that will not parse as YAML', () => {
      // ARRANGE
      const text = ['---', 'title: [unclosed', '---'].join('\n');
      const nothing = {};
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual).toEqual(nothing);
    });
  });

  describe('edge cases', () => {
    it('ignores a field whose value is not a string, because only a string is copyable', () => {
      // ARRANGE
      const text = ['---', 'title: 42', 'name:', '  - a list', 'description: A real sentence.', '---'].join('\n');
      const expected = { title: undefined, name: undefined, description: 'A real sentence.' };
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a block that opens after a byte order mark', () => {
      // Editors and Windows tooling both write one, and neither means the block
      // is absent — the silent false negative a trust tool cannot have.
      // ARRANGE
      const text = ['﻿---', 'description: Behind a BOM.', '---'].join('\n');
      const expected = 'Behind a BOM.';
      // ACT
      const actual = descriptorFields(text);
      // ASSERT
      expect(actual.description).toBe(expected);
    });
  });
});
