// Colocated unit test for the section's Rule list asked of a path: the `types`
// axis composed with Core's selection, the candidates before a file is opened,
// and the paths a check or audit must open:
// folders and file names are decided from the path (tested in `foundation`),
// `types` from the file's `type`.
//
// Every axis a Rule carries must match, an absent axis means every, an
// exclusion is decided from the path alone, and the first Rule matching on
// every axis wins (design-ADRs 0012 and 0015).

import { describe, expect, it } from 'vitest';
import type { BodyStructureRule } from '../../section.ts';
import { candidatesFor, pathsToAudit, pathsToOpen, selectionFor, winnerFor } from './body-rules.pure.ts';

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

const INDEX: BodyStructureRule = { ruleId: 'index', intent: 'Index pages.', fileNames: ['index.md'] };

const ids = (rules: readonly BodyStructureRule[]): readonly string[] => rules.map((rule) => rule.ruleId);

describe('body rules', () => {
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
        winnerFor('docs/research/a.md', 'research', rules)?.ruleId,
        winnerFor('docs/research/a.md', 'guide', rules)?.ruleId,
        winnerFor('docs/research/a.md', undefined, rules)?.ruleId,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists every Rule that reaches a path in config order, a types-only Rule included', () => {
      // ARRANGE
      const expected = ['research', 'guides'];
      // ACT
      const actual = ids(candidatesFor('docs/research/a.md', [RESEARCH, GUIDES]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('opens only files some Rule reaches from the path', () => {
      // ARRANGE
      const corpus = ['README.md', 'docs/research/a.md', 'other/index.md'];
      const expected = ['docs/research/a.md', 'other/index.md'];
      // ACT
      const actual = pathsToOpen(corpus, [RESEARCH, INDEX]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('audits every file `--check` opens, typed or not, so both refuse over the same unreadable file', () => {
      // `other/index.md` is reached by `index` alone, which writes no `types`.
      // ARRANGE
      const corpus = ['README.md', 'docs/research/a.md', 'other/index.md'];
      const expected = ['docs/research/a.md', 'other/index.md'];
      // ACT
      const actual = pathsToAudit(corpus, [INDEX, RESEARCH, UNTYPED]);
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

    it('governs nothing when no Rule matches', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = winnerFor('docs/elsewhere/a.md', 'research', [RESEARCH, UNTYPED]);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('answers no candidate and opens nothing for a path no Rule reaches', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const actual = [
        ids(candidatesFor('docs/elsewhere/x.md', [RESEARCH, UNTYPED])),
        pathsToOpen(['docs/elsewhere/x.md'], [RESEARCH, UNTYPED]),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves out a Rule whose exclusion removes the path, so it neither appears nor ends the list', () => {
      // ARRANGE
      const excludedUntyped: BodyStructureRule = { ...UNTYPED, excludeFiles: [{ fileNames: ['scratch.md'] }] };
      const expected = ['guides'];
      // ACT
      const actual = ids(candidatesFor('docs/research/scratch.md', [RESEARCH, excludedUntyped, GUIDES]));
      // ASSERT
      expect(actual).toEqual(expected);
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

    it('makes a Rule that writes only types a candidate for every path, and opens every path for it', () => {
      // ARRANGE
      const paths = ['README.md', 'docs/a/b/c.md'];
      const expected = [['guides'], ['guides'], paths];
      // ACT
      const actual = [
        ids(candidatesFor('README.md', [GUIDES])),
        ids(candidatesFor('docs/a/b/c.md', [GUIDES])),
        pathsToOpen(paths, [GUIDES]),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers a types-only Rule for a path no other Rule reaches', () => {
      // ARRANGE
      const expected = ['guides'];
      // ACT
      const actual = ids(candidatesFor('docs/elsewhere/x.md', [RESEARCH, GUIDES]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an excluded file fall through to a later Rule', () => {
      // ARRANGE
      const expected = 'untyped';
      // ACT
      const actual = winnerFor('docs/research/scratch.md', 'research', [RESEARCH, UNTYPED])?.ruleId;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('ends the candidates at the first Rule that carries no types', () => {
      // ARRANGE
      const expected = ['research', 'untyped'];
      // ACT
      const actual = ids(candidatesFor('docs/research/new.md', [RESEARCH, UNTYPED, GUIDES]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('opens nothing when the section has no Rules', () => {
      // ARRANGE
      const expected: readonly string[] = [];
      // ACT
      const actual = [...pathsToOpen(['docs/a.md'], []), ...pathsToAudit(['docs/a.md'], [])];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('audits a file a typed Rule excludes and no Rule reaches, because its type decides that count', () => {
      // `--check` never opens `docs/research/scratch.md` here; the audit must,
      // to learn whether the exclusion counts.
      // ARRANGE
      const corpus = ['docs/research/scratch.md', 'other/scratch.md'];
      const expected = [[], ['docs/research/scratch.md']];
      // ACT
      const actual = [pathsToOpen(corpus, [RESEARCH]), pathsToAudit(corpus, [RESEARCH])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
