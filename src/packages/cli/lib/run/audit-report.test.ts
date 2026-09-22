// Colocated unit test for the audit report composed across Modules.
//
// Both Modules declare `reference` on purpose. A flat rule list cannot tell
// those rows apart, while the Module blocks below keep each row attributable
// without inventing a globally unique rule identity.

import { describe, expect, it } from 'vitest';
import type { ModuleAudit } from '../../../response-contract/index.ts';
import { auditReport } from './audit-report.pure.ts';

const ZULU_AUDIT: ModuleAudit = {
  rules: [
    {
      rule: { ruleId: 'reference', selector: { folders: ['zulu/'] }, intent: 'Zulu references stay current' },
      won: 2,
      shadowed: 0,
      shadowedBy: [],
      excluded: 0,
    },
  ],
};

const ALPHA_AUDIT: ModuleAudit = {
  rules: [
    {
      rule: { ruleId: 'reference', selector: { folders: ['alpha/'] }, intent: 'Alpha references stay current' },
      won: 1,
      shadowed: 0,
      shadowedBy: [],
      excluded: 0,
    },
  ],
};

describe('auditReport', () => {
  describe('success cases', () => {
    it('keeps duplicate rule ids apart under their Modules, in declared order', () => {
      // ARRANGE
      const expected = [
        { module: 'zulu', ruleId: 'reference', won: 2 },
        { module: 'alpha', ruleId: 'reference', won: 1 },
      ];
      // ACT
      const actual = auditReport([
        { module: 'zulu', audit: ZULU_AUDIT },
        { module: 'alpha', audit: ALPHA_AUDIT },
      ]).modules.map((block) => ({
        module: block.module,
        ruleId: block.rules[0].rule.ruleId,
        won: block.rules[0].won,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names a Module that declares no rules instead of dropping its empty audit', () => {
      // ARRANGE
      const expected = [{ module: 'ruleless', rules: [] }];
      // ACT
      const actual = auditReport([{ module: 'ruleless', audit: { rules: [] } }]).modules;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('returns no Module blocks when no Module was declared', () => {
      // ARRANGE
      const noAnswers: readonly [] = [];
      // ACT
      const actual = auditReport(noAnswers);
      // ASSERT
      expect(actual.modules).toEqual([]);
    });
  });
});
