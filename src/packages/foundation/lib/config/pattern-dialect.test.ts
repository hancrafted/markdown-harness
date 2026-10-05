// Colocated unit test for the config's one regex dialect: ECMAScript under the
// `u` flag and no other, searched and never anchored.

import { describe, expect, it } from 'vitest';
import { compiles, dialectPattern } from './pattern-dialect.pure.ts';

describe('pattern dialect', () => {
  describe('success cases', () => {
    it('compiles an ordinary pattern', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = compiles('^Step [0-9]+$');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('searches rather than anchors, reading a property escape as a Unicode class', () => {
      // ARRANGE
      const expected = [true, true, false];
      // ACT
      const actual = [
        dialectPattern('Step').test('The Step 2'),
        dialectPattern('^\\p{Lu}').test('Ärger'),
        dialectPattern('^\\p{Lu}').test('ärger'),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
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

    it('throws building a pattern the engine refuses', () => {
      // ARRANGE
      const build = () => dialectPattern('^Source\\-');
      // ACT
      const act = build;
      // ASSERT
      expect(act).toThrow(SyntaxError);
    });
  });

  describe('edge cases', () => {
    it('counts an astral character as one under `.`', () => {
      // ARRANGE
      const expected = true;
      // ACT
      const actual = dialectPattern('^.$').test('😀');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
