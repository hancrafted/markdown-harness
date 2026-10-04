// Colocated unit test for splitting one file into the two things this Module
// reads: the frontmatter `type` it selects on, and the body whose headings it
// judges.

import { describe, expect, it } from 'vitest';
import { documentPartsOf } from './document-parts.pure.ts';

describe('documentPartsOf', () => {
  describe('success cases', () => {
    it('reads a string type and the body after the closing fence', () => {
      // ARRANGE
      const text = '---\ntype: research\n---\n# Report\n';
      const expected = { type: 'research', body: '# Report\n' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a file with no block as all body and no type', () => {
      // ARRANGE
      const text = '# Report\n';
      const expected = { type: undefined, body: '# Report\n' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads no type from a block that does not parse, and keeps the body', () => {
      // ARRANGE
      const text = '---\ntype: [research\n---\n# Research\n';
      const expected = { type: undefined, body: '# Research\n' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads neither a type nor any body from a block that never closes', () => {
      // design-ADR 0014: an unterminated block leaves no body, so a heading
      // inside it is never read as Markdown.
      // ARRANGE
      const text = '---\ntype: research\n\n# Looks like a title\n';
      const expected = { type: undefined, body: '' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no type from a null, a number, or a list', () => {
      // ARRANGE
      const texts = ['---\ntype:\n---\n', '---\ntype: 7\n---\n', '---\ntype: [research]\n---\n'];
      const expected = [undefined, undefined, undefined];
      // ACT
      const actual = texts.map((text) => documentPartsOf(text).type);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps a quoted type exactly as written, leading space and case included', () => {
      // design-ADR 0012: exact, case-sensitive equality and no trimming.
      // ARRANGE
      const text = "---\ntype: ' Research'\n---\n";
      const expected = ' Research';
      // ACT
      const actual = documentPartsOf(text).type;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reads a type behind a byte order mark', () => {
      // ARRANGE
      const text = '﻿---\ntype: research\n---\n# Report\n';
      const expected = { type: 'research', body: '# Report\n' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads no type from an empty block', () => {
      // ARRANGE
      const text = '---\n---\n# Report\n';
      const expected = { type: undefined, body: '# Report\n' };
      // ACT
      const actual = documentPartsOf(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
