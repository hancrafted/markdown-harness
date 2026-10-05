import { describe, expect, it } from 'vitest';
import {
  caseLinesOf,
  frozenComparison,
  lineDiff,
  renderReport,
  reportAgrees,
  specSentenceOf,
} from './spec-folder.pure.ts';

describe('specSentenceOf', () => {
  describe('success cases', () => {
    it('reads the sentence after `# Spec: ` on line 1, a CRLF ending included', () => {
      // ARRANGE
      const sentence = 'A Rule does a thing.';
      const config = `# Spec: ${sentence}\r\nbody-structure:\n`;
      // ACT
      const actual = specSentenceOf(config);
      // ASSERT
      expect(actual).toBe(sentence);
    });
  });

  describe('failure cases', () => {
    it.each(['# A comment\n# Spec: Late.\n', '#Spec: Tight.\n', '# Spec: \n'])(
      'reads no sentence from %j',
      (config) => {
        // ARRANGE
        const none = undefined;
        // ACT
        const actual = specSentenceOf(config);
        // ASSERT
        expect(actual).toBe(none);
      },
    );
  });

  describe('edge cases', () => {
    it('reads no sentence from an empty config', () => {
      // ARRANGE
      const config = '';
      // ACT
      const actual = specSentenceOf(config);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});

describe('caseLinesOf', () => {
  describe('success cases', () => {
    it('agrees on every case when exactly the FAILS cases are listed', () => {
      // ARRANGE
      const stated = [
        { path: 'a.md', verdict: 'FAILS' },
        { path: 'b.md', verdict: 'PASSES' },
        { path: 'c.md', verdict: 'UNGOVERNED' },
      ];
      const listed = ['a.md'];
      // ACT
      const actual = caseLinesOf(stated, listed).map((line) => line.agrees);
      // ASSERT
      expect(actual).toEqual([true, true, true]);
    });
  });

  describe('failure cases', () => {
    it('disagrees on a FAILS case not listed and a PASSES case listed', () => {
      // ARRANGE
      const stated = [
        { path: 'a.md', verdict: 'FAILS' },
        { path: 'b.md', verdict: 'PASSES' },
      ];
      const expected = [
        { path: 'a.md', agrees: false, listed: false },
        { path: 'b.md', agrees: false, listed: true },
      ];
      // ACT
      const actual = caseLinesOf(stated, ['b.md']).map(({ path, agrees, listed }) => ({ path, agrees, listed }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('disagrees on a case whose marker count is wrong, listed or not', () => {
      // ARRANGE
      const stated = [{ path: 'a.md', verdict: 'MARKERS:0' }];
      // ACT
      const actual = caseLinesOf(stated, ['a.md'])[0].agrees;
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});

describe('lineDiff and frozenComparison', () => {
  describe('success cases', () => {
    it('agrees with no diff on identical text', () => {
      // ARRANGE
      const expected = { label: 'expected-check.json', agrees: true, diff: [] };
      // ACT
      const actual = frozenComparison('expected-check.json', 'a\nb\n', 'a\nb\n');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('lists a changed line as its removal, then its replacement, unchanged lines left out', () => {
      // ARRANGE
      const expected = ['-b', '+B'];
      // ACT
      const actual = lineDiff('a\nb\nc', 'a\nB\nc');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('diffs a trailing newline the actual text lacks', () => {
      // ARRANGE
      const expected = ['-'];
      // ACT
      const actual = lineDiff('a\n', 'a');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('reportAgrees and renderReport', () => {
  const agreeing = {
    folder: 'tier/docs/key__behaviour',
    spec: 'A sentence.',
    cases: [{ path: 'a.md', stated: 'PASSES', listed: false, agrees: true }],
    governed: { stated: 1, reported: 1 },
    frozen: [{ label: 'expected-check.json', agrees: true, diff: [] }],
  };

  describe('success cases', () => {
    it('agrees and renders the spec, the case, the count and the frozen file', () => {
      // ARRANGE
      const expected = [
        'spec  tier/docs/key__behaviour',
        '  # Spec: A sentence.',
        '  a.md  PASSES      ok',
        '  governed: 1 stated, 1 reported  ok',
        '  expected-check.json  identical',
        'agrees',
        '',
      ].join('\n');
      // ACT
      const actual = renderReport({ ...agreeing, agrees: reportAgrees(agreeing) });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it.each([
      ['a missing spec line', { spec: undefined }],
      ['a governed count that differs', { governed: { stated: 1, reported: 2 } }],
      ['a frozen file that differs', { frozen: [{ label: 'expected-check.json', agrees: false, diff: ['-x', '+y'] }] }],
    ])('disagrees on %s', (_, change) => {
      // ARRANGE
      const report = { ...agreeing, ...change };
      // ACT
      const actual = reportAgrees(report);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('renders a diff under the frozen file that differs', () => {
      // ARRANGE
      const report = {
        ...agreeing,
        frozen: [{ label: 'expected-check.json', agrees: false, diff: ['-x', '+y'] }],
        agrees: false,
      };
      const expected = '  expected-check.json  DIFFERS\n    -x\n    +y\nDISAGREES\n';
      // ACT
      const actual = renderReport(report);
      // ASSERT
      expect(actual.endsWith(expected)).toBe(true);
    });
  });
});
