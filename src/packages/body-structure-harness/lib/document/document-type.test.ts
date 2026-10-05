// Colocated unit test for reading the frontmatter `type` this Module selects
// on, out of a block the Core parsed. The body and the fence rule are the
// Core's and are proven in foundation.

import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../../foundation/read-corpus.ts';
import { documentTypeOf } from './document-type.pure.ts';

/** The `type` of a file's text, parsed the way the Core parses it. */
const typeOfText = (text: string): string | undefined => documentTypeOf(parseDocument(text).frontmatter);

describe('documentTypeOf', () => {
  describe('success cases', () => {
    it('reads a string type', () => {
      // ARRANGE
      const text = '---\ntype: research\n---\n# Report\n';
      const expected = 'research';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reads a type behind a byte order mark', () => {
      // ARRANGE
      const text = '﻿---\ntype: research\n---\n# Report\n';
      const expected = 'research';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('reads no type from a file with no block', () => {
      // ARRANGE
      const text = '# Report\n';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('reads no type from a block that does not parse', () => {
      // ARRANGE
      const text = '---\ntype: [research\n---\n# Research\n';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('reads no type from a block that never closes', () => {
      // ARRANGE
      const text = '---\ntype: research\n\n# Looks like a title\n';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('reads no type from a null, a number, or a list', () => {
      // ARRANGE
      const texts = ['---\ntype:\n---\n', '---\ntype: 7\n---\n', '---\ntype: [research]\n---\n'];
      const expected = [undefined, undefined, undefined];
      // ACT
      const actual = texts.map(typeOfText);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps a quoted type exactly as written, leading space and case included', () => {
      // Exact, case-sensitive equality and no trimming.
      // ARRANGE
      const text = "---\ntype: ' Research'\n---\n";
      const expected = ' Research';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reads no type from an empty block', () => {
      // ARRANGE
      const text = '---\n---\n# Report\n';
      // ACT
      const actual = typeOfText(text);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});
