import { describe, expect, it } from 'vitest';
import { CONFORMANCE_TIERS, tierForRunner, tierNamed } from '../tier-record.ts';

describe('Conformance tier records', () => {
  describe('success cases', () => {
    it('declares the metadata each existing tier requires', () => {
      // ARRANGE
      const declared = [
        {
          name: 'frontmatter',
          caseKind: 'markdown',
          configFile: 'valid-test-config.yaml',
          caseCount: 40,
          assessmentInstant: '2026-12-01T00:00:00Z',
        },
        {
          name: 'rejected-config',
          caseKind: 'rejected-config',
          configFile: 'markdown-harness.config.yaml',
          caseCount: 16,
        },
      ];
      // ACT
      const actual = CONFORMANCE_TIERS;
      // ASSERT
      expect(actual).toEqual(declared);
    });

    it('derives a runner tier from its own filename', () => {
      // ARRANGE
      const runner = new URL('./frontmatter-tier.test.ts', import.meta.url).href;
      const expected = 'frontmatter';
      // ACT
      const actual = tierForRunner(runner).name;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a name outside the declared tier set', () => {
      // ARRANGE
      const unknownTier = 'integrated';
      const refusal = 'no Conformance tier named integrated';
      // ACT
      const read = () => tierNamed(unknownTier);
      // ASSERT
      expect(read).toThrowError(refusal);
    });
  });

  describe('edge cases', () => {
    it('keeps the declared tier with an assessment instant addressable by name', () => {
      // ARRANGE
      const tierName = 'frontmatter';
      const instant = '2026-12-01T00:00:00Z';
      // ACT
      const actual = tierNamed(tierName).assessmentInstant;
      // ASSERT
      expect(actual).toBe(instant);
    });
  });
});
