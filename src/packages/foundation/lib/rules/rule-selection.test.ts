// Colocated unit test for Core's selection of one Rule on two literal axes:
// which files a Rule reaches, which Rule wins under first-match, and the
// selector a Rule reports as written.

import { describe, expect, it } from 'vitest';
import type { RuleHead } from '../../rule-selection.ts';
import { firstMatch, reaches, selectionFor, selectorMatches, selectorRefFor } from '../../rule-selection.ts';

const rule = (fields: Partial<RuleHead> & { ruleId: string }): RuleHead => ({ intent: 'Because.', ...fields });

describe('rule selection', () => {
  describe('success cases', () => {
    it('selects a file sitting directly in a listed folder', () => {
      // ARRANGE
      const docs = rule({ ruleId: 'docs', folders: ['docs/'] });
      const expected = 'selected';
      // ACT
      const actual = selectionFor(docs, 'docs/a.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reaches a named file at any depth when the Rule carries no folder axis', () => {
      // ARRANGE
      const index = rule({ ruleId: 'index', fileNames: ['index.md'] });
      const expected = [true, true];
      // ACT
      const actual = ['index.md', 'a/b/c/index.md'].map((path) => reaches(index, path));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches every path from a selector carrying neither axis', () => {
      // A loaded config never holds one (CONFIG_SELECTOR_MISSING refuses it); the predicate stays one expression.
      // ARRANGE
      const bare = rule({ ruleId: 'bare' });
      const expected = [true, true];
      // ACT
      const actual = [reaches(bare, 'README.md'), reaches(bare, 'docs/a/b.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('intersects the two axes when a Rule carries both, and names the corpus root as ./', () => {
      // ARRANGE
      const both = rule({ ruleId: 'both', folders: ['docs/'], fileNames: ['index.md'] });
      const root = rule({ ruleId: 'root', folders: ['./'] });
      const expected = [true, false, false, true, false];
      // ACT
      const actual = [
        selectorMatches(both, 'docs/index.md'),
        selectorMatches(both, 'docs/a.md'),
        selectorMatches(both, 'other/index.md'),
        selectorMatches(root, 'README.md'),
        selectorMatches(root, 'docs/README.md'),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('returns the first Rule that selects a path, in written order', () => {
      // ARRANGE
      const broad = rule({ ruleId: 'broad', folders: ['docs/'] });
      const narrow = rule({ ruleId: 'narrow', folders: ['docs/'], fileNames: ['a.md'] });
      const expected = [broad, narrow];
      // ACT
      const actual = [firstMatch('docs/a.md', [broad, narrow]), firstMatch('docs/a.md', [narrow, broad])];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a selector as written, leaving an axis the Rule never wrote out', () => {
      // ARRANGE
      const folderOnly = rule({ ruleId: 'a', folders: ['docs/'] });
      const nameOnly = rule({ ruleId: 'b', fileNames: ['index.md'] });
      const expected = [{ folders: ['docs/'] }, { fileNames: ['index.md'] }];
      // ACT
      const actual = [selectorRefFor(folderOnly), selectorRefFor(nameOnly)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not reach a subfolder or the parent of a listed folder, so no subtree is governed by accident', () => {
      // ARRANGE
      const docs = rule({ ruleId: 'docs', folders: ['docs/vision/'] });
      const expected = ['unselected', 'unselected', 'unselected'];
      // ACT
      const actual = ['docs/vision/deep/a.md', 'docs/a.md', 'docs/visionary/a.md'].map((path) =>
        selectionFor(docs, path),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('compares file names case-sensitively', () => {
      // ARRANGE
      const readme = rule({ ruleId: 'readme', fileNames: ['README.md'] });
      const expected = 'unselected';
      // ACT
      const actual = selectionFor(readme, 'docs/readme.md');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('returns nothing when no Rule selects the path, or the list is empty', () => {
      // ARRANGE
      const docs = rule({ ruleId: 'docs', folders: ['docs/'] });
      const expected = [undefined, undefined];
      // ACT
      const actual = [firstMatch('src/a.md', [docs]), firstMatch('docs/a.md', [])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports a path the Rule reaches and excludes as excluded, not unselected', () => {
      // ARRANGE
      const docs = rule({ ruleId: 'docs', folders: ['docs/'], excludeFiles: [{ fileNames: ['draft.md'] }] });
      const expected = ['excluded', 'unselected'];
      // ACT
      const actual = [selectionFor(docs, 'docs/draft.md'), selectionFor(docs, 'src/draft.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('removes an excluded path from reach, and lets it fall through to a later Rule', () => {
      // ARRANGE
      const docs = rule({ ruleId: 'docs', folders: ['docs/'], excludeFiles: [{ fileNames: ['draft.md'] }] });
      const rest = rule({ ruleId: 'rest', fileNames: ['draft.md'] });
      const expected = [false, 'rest'];
      // ACT
      const actual = [reaches(docs, 'docs/draft.md'), firstMatch('docs/draft.md', [docs, rest])?.ruleId];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an exclusion carrying one axis remove on the same terms an include does', () => {
      // ARRANGE
      const docs = rule({
        ruleId: 'docs',
        folders: ['docs/'],
        excludeFiles: [{ folders: ['docs/'], fileNames: ['x.md'] }],
      });
      const expected = ['excluded', 'selected'];
      // ACT
      const actual = [selectionFor(docs, 'docs/x.md'), selectionFor(docs, 'docs/y.md')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an axis written empty as an empty list, distinct from an axis left out', () => {
      // ARRANGE
      const empty = rule({ ruleId: 'empty', folders: [], fileNames: ['a.md'] });
      const expected = { folders: [], fileNames: ['a.md'] };
      // ACT
      const actual = selectorRefFor(empty);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
