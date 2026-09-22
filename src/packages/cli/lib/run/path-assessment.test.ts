// Colocated unit test for one path's assessment composed across Modules.
//
// Different Modules can answer differently about the same file. Their states
// stay in separate blocks rather than being collapsed behind a precedence rule
// that no Module can know and no config declares.

import { describe, expect, it } from 'vitest';
import type { ModuleAssess } from '../../../response-contract/index.ts';
import { pathAssessment } from './path-assessment.pure.ts';

const STALE: ModuleAssess = {
  agentAction: 'REVIEW',
  instruction: 'Re-check the source.',
  state: 'stale',
  source: 'module-wide',
  evidence: { field: 'stale_after', value: '2026-01-01T00:00:00Z' },
  rule: { ruleId: 'reference', intent: 'References remain current' },
};

const FRESH: ModuleAssess = {
  agentAction: 'PROCEED',
  state: 'fresh',
  evidence: { field: 'stale_after', value: '2027-01-01T00:00:00Z' },
  rule: { ruleId: 'reference', intent: 'References carry a review date' },
};

describe('pathAssessment', () => {
  describe('success cases', () => {
    it('keeps each Module assessment separate, in declared order', () => {
      // ARRANGE
      const expected = [
        { module: 'zulu', state: 'stale', agentAction: 'REVIEW' },
        { module: 'alpha', state: 'fresh', agentAction: 'PROCEED' },
      ];
      // ACT
      const answered = pathAssessment([
        { module: 'zulu', assessment: STALE },
        { module: 'alpha', assessment: FRESH },
      ]);
      const actual =
        answered.modules !== undefined
          ? answered.modules.map(({ module, state, agentAction }) => ({ module, state, agentAction }))
          : undefined;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('claims ungoverned only when every Module passed the path by', () => {
      // ARRANGE
      const expected = { agentAction: 'PROCEED', state: 'ungoverned' };
      // ACT
      const actual = pathAssessment([
        { module: 'zulu', assessment: undefined },
        { module: 'alpha', assessment: undefined },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('omits a passing Module when another Module assesses the path', () => {
      // ARRANGE
      const expected = [{ module: 'alpha', ...FRESH }];
      // ACT
      const answered = pathAssessment([
        { module: 'zulu', assessment: undefined },
        { module: 'alpha', assessment: FRESH },
      ]);
      const actual = answered.modules;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
