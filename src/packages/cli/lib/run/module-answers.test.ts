// Colocated unit test for asking every Module one question and settling the answers.
//
// Modules are named `zulu` then `alpha`, never alphabetically: a gather that
// sorted, or wrote a key as a literal, cannot pass.

import { describe, expect, it } from 'vitest';
import { gatherAnswers, implementing, settledAnswers } from './module-answers.pure.ts';

const ZULU = { key: 'zulu' };
const ALPHA = { key: 'alpha' };
const unreadable = (path: string) => ({ kind: 'unreadable' as const, path });

describe('gatherAnswers', () => {
  describe('success cases', () => {
    it('names each answer by its own descriptor key, in declared Module order', () => {
      // ARRANGE
      const expected = [
        { module: 'zulu', answer: 'asked zulu' },
        { module: 'alpha', answer: 'asked alpha' },
      ];
      // ACT
      const actual = gatherAnswers([ZULU, ALPHA], (module) => `asked ${module.key}`);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lets a Module that refuses surface as its own answer rather than being dropped', () => {
      // ARRANGE
      const refusal = unreadable('/corpus/docs/locked.md');
      const expected = [{ module: 'zulu', answer: refusal }];
      // ACT
      const actual = gatherAnswers([ZULU], () => refusal);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('answers an empty list for an empty Module set', () => {
      // ARRANGE
      const none: unknown[] = [];
      // ACT
      const actual = gatherAnswers([], () => 'never asked');
      // ASSERT
      expect(actual).toEqual(none);
    });
  });
});

describe('implementing', () => {
  // Port descriptors stand in by key and the one optional verb asked; `mike` lacks it.
  interface Descriptor {
    key: string;
    assess?: () => string;
  }
  const zulu: Descriptor = { key: 'zulu', assess: () => 'zulu assessed' };
  const mike: Descriptor = { key: 'mike' };
  const alpha: Descriptor = { key: 'alpha', assess: () => 'alpha assessed' };

  describe('success cases', () => {
    it('keeps every Module carrying the verb, in declared Module order', () => {
      // ARRANGE
      const expected = ['zulu', 'alpha'];
      // ACT
      const actual = implementing([zulu, alpha], 'assess').map((module) => module.key);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('skips a Module that does not implement the verb, so it is never asked', () => {
      // ARRANGE
      const expected = [
        { module: 'zulu', answer: 'zulu assessed' },
        { module: 'alpha', answer: 'alpha assessed' },
      ];
      // ACT
      const actual = gatherAnswers(implementing([zulu, mike, alpha], 'assess'), (module) => module.assess());
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('answers an empty list when no Module implements the verb', () => {
      // ARRANGE
      const none: unknown[] = [];
      // ACT
      const actual = implementing([mike], 'assess');
      // ASSERT
      expect(actual).toEqual(none);
    });
  });
});

describe('settledAnswers', () => {
  describe('success cases', () => {
    it('hands every answer back, in order, when none refused', () => {
      // ARRANGE
      const answers = [
        { module: 'zulu', answer: { rules: [] } },
        { module: 'alpha', answer: { rules: [] } },
      ];
      // ACT
      const actual = settledAnswers<{ rules: never[] }>(answers);
      // ASSERT
      expect(actual).toEqual(answers);
    });
  });

  describe('failure cases', () => {
    it('answers the refusal alone when any Module could not read a file', () => {
      // ARRANGE
      const expected = unreadable('/corpus/docs/locked.md');
      // ACT
      const actual = settledAnswers<{ rules: never[] }>([
        { module: 'zulu', answer: { rules: [] } },
        { module: 'alpha', answer: expected },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('answers the first refusal in declared Module order when two refuse', () => {
      // ARRANGE
      const expected = unreadable('/corpus/docs/first.md');
      // ACT
      const actual = settledAnswers<string>([
        { module: 'zulu', answer: expected },
        { module: 'alpha', answer: unreadable('/corpus/docs/second.md') },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not mistake a settled answer carrying another kind for a refusal', () => {
      // ARRANGE
      const answers = [{ module: 'zulu', answer: { kind: 'checked', result: 1 } }];
      // ACT
      const actual = settledAnswers<{ kind: string; result: number }>(answers);
      // ASSERT
      expect(actual).toEqual(answers);
    });
  });
});
