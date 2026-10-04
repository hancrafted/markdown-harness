// Colocated unit test for the `--query` candidate resolver: every Rule that
// could win a path not yet written, in config order, ending at the first one
// that carries no `types` (design-ADR 0019).

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule } from '../../section.ts';
import { candidateClaims } from './candidates.pure.ts';

const REPORTS: BodyStructureRule = {
  ruleId: 'reports',
  intent: 'Reports read the same way.',
  folders: ['docs/research/'],
  types: ['research'],
  excludeFiles: [{ fileNames: ['scratch.md'] }],
  maxLevel: 2,
  headings: [{ purpose: 'heading', level: 2, pattern: '^Findings$', intent: 'What was measured.' }],
};

const UNTYPED: BodyStructureRule = {
  ruleId: 'untyped',
  intent: 'Anything else has one title.',
  folders: ['docs/research/'],
  maxLevel: 1,
};

const GUIDES: BodyStructureRule = {
  ruleId: 'guides',
  intent: 'A guide has sections.',
  types: ['guide'],
  headings: [{ purpose: 'enumeration', level: 2, minCount: 2 }],
};

const RULES = [REPORTS, UNTYPED, GUIDES];

describe('candidateClaims', () => {
  describe('success cases', () => {
    it('lists each reaching Rule in config order with its requirements verbatim, ending at the first without types', () => {
      // ARRANGE
      const expected = [
        {
          rule: { ruleId: 'reports', intent: 'Reports read the same way.' },
          requirements: {
            types: ['research'],
            maxLevel: 2,
            headings: [{ purpose: 'heading', level: 2, pattern: '^Findings$', intent: 'What was measured.' }],
          },
        },
        {
          rule: { ruleId: 'untyped', intent: 'Anything else has one title.' },
          requirements: { maxLevel: 1 },
        },
      ];
      // ACT
      const actual = candidateClaims('docs/research/new.md', RULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers a types-only Rule for a path nothing else reaches', () => {
      // ARRANGE
      const expected = ['guides'];
      // ACT
      const actual = candidateClaims('docs/elsewhere/x.md', RULES).map((claim) => claim.rule.ruleId);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers no candidate for a path no Rule reaches', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = candidateClaims('docs/elsewhere/x.md', [REPORTS, UNTYPED]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves out a Rule whose exclusion removes the path, so it neither appears nor ends the list', () => {
      // ARRANGE
      const excludedUntyped: BodyStructureRule = { ...UNTYPED, excludeFiles: [{ fileNames: ['scratch.md'] }] };
      const expected = ['guides'];
      // ACT
      const actual = candidateClaims('docs/research/scratch.md', [REPORTS, excludedUntyped, GUIDES]).map(
        (claim) => claim.rule.ruleId,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('ends at once on a first candidate that carries no types', () => {
      // ARRANGE
      const expected = ['untyped'];
      // ACT
      const actual = candidateClaims('docs/research/new.md', [UNTYPED, REPORTS, GUIDES]).map(
        (claim) => claim.rule.ruleId,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
