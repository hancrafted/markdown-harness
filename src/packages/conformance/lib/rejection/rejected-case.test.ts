import { describe, expect, it } from 'vitest';
import { faultSentenceOf, payloadComparison, renderRejectedCase } from './rejected-case.pure.ts';

const ENVELOPE = JSON.stringify(
  { command: 'check', result: { error: 'CONFIG_REJECTED', faults: [{ code: 'A', location: 'x' }] } },
  null,
  2,
);

describe('faultSentenceOf', () => {
  describe('success cases', () => {
    it('reads the opening comment line without its hash', () => {
      // ARRANGE
      const expected = 'Two rules sharing a `ruleId`.';
      // ACT
      const actual = faultSentenceOf('# Two rules sharing a `ruleId`.\n#\nfrontmatter:\n');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it.each([undefined, 'frontmatter:\n', '#\n# later\n'])('reads no sentence from %j', (configText) => {
      // ARRANGE
      const none = undefined;
      // ACT
      const actual = faultSentenceOf(configText);
      // ASSERT
      expect(actual).toBe(none);
    });
  });

  describe('edge cases', () => {
    it('reads the sentence off a CRLF first line without its carriage return', () => {
      // ARRANGE
      const expected = 'A fault.';
      // ACT
      const actual = faultSentenceOf('# A fault.\r\nfrontmatter:\r\n');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('payloadComparison', () => {
  describe('success cases', () => {
    it('agrees with a frozen payload laid out differently, because the value is the contract', () => {
      // ARRANGE
      const expected = { label: 'expected-rejection.json', agrees: true, diff: [] };
      // ACT
      const actual = payloadComparison(
        'expected-rejection.json',
        '{ "error": "CONFIG_REJECTED", "faults": [{ "code": "A", "location": "x" }] }\n',
        ENVELOPE,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('disagrees when the frozen fault order differs, naming the lines that moved', () => {
      // ARRANGE
      const frozen = JSON.stringify({
        error: 'CONFIG_REJECTED',
        faults: [
          { code: 'B', location: 'y' },
          { code: 'A', location: 'x' },
        ],
      });
      // ACT
      const actual = payloadComparison('expected-rejection.json', frozen, ENVELOPE);
      // ASSERT
      expect(actual).toMatchObject({
        agrees: false,
        diff: expect.arrayContaining([expect.stringMatching(/^- .*"B"/u)]),
      });
    });
  });

  describe('edge cases', () => {
    it('disagrees with output that is not JSON rather than throwing', () => {
      // ARRANGE
      const expected = false;
      // ACT
      const actual = payloadComparison('expected-rejection.json', '{}', 'mh: crashed').agrees;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('renderRejectedCase', () => {
  describe('success cases', () => {
    it('prints the case, its fault sentence, each frozen file and the verdict', () => {
      // ARRANGE
      const expected = 'case  rejected-config/x\n  # A fault.\n  expected-rejection.json  identical\nagrees\n';
      // ACT
      const actual = renderRejectedCase({
        case: 'rejected-config/x',
        fault: 'A fault.',
        frozen: [{ label: 'expected-rejection.json', agrees: true, diff: [] }],
        agrees: true,
      });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('prints the diff under a differing file and says the case disagrees', () => {
      // ARRANGE
      const expected = 'case  x\n  # F\n  expected-rejection.json  DIFFERS\n    - a\n    + b\nDISAGREES\n';
      // ACT
      const actual = renderRejectedCase({
        case: 'x',
        fault: 'F',
        frozen: [{ label: 'expected-rejection.json', agrees: false, diff: ['- a', '+ b'] }],
        agrees: false,
      });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('says so when the case holds no readable config to describe it', () => {
      // ARRANGE
      const expected = expect.stringContaining('the case holds no readable config');
      // ACT
      const actual = renderRejectedCase({ case: 'x', fault: undefined, frozen: [], agrees: true });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
