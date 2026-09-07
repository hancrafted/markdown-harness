// Colocated unit test for the corpus result and its arithmetic.
//
// The three counts are stored rather than left to the consumer, so the tests
// that matter here are the ones that would catch them disagreeing. The consumer
// is an agent, and asking a language model to sum an array to find out whether
// anything is wrong is asking the one thing it is least reliable at.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { checkResultFor } from './check-result.pure';

const PLAIN: FrontmatterRule = {
  ruleId: 'plain',
  intent: 'Everything under plain/ still has to say what it is',
  path: ['docs/plain/**/*.md'],
  fields: { type: { presence: 'required' } },
};

const CONFORMING = '---\ntype: plain\n---\n';
const UNTYPED = '---\ntitle: No type here\n---\n';

describe('corpus check result', () => {
  describe('success cases', () => {
    it('reports an all-conforming corpus as governed but clean', () => {
      // ARRANGE
      const sources = [{ path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING }];
      const expected = { summary: { governedFiles: 1, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = checkResultFor(sources);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the winning rule id and its intent on the file', () => {
      // Under first-match every violation in a file comes from the same rule, so
      // these sit on the file rather than on each violation.
      // ARRANGE
      const sources = [{ path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED }];
      const expected = { ruleId: 'plain', ruleIntent: 'Everything under plain/ still has to say what it is' };
      // ACT
      const [file] = checkResultFor(sources).files;
      // ASSERT
      expect({ ruleId: file.ruleId, ruleIntent: file.ruleIntent }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lists only the files carrying a violation, in the order given', () => {
      // Conforming files are absent, and the order is the walker's.
      // ARRANGE
      const sources = [
        { path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/empty.md', rule: PLAIN, text: '---\ntype:\n---\n' },
      ];
      const expected = ['docs/plain/untyped.md', 'docs/plain/empty.md'];
      // ACT
      const actual = checkResultFor(sources).files.map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports counts that cannot disagree with the files it listed', () => {
      // ARRANGE
      const sources = [
        { path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/empty.md', rule: PLAIN, text: '---\ntype:\n---\n' },
      ];
      const expected = { governedFiles: 3, invalidFiles: 2, totalViolations: 2 };
      // ACT
      const actual = checkResultFor(sources).summary;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts invalidFiles off the files it listed, not off the corpus it read', () => {
      // The contract says `invalidFiles === files.length`, always. Reading both
      // sides off one return would assert the implementation against itself and
      // could not go red — and a corpus whose files are ALL invalid could not
      // tell `files.length` from the number of files read either. So the
      // fixture is mixed, and the number is written out by hand.
      // ARRANGE
      const sources = [
        { path: 'docs/plain/a.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/b.md', rule: PLAIN, text: UNTYPED },
      ];
      const invalid = 2;
      const read = 3;
      // ACT
      const result = checkResultFor(sources);
      // ASSERT
      expect(result.summary.invalidFiles).toBe(invalid);
      expect(result.files).toHaveLength(invalid);
      expect(result.summary.governedFiles).toBe(read);
    });

    it('sums violations across files rather than counting the files', () => {
      // A file with three findings must not count as one.
      // ARRANGE
      const reference: FrontmatterRule = {
        ruleId: 'reference',
        intent: 'Reference pages say how far they can be trusted',
        path: ['docs/reference/**/*.md'],
        unknownKeys: 'forbidden',
        fields: {
          status: { allowed: [{ value: 'stable' }] },
          slug: { pattern: '^[a-z]+$', intent: 'lowercase words' },
        },
      };
      const text = '---\nstatus: retired\nslug: Legacy_Reference\nreviewedBy: nobody\n---\n';
      const sources = [{ path: 'docs/reference/legacy.md', rule: reference, text }];
      const expected = { governedFiles: 1, invalidFiles: 1, totalViolations: 3 };
      // ACT
      const actual = checkResultFor(sources).summary;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty corpus as nothing governed and nothing wrong', () => {
      // ARRANGE
      const expected = { summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = checkResultFor([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
