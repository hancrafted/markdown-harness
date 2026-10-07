// Colocated unit test for the steering-marker generator: one code per seed, case
// and carrier, redrawn when it occurs anywhere in the supplied corpus.

import { describe, expect, it } from 'vitest';
import { MARKER_FAMILY_SHAPE, drawSteeringMarker, markerPattern } from './steering-marker.pure.ts';

const SEED = 'seed-one';
const CASE_ID = 'research-note';
const ADDRESS = 'body-structure.rules[ruleId=research].headings[1].intent';

function draw(corpus: string, seed = SEED, address = ADDRESS) {
  return drawSteeringMarker({ seed, caseId: CASE_ID, address, corpus });
}

describe('drawSteeringMarker', () => {
  describe('success cases', () => {
    it('draws two letters, two digits, a separator and four digits', () => {
      // ARRANGE
      const shape = new RegExp(`^${MARKER_FAMILY_SHAPE.source}$`);
      // ACT
      const actual = draw('');
      // ASSERT
      expect(actual).toMatch(shape);
    });

    it('draws the same code again from the same seed, case and carrier', () => {
      // ARRANGE
      const expected = draw('');
      // ACT
      const actual = draw('');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('draws a different code for a different seed or a different carrier', () => {
      // ARRANGE
      const base = draw('');
      // ACT
      const others = [draw('', 'seed-two'), draw('', SEED, 'frontmatter.rules[ruleId=research].intent')];
      // ASSERT
      expect(others).not.toContain(base);
    });

    it('redraws a code that occurs in the corpus, so a collision never survives', () => {
      // ARRANGE
      const first = draw('');
      // ACT
      const actual = draw(`some tracked text mentioning ${first} here`);
      // ASSERT
      expect(actual).not.toEqual(first);
      expect(actual).toMatch(MARKER_FAMILY_SHAPE);
    });
  });

  describe('failure cases', () => {
    it('gives up loudly when every candidate collides', () => {
      // ARRANGE
      const everything = { includes: () => true } as unknown as string;
      // ACT
      const act = () => draw(everything);
      // ASSERT
      expect(act).toThrow(/collid/);
    });
  });

  describe('edge cases', () => {
    it('builds a word-bounded exact pattern that matches the code and nothing longer', () => {
      // ARRANGE
      const code = draw('');
      const pattern = markerPattern(code);
      // ACT
      const actual = [pattern.test(`line\n${code}\n`), pattern.test(`${code}9`), pattern.test('')];
      // ASSERT
      expect(actual).toEqual([true, false, false]);
    });
  });
});
