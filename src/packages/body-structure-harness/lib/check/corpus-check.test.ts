// Colocated unit test for judging a corpus: which files must be opened, which
// Rule wins each, and what each winner finds — depth violations first, then
// spine violations.

import { describe, expect, it } from 'vitest';
import { parseDocument } from '../../../foundation/read-corpus.ts';
import type { BodyStructureRule } from '../../section.ts';
import { moduleCheckFor } from './corpus-check.pure.ts';

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

/** One corpus file, parsed the way the Core parses it. */
const documentAt = (path: string, text: string) => ({ path, ...parseDocument(text) });

describe('corpus check', () => {
  describe('success cases', () => {
    it('governs each file by the Rule its type selects and reports only the failing ones', () => {
      // ARRANGE
      const sources = [
        documentAt('docs/a.md', '---\ntype: report\n---\n# A\n\n## Findings\n'),
        documentAt('docs/b.md', '# B\n\n# Again\n'),
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
  });

  describe('failure cases', () => {
    it('reports depth violations before spine violations', () => {
      // ARRANGE
      const sources = [documentAt('docs/a.md', '---\ntype: report\n---\n### Deep\n')];
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
      const sources = [documentAt('docs/a.md', '---\ntype: memo\n---\n# A\n# B\n')];
      const expected = { governed: [], files: [] };
      // ACT
      const actual = moduleCheckFor(sources, typedOnly);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
