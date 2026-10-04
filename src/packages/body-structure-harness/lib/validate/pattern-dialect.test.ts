// Colocated unit test for the pattern dialect: what compiles under the `u` flag,
// and what an anchored literal is (design-ADR 0018).

import { describe, expect, it } from 'vitest';
import { compiles, isAnchoredLiteral } from './pattern-dialect.pure.ts';

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

    it('compiles an ordinary pattern', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = compiles('^Step [0-9]+$');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses to compile what the u flag forbids: an unclosed group and an unnecessary escape', () => {
      // ARRANGE
      const expected = [false, false];
      // ACT
      const actual = ['(unclosed', '^Source\\-'].map(compiles);
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
