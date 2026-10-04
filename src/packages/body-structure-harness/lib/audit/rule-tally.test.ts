// Colocated unit test for the audit tally over all three axes: `won`,
// `shadowed`, `shadowedBy` and `excluded`, counted with each file's `type`
// (design-ADR 0015).

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule } from '../../section.ts';
import { tallyRules } from './rule-tally.pure.ts';

const INDEX: BodyStructureRule = { ruleId: 'index', intent: 'Index pages.', fileNames: ['index.md'] };

const REPORTS: BodyStructureRule = {
  ruleId: 'reports',
  intent: 'Reports.',
  folders: ['docs/'],
  types: ['report'],
  excludeFiles: [{ fileNames: ['scratch.md'] }],
};

const UNTYPED: BodyStructureRule = { ruleId: 'untyped', intent: 'Untyped.', folders: ['docs/'] };

const RULES = [INDEX, REPORTS, UNTYPED];

describe('tallyRules', () => {
  describe('success cases', () => {
    it('counts wins and shadows with each file read for its type, rows in config order', () => {
      // ARRANGE
      const files = [
        { path: 'docs/a.md', type: 'report' },
        { path: 'docs/b.md', type: undefined },
        { path: 'docs/index.md', type: 'report' },
      ];
      const expected = [
        {
          rule: { ruleId: 'index', selector: { fileNames: ['index.md'] }, intent: 'Index pages.' },
          won: 1,
          shadowed: 0,
          shadowedBy: [],
          excluded: 0,
        },
        {
          rule: { ruleId: 'reports', selector: { folders: ['docs/'], types: ['report'] }, intent: 'Reports.' },
          won: 1,
          shadowed: 1,
          shadowedBy: ['index'],
          excluded: 0,
        },
        {
          rule: { ruleId: 'untyped', selector: { folders: ['docs/'] }, intent: 'Untyped.' },
          won: 1,
          shadowed: 2,
          shadowedBy: ['index', 'reports'],
          excluded: 0,
        },
      ];
      // ACT
      const actual = tallyRules(files, RULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not count a file whose type the Rule does not take as shadowed or excluded there', () => {
      // ARRANGE
      const files = [{ path: 'docs/scratch.md', type: 'memo' }];
      const expected = [
        { ruleId: 'index', won: 0, shadowed: 0, excluded: 0 },
        { ruleId: 'reports', won: 0, shadowed: 0, excluded: 0 },
        { ruleId: 'untyped', won: 1, shadowed: 0, excluded: 0 },
      ];
      // ACT
      const actual = tallyRules(files, RULES).map((row) => ({
        ruleId: row.rule.ruleId,
        won: row.won,
        shadowed: row.shadowed,
        excluded: row.excluded,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts a file all three axes match and the Rule removes as excluded', () => {
      // ARRANGE
      const files = [{ path: 'docs/scratch.md', type: 'report' }];
      const expected = { excluded: 1, won: 0 };
      // ACT
      const row = tallyRules(files, RULES)[1];
      const actual = { excluded: row.excluded, won: row.won };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
