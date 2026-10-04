// Colocated unit test for selection on three axes: Core's folders and file
// names, decided from the path, and `types`, decided from the file's `type`.
//
// Every axis a Rule carries must match, an absent axis means every, an
// exclusion is decided from the path alone, and the first Rule matching on
// every axis wins (design-ADRs 0012 and 0015).

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule } from '../../section.ts';
import { axesMatch, firstMatch, reaches, selectionFor } from './selection.pure.ts';

const RESEARCH: BodyStructureRule = {
  ruleId: 'research',
  intent: 'Research reads the same way every time.',
  folders: ['docs/research/'],
  types: ['research'],
  excludeFiles: [{ fileNames: ['scratch.md'] }],
};

const UNTYPED: BodyStructureRule = {
  ruleId: 'untyped',
  intent: 'Anything else in the folder has one title.',
  folders: ['docs/research/'],
};

const GUIDES: BodyStructureRule = { ruleId: 'guides', intent: 'A guide has sections.', types: ['guide'] };

describe('selection', () => {
  describe('success cases', () => {
    it('selects a file whose path and type match every axis the Rule carries', () => {
      // ARRANGE
      const expected = 'selected';
      // ACT
      const actual = selectionFor(RESEARCH, 'docs/research/report.md', 'research');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets the first Rule matching on every axis win, falling through on type', () => {
      // ARRANGE
      const rules = [RESEARCH, GUIDES, UNTYPED];
      const expected = ['research', 'guides', 'untyped'];
      // ACT
      const actual = [
        firstMatch('docs/research/a.md', 'research', rules)?.ruleId,
        firstMatch('docs/research/a.md', 'guide', rules)?.ruleId,
        firstMatch('docs/research/a.md', undefined, rules)?.ruleId,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches every path from a Rule that writes only types', () => {
      // ARRANGE
      const expected = [true, true];
      // ACT
      const actual = [reaches(GUIDES, 'README.md'), reaches(GUIDES, 'docs/a/b/c.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('selects nothing whose type is absent, differs in case, or carries a space', () => {
      // ARRANGE
      const expected = ['unselected', 'unselected', 'unselected'];
      // ACT
      const actual = [undefined, 'Research', ' research'].map((type) =>
        selectionFor(RESEARCH, 'docs/research/report.md', type),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not reach a file in a subfolder of a folder token', () => {
      // ARRANGE
      const expected = 'unselected';
      // ACT
      const actual = selectionFor(UNTYPED, 'docs/research/deep/report.md', undefined);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('governs nothing when no Rule matches', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = firstMatch('docs/elsewhere/a.md', 'research', [RESEARCH, UNTYPED]);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reports a file all three axes match and the Rule excludes as excluded, never selected', () => {
      // ARRANGE
      const expected = 'excluded';
      // ACT
      const actual = selectionFor(RESEARCH, 'docs/research/scratch.md', 'research');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('does not count an excluded path whose type the Rule does not take as excluded', () => {
      // ARRANGE
      const expected = 'unselected';
      // ACT
      const actual = selectionFor(RESEARCH, 'docs/research/scratch.md', 'note');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('decides reach from the path alone, so an exclusion removes the path whatever its type', () => {
      // ARRANGE
      const expected = [false, true];
      // ACT
      const actual = [reaches(RESEARCH, 'docs/research/scratch.md'), reaches(RESEARCH, 'docs/research/x.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches an excluded path on the path axes, ahead of its exclusion', () => {
      // What the audit needs to know whether a file's type could make it count
      // as excluded.
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = [axesMatch(RESEARCH, 'docs/research/scratch.md'), axesMatch(RESEARCH, 'docs/x.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an excluded file fall through to a later Rule', () => {
      // ARRANGE
      const expected = 'untyped';
      // ACT
      const actual = firstMatch('docs/research/scratch.md', 'research', [RESEARCH, UNTYPED])?.ruleId;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
