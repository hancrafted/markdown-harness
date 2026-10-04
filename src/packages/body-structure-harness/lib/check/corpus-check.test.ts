// Colocated unit test for judging a corpus: which files must be opened, which
// Rule wins each, and what each winner finds — depth violations first, then
// spine violations (design-ADRs 0012, 0017 and 0019).

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule } from '../../section.ts';
import { moduleCheckFor, pathsToRead } from './corpus-check.pure.ts';

const REPORTS: BodyStructureRule = {
  ruleId: 'reports',
  intent: 'A report has one title and its findings.',
  folders: ['docs/'],
  types: ['report'],
  maxLevel: 2,
  headings: [
    { purpose: 'heading', level: 1 },
    { purpose: 'heading', level: 2, pattern: '^Findings$' },
  ],
};

const UNTYPED: BodyStructureRule = {
  ruleId: 'untyped',
  intent: 'Anything else in docs has one title.',
  folders: ['docs/'],
  maxLevel: 1,
  headings: [{ purpose: 'heading', level: 1 }],
};

const RULES = [REPORTS, UNTYPED];

describe('corpus check', () => {
  describe('success cases', () => {
    it('governs each file by the Rule its type selects and reports only the failing ones', () => {
      // ARRANGE
      const sources = [
        { path: 'docs/a.md', text: '---\ntype: report\n---\n# A\n\n## Findings\n' },
        { path: 'docs/b.md', text: '# B\n\n# Again\n' },
      ];
      const expected = {
        governed: ['docs/a.md', 'docs/b.md'],
        files: [
          {
            path: 'docs/b.md',
            ruleId: 'untyped',
            ruleIntent: 'Anything else in docs has one title.',
            violations: [
              {
                violation: 'BODY_STRUCTURE__HEADING_REPEATED',
                entry: 0,
                found: 2,
                requirement: { purpose: 'heading', level: 1 },
              },
            ],
          },
        ],
      };
      // ACT
      const actual = moduleCheckFor(sources, RULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('opens only files some Rule reaches from the path', () => {
      // ARRANGE
      const corpus = ['README.md', 'docs/a.md', 'docs/deep/b.md'];
      const expected = ['docs/a.md'];
      // ACT
      const actual = pathsToRead(corpus, RULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports depth violations before spine violations', () => {
      // ARRANGE
      const sources = [{ path: 'docs/a.md', text: '---\ntype: report\n---\n### Deep\n' }];
      const expected = [
        'BODY_STRUCTURE__LEVEL_TOO_DEEP',
        'BODY_STRUCTURE__HEADING_MISSING',
        'BODY_STRUCTURE__HEADING_MISSING',
      ];
      // ACT
      const actual = moduleCheckFor(sources, RULES).files.flatMap((file) => file.violations.map((v) => v.violation));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves a file whose type selects no Rule ungoverned', () => {
      // ARRANGE
      const typedOnly = [REPORTS];
      const sources = [{ path: 'docs/a.md', text: '---\ntype: memo\n---\n# A\n# B\n' }];
      const expected = { governed: [], files: [] };
      // ACT
      const actual = moduleCheckFor(sources, typedOnly);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads nothing when the section governs nothing', () => {
      // ARRANGE
      const expected: readonly string[] = [];
      // ACT
      const actual = pathsToRead(['docs/a.md'], []);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
