// Colocated unit test for the audit tally: one row per Rule, in config order,
// counted by whatever selection function the Module hands in.

import { describe, expect, it } from 'vitest';
import type { RuleAudit } from '../../../response-contract/index.ts';
import type { RuleHead, Selection } from '../../rule-selection.ts';
import { selectionFor, selectorRefFor, tallyRules } from '../../rule-selection.ts';

const DOCS: RuleHead = {
  ruleId: 'docs',
  intent: 'Docs.',
  folders: ['docs/'],
  excludeFiles: [{ fileNames: ['draft.md'] }],
};
const INDEX: RuleHead = { ruleId: 'index', intent: 'Index.', fileNames: ['index.md'] };
const ANY: RuleHead = { ruleId: 'any', intent: 'Any.', folders: ['./', 'docs/'] };

const tally = (paths: readonly string[], rules: readonly RuleHead[]): readonly RuleAudit[] =>
  tallyRules(paths, rules, { selection: selectionFor, refOf: selectorRefFor });

const counts = (rows: readonly RuleAudit[]) =>
  rows.map((row) => [row.rule.ruleId, row.won, row.shadowed, row.shadowedBy, row.excluded]);

describe('tallyRules', () => {
  describe('success cases', () => {
    it('counts wins, shadows and shadowedBy in config order', () => {
      // ARRANGE
      const paths = ['docs/a.md', 'docs/index.md'];
      const expected = [
        ['docs', 2, 0, [], 0],
        ['index', 0, 1, ['docs'], 0],
        ['any', 0, 2, ['docs'], 0],
      ];
      // ACT
      const actual = counts(tally(paths, [DOCS, INDEX, ANY]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the Rule id, intent and selector as written onto its row', () => {
      // ARRANGE
      const expected = { ruleId: 'index', selector: { fileNames: ['index.md'] }, intent: 'Index.' };
      // ACT
      const actual = tally([], [INDEX])[0].rule;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts with the verdict function the caller hands in', () => {
      // ARRANGE
      const alwaysUnselected = (): Selection => 'unselected';
      const expected = [['docs', 0, 0, [], 0]];
      // ACT
      const actual = counts(tallyRules(['docs/a.md'], [DOCS], { selection: alwaysUnselected, refOf: selectorRefFor }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('still reports a Rule that governed nothing, which is the point', () => {
      // ARRANGE
      const paths = ['docs/a.md'];
      const expected = [
        ['index', 0, 0, [], 0],
        ['docs', 1, 0, [], 0],
      ];
      // ACT
      const actual = counts(tally(paths, [INDEX, DOCS]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts an excluded file as excluded, neither won nor shadowed, and lets a later Rule win it', () => {
      // ARRANGE
      const paths = ['docs/draft.md'];
      const rules = [DOCS, ANY];
      const expected = [
        ['docs', 0, 0, [], 1],
        ['any', 1, 0, [], 0],
      ];
      // ACT
      const actual = counts(tally(paths, rules));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('names each winner once, ordered by config position rather than by the order files met it', () => {
      // ARRANGE
      const paths = ['index.md', 'docs/a.md', 'docs/b.md', 'docs/c.md'];
      const expected = ['docs', 'index'];
      // ACT
      const actual = tally(paths, [DOCS, INDEX, ANY])[2].shadowedBy;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a row per Rule over an empty corpus, and no rows when there are no Rules', () => {
      // ARRANGE
      const expected = [[['docs', 0, 0, [], 0]], []];
      // ACT
      const actual = [counts(tally([], [DOCS])), tally(['docs/a.md'], [])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
