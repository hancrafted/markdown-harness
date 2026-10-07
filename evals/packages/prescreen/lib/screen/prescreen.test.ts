// Colocated unit test for the pooled word-family pre-screen's pure parts: pooling,
// hit counting and the admission rule. Each refusal is shown red by a hand-built bad input.

import { describe, expect, it } from 'vitest';
import {
  MIN_SAMPLES,
  PROMPTS,
  admissionVerdicts,
  budgetRefusal,
  expectedSessions,
  mentions,
  parseScreenArgs,
  poolCandidates,
  tallyHits,
} from './prescreen.pure.ts';

const full = (hits: number, model = 'sonnet', prompt = 'task') => ({ model, prompt, samples: 20, hits });

describe('poolCandidates', () => {
  describe('success cases', () => {
    it('draws the requested number of distinct words, the same pool again from the same seed', () => {
      // ARRANGE
      const request = { seed: 's1', count: 6, corpus: '' };
      const expectedSize = 6;
      // ACT
      const actual = poolCandidates(request);
      // ASSERT
      expect(new Set(actual).size).toBe(expectedSize);
      expect(poolCandidates(request)).toEqual(actual);
    });
  });

  describe('failure cases', () => {
    it('keeps a word out of the pool when the corpus already holds it', () => {
      // ARRANGE
      const [first] = poolCandidates({ seed: 's1', count: 1, corpus: '' });
      const corpus = `text ${first ?? ''} text`;
      // ACT
      const actual = poolCandidates({ seed: 's1', count: 6, corpus });
      // ASSERT
      expect(actual).not.toContain(first);
    });
  });

  describe('edge cases', () => {
    it('draws an empty pool when none is asked for', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = poolCandidates({ seed: 's1', count: 0, corpus: '' });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('mentions', () => {
  describe('success cases', () => {
    it('finds the word however it is cased, quoted, backticked or pluralised', () => {
      // ARRANGE
      const word = 'brindlewick';
      const texts = ['use Brindlewick here', 'the "brindlewick" word', 'a `brindlewick`', 'two brindlewicks'];
      const expected = [true, true, true, true];
      // ACT
      const actual = texts.map((text) => mentions(text, word));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not find the word in an answer that never says it', () => {
      // ARRANGE
      const word = 'brindlewick';
      const text = 'a plain answer about feature flags';
      // ACT
      const actual = mentions(text, word);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('does not match inside a longer word', () => {
      // ARRANGE
      const word = 'brindlewick';
      const text = 'unbrindlewickable';
      // ACT
      const actual = mentions(text, word);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});

describe('tallyHits', () => {
  describe('success cases', () => {
    it('counts samples and hits per candidate per cell, one sample scanned against every candidate', () => {
      // ARRANGE
      const samples = [
        { model: 'sonnet', prompt: 'task', text: 'alpha appears' },
        { model: 'sonnet', prompt: 'task', text: 'nothing' },
        { model: 'haiku', prompt: 'task', text: 'alpha and beta' },
      ];
      const expected = [
        { model: 'sonnet', prompt: 'task', samples: 2, hits: 1 },
        { model: 'haiku', prompt: 'task', samples: 1, hits: 1 },
      ];
      const candidate = 'alpha';
      // ACT
      const actual = tallyHits(samples, [candidate, 'beta']);
      // ASSERT
      expect(actual.get(candidate)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('counts no hit for a candidate no sample says', () => {
      // ARRANGE
      const samples = [{ model: 'sonnet', prompt: 'task', text: 'alpha appears' }];
      const expected = [{ model: 'sonnet', prompt: 'task', samples: 1, hits: 0 }];
      const candidate = 'beta';
      // ACT
      const actual = tallyHits(samples, [candidate]);
      // ASSERT
      expect(actual.get(candidate)).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('holds an empty tally for a candidate when there are no samples', () => {
      // ARRANGE
      const expected = new Map([['alpha', []]]);
      // ACT
      const actual = tallyHits([], ['alpha']);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('admissionVerdicts', () => {
  describe('success cases', () => {
    it('admits a candidate with zero hits in every cell and the full sample count', () => {
      // ARRANGE
      const tallies = new Map([['alpha', [full(0), full(0, 'haiku')]]]);
      const expected = [{ candidate: 'alpha', admitted: true, reasons: [] }];
      // ACT
      const actual = admissionVerdicts(tallies, 20);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a candidate with one hit in one cell, naming the cell', () => {
      // ARRANGE
      const tallies = new Map([['alpha', [full(0), full(1, 'haiku')]]]);
      const cell = 'haiku';
      const joiner = ' ';
      // ACT
      const [actual] = admissionVerdicts(tallies, 20);
      // ASSERT
      expect(actual?.admitted).toBe(false);
      expect(actual?.reasons.join(joiner)).toContain(cell);
    });

    it('refuses a cell scanned fewer than the required samples, even with no hit', () => {
      // ARRANGE
      const tallies = new Map([['alpha', [{ model: 'sonnet', prompt: 'task', samples: 19, hits: 0 }]]]);
      const shortCount = '19';
      const joiner = ' ';
      // ACT
      const [actual] = admissionVerdicts(tallies, 20);
      // ASSERT
      expect(actual?.admitted).toBe(false);
      expect(actual?.reasons.join(joiner)).toContain(shortCount);
    });
  });

  describe('edge cases', () => {
    it('refuses a candidate scanned in no cell at all', () => {
      // ARRANGE
      const tallies = new Map([['alpha', []]]);
      // ACT
      const [actual] = admissionVerdicts(tallies, 20);
      // ASSERT
      expect(actual?.admitted).toBe(false);
    });
  });
});

describe('parseScreenArgs', () => {
  describe('success cases', () => {
    it('defaults to twenty samples and three models', () => {
      // ARRANGE
      const argv: string[] = [];
      const models = ['sonnet', 'haiku', 'opus'];
      // ACT
      const actual = parseScreenArgs(argv);
      // ASSERT
      expect(actual.ok && actual.args.samples).toBe(MIN_SAMPLES);
      expect(actual.ok && actual.args.models).toEqual(models);
    });
  });

  describe('failure cases', () => {
    it('refuses a sample count below twenty as misuse', () => {
      // ARRANGE
      const argv = ['--samples', '19'];
      // ACT
      const actual = parseScreenArgs(argv);
      // ASSERT
      expect(actual.ok).toBe(false);
    });

    it('refuses an unknown argument', () => {
      // ARRANGE
      const argv = ['--sample', '20'];
      // ACT
      const actual = parseScreenArgs(argv);
      // ASSERT
      expect(actual.ok).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('reads a flag with no value as misuse', () => {
      // ARRANGE
      const argv = ['--models'];
      // ACT
      const actual = parseScreenArgs(argv);
      // ASSERT
      expect(actual.ok).toBe(false);
    });
  });
});

describe('expectedSessions and budgetRefusal', () => {
  describe('success cases', () => {
    it('counts models times prompt kinds times samples', () => {
      // ARRANGE
      const models = 3;
      const samples = 20;
      const expected = models * PROMPTS.length * samples;
      // ACT
      const actual = expectedSessions(models, samples);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a screen above the limit unless told otherwise', () => {
      // ARRANGE
      const sessions = 120;
      const named = '120';
      // ACT
      const refused = budgetRefusal(sessions, false);
      const allowed = budgetRefusal(sessions, true);
      // ASSERT
      expect(refused).toContain(named);
      expect(allowed).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('allows a screen exactly at the limit', () => {
      // ARRANGE
      const sessions = 40;
      // ACT
      const actual = budgetRefusal(sessions, false);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});
