// Colocated unit test for the stem and the split.
//
// These two functions carry the three decisions the whole Module rests on:
// what a constraint measures, where a name splits, and what counts as a part.
// The Conformance corpus proves them end to end on real names; this file proves
// them on the shapes a corpus cannot hold, including the empty stem.

import { describe, expect, it } from 'vitest';
import { partsOf, stemOf } from './name-stem.pure';

describe('name stem', () => {
  describe('success cases', () => {
    it('takes the basename and drops the markdown extension', () => {
      // ARRANGE
      const expected = 'aikb__llm-wiki';
      // ACT
      const actual = stemOf('docs/llm-wiki/content-blocks/aikb__llm-wiki.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('splits a stem on the doubled delimiter', () => {
      // ARRANGE
      const expected = ['aikb', 'llm-wiki'];
      // ACT
      const actual = partsOf('aikb__llm-wiki');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats a stem with no delimiter as a single part', () => {
      // The COMMON case, not an edge: 40 of 73 stems here carry no delimiter at
      // all. It is why optional trailing segments were rejected — they would let
      // every one of these pass a category check by having no category.
      // ARRANGE
      const expected = ['corpus'];
      // ACT
      const actual = partsOf('corpus');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves a single underscore inside a part', () => {
      // A single `_` is an ordinary character. Only a DOUBLED one splits, which
      // is the Operator's stated reason for choosing a doubled character: it
      // stays available as the split point however many segments arrive later.
      // ARRANGE
      const expected = ['acme_corp', 'q3-export'];
      // ACT
      const actual = partsOf('acme_corp__q3-export');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('splits on EVERY delimiter, never just the first', () => {
      // A greedy last segment was rejected: it blames the slug's format for a
      // delimiter placed elsewhere, and lets a segment quietly hold a `__`.
      // ARRANGE
      const expected = ['a', 'b', 'c'];
      // ACT
      const actual = partsOf('a__b__c');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not count a trailing empty part', () => {
      // This is what makes `aikb__` report "add the missing part" rather than
      // "fix the format of a blank".
      // ARRANGE
      const expected = ['aikb'];
      // ACT
      const actual = partsOf('aikb__');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not count a leading empty part', () => {
      // ARRANGE
      const expected = ['llm-wiki'];
      // ACT
      const actual = partsOf('__llm-wiki');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('drops an empty part between two delimiters, which is a recorded consequence', () => {
      // `a____b` is two delimiters around nothing. The empty middle is dropped,
      // so the count is two and both survivors are judged normally.
      //
      // A third code for an empty part was REFUSED: it would make this name carry
      // two findings and force a ranking between them. The Conformance case
      // `blocks/aikb____llm-wiki.md` states the same consequence on a real name,
      // so a reader who disagrees has one place to argue and one place to change.
      // ARRANGE
      const expected = ['a', 'b'];
      // ACT
      const actual = partsOf('a____b');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a stem with no directory at all', () => {
      // A root-level file. `dirname` would be `.` here, which is exactly the
      // case that made the folder subject awkward — the stem has no such problem.
      // ARRANGE
      const expected = 'README';
      // ACT
      const actual = stemOf('README.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('leaves a name that does not end in the markdown extension alone', () => {
      // Unreachable through the walker, which collects `.md` only, so this pins
      // the function rather than the product: it must not truncate on a guess.
      // ARRANGE
      const expected = 'notes.txt';
      // ACT
      const actual = stemOf('docs/notes.txt');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('drops only the FINAL extension, leaving an inner dot in the stem', () => {
      // ARRANGE
      const expected = 'SPEC-v0.2';
      // ACT
      const actual = stemOf('docs/okf/SPEC-v0.2.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reports an empty stem as no parts at all', () => {
      // A stem of `__` is nothing but delimiter. Every part is empty, so none
      // counts, and the count check one tier up reports too few rather than
      // judging a blank against a format.
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = partsOf('__');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
