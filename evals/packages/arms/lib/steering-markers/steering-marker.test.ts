// Colocated unit test for the steering-marker generator: one code per seed, case
// and carrier, redrawn when it occurs anywhere in the supplied corpus.

import { describe, expect, it } from 'vitest';
import {
  STEERING_MARKER_FAMILY_SHAPE,
  drawCoinedWord,
  drawSteeringMarker,
  transcriptionGuardHits,
} from './steering-marker.pure.ts';

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
      const shape = new RegExp(`^${STEERING_MARKER_FAMILY_SHAPE.source}$`);
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
      expect(actual).toMatch(STEERING_MARKER_FAMILY_SHAPE);
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
    it('draws the same code for the same inputs even when the corpus is large', () => {
      // ARRANGE
      const corpus = 'filler text '.repeat(1000);
      const expected = draw(corpus);
      // ACT
      const actual = draw(corpus);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('transcriptionGuardHits', () => {
  describe('success cases', () => {
    it('names a committed file holding a code of the family, and only that one', () => {
      // ARRANGE
      const files = [
        { path: 'task.md', text: 'Write a note. AB12-3456 is the code.' },
        { path: 'clean.md', text: 'plain' },
      ];
      const expected = ['task.md'];
      // ACT
      const actual = transcriptionGuardHits(files);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads nothing as clean only when it was handed files', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = transcriptionGuardHits([{ path: 'a', text: 'no code here' }]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not match a longer token that merely contains the shape', () => {
      // ARRANGE
      const files = [{ path: 'a', text: 'XAB12-34567' }];
      // ACT
      const actual = transcriptionGuardHits(files);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});

describe('drawCoinedWord', () => {
  const wordDraw = (corpus: string, address = 'candidate-0') =>
    drawCoinedWord({ seed: SEED, caseId: 'prescreen', address, corpus });

  describe('success cases', () => {
    it('draws a lowercase pseudo-word of eight to ten letters, the same one again from the same draw', () => {
      // ARRANGE
      const expected = wordDraw('');
      // ACT
      const actual = wordDraw('');
      // ASSERT
      expect(actual).toEqual(expected);
      expect(actual).toMatch(/^[a-z]{8,10}$/);
    });

    it('draws a different word for a different candidate address', () => {
      // ARRANGE
      const base = wordDraw('');
      // ACT
      const others = [1, 2, 3, 4].map((index) => wordDraw('', `candidate-${index}`));
      // ASSERT
      expect(others.some((other) => other !== base)).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('redraws a word that occurs in the corpus, whatever its case', () => {
      // ARRANGE
      const first = wordDraw('');
      const corpus = `prose that mentions ${first.toUpperCase()} once`;
      // ACT
      const actual = wordDraw(corpus);
      // ASSERT
      expect(actual).not.toEqual(first);
      expect(corpus.toLowerCase()).not.toContain(actual);
    });
  });

  describe('edge cases', () => {
    it('draws a word that no corpus text contains inside it, so a longer word cannot hide a hit', () => {
      // ARRANGE
      const first = wordDraw('');
      const corpus = `x${first}x`;
      // ACT
      const actual = wordDraw(corpus);
      // ASSERT
      expect(actual).not.toEqual(first);
    });
  });
});
