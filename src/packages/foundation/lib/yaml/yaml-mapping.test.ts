// Colocated unit test for the one mapping predicate the whole tool narrows
// invalid-value faults against. Ten byte-identical copies of this check used
// to be written out across three Packages; this is the seam that replaces
// them, so every case here is a case one of those ten call sites depended on.

import { describe, expect, it } from 'vitest';
import { isMapping } from './yaml-mapping.pure';

describe('isMapping', () => {
  describe('success cases', () => {
    it('accepts a plain object', () => {
      // ARRANGE
      const value: unknown = { frontmatter: { rules: [] } };
      // ACT
      const actual = isMapping(value);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('rejects a scalar', () => {
      // ARRANGE
      const value: unknown = 'nope';
      // ACT
      const actual = isMapping(value);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects undefined', () => {
      // ARRANGE
      const value: unknown = undefined;
      // ACT
      const actual = isMapping(value);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects an array', () => {
      // typeof [] === 'object', so this is the case a bare object check
      // would get wrong.
      // ARRANGE
      const value: unknown = ['one', 'two'];
      // ACT
      const actual = isMapping(value);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects null', () => {
      // typeof null === 'object' too.
      // ARRANGE
      const value: unknown = null;
      // ACT
      const actual = isMapping(value);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
