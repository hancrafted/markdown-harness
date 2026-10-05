// Colocated unit test for what this Module asks of a heading pattern: a
// non-empty string that compiles in the config's dialect, and what an anchored
// literal is.

import { describe, expect, it } from 'vitest';
import { isAnchoredLiteral, isPattern } from './pattern-dialect.pure.ts';

describe('pattern dialect', () => {
  describe('success cases', () => {
    it('recognises an anchored literal, escapes included', () => {
      // ARRANGE
      const literals = ['^Findings$', '^C\\+\\+$', '^$'];
      const expected = [true, true, true];
      // ACT
      const actual = literals.map(isAnchoredLiteral);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts an ordinary pattern', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = isPattern('^Step [0-9]+$');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an empty pattern, a non-string, and one the u flag forbids', () => {
      // ARRANGE
      const expected = [false, false, false];
      // ACT
      const actual = ['', 7, '^Source\\-'].map(isPattern);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not call a prefix, a substring, a class, a closed alternation or an escaped terminator a literal', () => {
      // ARRANGE
      const others = ['^Source: ', 'Findings', '^Step [0-9]+$', '^(Pros|Cons)$', '^a\\$', '^a.b$', '^\\d$'];
      const expected = others.map(() => false);
      // ACT
      const actual = others.map(isAnchoredLiteral);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads the empty anchored pattern as a literal and the unanchored empty pattern as none', () => {
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = ['^$', ''].map(isAnchoredLiteral);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
