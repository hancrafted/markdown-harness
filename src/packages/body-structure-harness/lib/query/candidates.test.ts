// Colocated unit test for the `query` candidate resolver: every Rule that
// could win a path not yet written, in config order, ending at the first one
// that carries no `types`.

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

    it('copies undefinedHeadings verbatim, so a written allow is echoed and forbid is told', () => {
      // ARRANGE
      const closed: BodyStructureRule = {
        ruleId: 'closed',
        intent: 'Closed.',
        folders: ['docs/closed/'],
        undefinedHeadings: 'forbid',
        headings: [{ purpose: 'heading', level: 1 }],
      };
      const open: BodyStructureRule = {
        ...closed,
        ruleId: 'open',
        folders: ['docs/open/'],
        undefinedHeadings: 'allow',
      };
      const expected = [
        [{ undefinedHeadings: 'forbid', headings: [{ purpose: 'heading', level: 1 }] }],
        [{ undefinedHeadings: 'allow', headings: [{ purpose: 'heading', level: 1 }] }],
      ];
      // ACT
      const actual = [
        candidateClaims('docs/closed/a.md', [closed, open]),
        candidateClaims('docs/open/a.md', [closed, open]),
      ].map((claims) => claims.map((claim) => claim.requirements));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('copies nested lists and allowed titles verbatim, and every entry mayHold rides inside its entry', () => {
      // ARRANGE
      const headings = [
        { purpose: 'heading', level: 2, allowed: [{ title: 'Context', intent: 'Why.' }], mayHold: ['prose'] },
        {
          purpose: 'enumeration',
          level: 2,
          pattern: '^\\[',
          minCount: 1,
          headings: [{ purpose: 'heading', level: 3, presence: 'optional', allowed: [{ title: 'Added' }] }],
        },
      ] as const;
      const rule: BodyStructureRule = { ruleId: 'v', intent: 'V.', folders: ['docs/'], headings };
      const expected = [{ headings }];
      // ACT
      const actual = candidateClaims('docs/a.md', [rule]).map((claim) => claim.requirements);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers no claim for a path no Rule reaches', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = candidateClaims('docs/elsewhere/x.md', [REPORTS, UNTYPED]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('writes every key in the order the wire has it in: types, maxLevel, undefinedHeadings, headings', () => {
      // ARRANGE
      const rule: BodyStructureRule = {
        ruleId: 'all',
        intent: 'All keys.',
        types: ['t'],
        maxLevel: 2,
        undefinedHeadings: 'allow',
        headings: [{ purpose: 'heading', level: 1 }],
      };
      const expected = ['types', 'maxLevel', 'undefinedHeadings', 'headings'];
      // ACT
      const actual = candidateClaims('a.md', [rule]).map((claim) => Object.keys(claim.requirements));
      // ASSERT
      expect(actual).toEqual([expected]);
    });

    it('leaves undefinedHeadings out of the claim of a Rule that never wrote it', () => {
      // ARRANGE
      const expected = [{ rule: { ruleId: 'bare', intent: 'Bare.' }, requirements: { maxLevel: 2 } }];
      // ACT
      const actual = candidateClaims('a.md', [{ ruleId: 'bare', intent: 'Bare.', maxLevel: 2 }]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves a requirement the Rule never wrote out of its claim', () => {
      // ARRANGE
      const expected = [{ rule: { ruleId: 'bare', intent: 'Bare.' }, requirements: {} }];
      // ACT
      const actual = candidateClaims('a.md', [{ ruleId: 'bare', intent: 'Bare.' }]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
