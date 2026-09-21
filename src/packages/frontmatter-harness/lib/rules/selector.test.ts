// Colocated unit test for rule selection: the two literal axes, and exclusion.
//
// No matcher arrives as an argument any more, because there is nothing left to
// match with. Both axes are literal tokens compared as strings, so this file
// asserts the comparison itself rather than an agreement between a rule and a
// platform function — which is the whole point of the grammar it covers.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule, Selector } from '../../../config-contract/index.ts';
import { folderOf, ruleSelects, selectionFor, selectorMatches } from './selector.pure';

const folderRule: FrontmatterRule = {
  ruleId: 'research',
  intent: 'Research notes cite what they drew on',
  folders: ['docs/research/'],
};

const nameRule: FrontmatterRule = {
  ruleId: 'log-files',
  intent: 'A log says when it was written',
  fileNames: ['log.md'],
};

describe('rule selection', () => {
  describe('success cases', () => {
    it('selects a file sitting directly in a listed folder', () => {
      // ARRANGE
      const selected = true;
      // ACT
      const actual = ruleSelects(folderRule, 'docs/research/survey.md');
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('reaches a named file at any depth when the rule carries no folder axis', () => {
      // ARRANGE
      const anywhere = ['log.md', 'docs/log.md', 'docs/a/b/log.md'];
      // ACT
      const actual = anywhere.filter((path) => ruleSelects(nameRule, path));
      // ASSERT
      expect(actual).toEqual(anywhere);
    });

    it('intersects the two axes when a rule carries both', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'provenance-exemplar',
        intent: 'One document records its own provenance in full',
        folders: ['docs/research/'],
        fileNames: ['provenance.md'],
      };
      const inBoth = 'docs/research/provenance.md';
      const rightNameWrongFolder = 'docs/plain/provenance.md';
      const rightFolderWrongName = 'docs/research/survey.md';
      // ACT
      const actual = [rightNameWrongFolder, rightFolderWrongName, inBoth].filter((path) => ruleSelects(rule, path));
      // ASSERT
      expect(actual).toEqual([inBoth]);
    });

    it('names the corpus root with its own token', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', folders: ['./'] };
      const atRoot = 'README.md';
      const oneDeep = 'docs/README.md';
      // ACT
      const actual = [atRoot, oneDeep].filter((path) => ruleSelects(rule, path));
      // ASSERT
      expect(actual).toEqual([atRoot]);
    });

    it('excludes a file its own exclusion selector reaches', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...folderRule,
        excludeFiles: [{ folders: ['docs/research/'], fileNames: ['vendored.md'] }],
      };
      const excluded = 'excluded';
      // ACT
      const actual = selectionFor(rule, 'docs/research/vendored.md');
      // ASSERT
      expect(actual).toBe(excluded);
    });
  });

  describe('failure cases', () => {
    it('does not reach a subfolder of a listed folder, so no subtree is governed by accident', () => {
      // ARRANGE
      const child = 'docs/research/vendor/upstream.md';
      const selected = false;
      // ACT
      const actual = ruleSelects(folderRule, child);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('does not reach a parent of a listed folder either', () => {
      // ARRANGE
      const parent = 'docs/overview.md';
      const selected = false;
      // ACT
      const actual = ruleSelects(folderRule, parent);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('compares a file name case-sensitively, so a case-only variant does not match', () => {
      // ARRANGE
      const variant = 'docs/LOG.MD';
      const selected = false;
      // ACT
      const actual = ruleSelects(nameRule, variant);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('does not match a folder token that shares a prefix with the path', () => {
      // ARRANGE
      // The trailing separator is what closes the Jekyll defect: without it,
      // `docs/vision` would prefix-match `docs/visionary/`.
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', folders: ['docs/vision/'] };
      const neighbour = 'docs/visionary/product.md';
      const selected = false;
      // ACT
      const actual = ruleSelects(rule, neighbour);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('reports a path no axis reaches as unselected rather than excluded', () => {
      // ARRANGE
      // `--audit` reports the two differently: a rule that never reached a file
      // may hold a typo, while a rule whose own exclusion took one back is
      // working. Collapsing them makes the diagnostic silent.
      const rule: FrontmatterRule = { ...folderRule, excludeFiles: [{ fileNames: ['upstream.md'] }] };
      const unselected = 'unselected';
      // ACT
      const actual = selectionFor(rule, 'docs/plain/upstream.md');
      // ASSERT
      expect(actual).toBe(unselected);
    });
  });

  describe('edge cases', () => {
    it('answers the root token for a path carrying no separator', () => {
      // ARRANGE
      const root = './';
      // ACT
      const actual = folderOf('README.md');
      // ASSERT
      expect(actual).toBe(root);
    });

    it('answers everything up to and including the last separator for a nested path', () => {
      // ARRANGE
      const folder = 'docs/research/vendor/';
      // ACT
      const actual = folderOf('docs/research/vendor/upstream.md');
      // ASSERT
      expect(actual).toBe(folder);
    });

    it('reaches every path when a selector carries neither axis, which only a refused config can hold', () => {
      // ARRANGE
      // "An absent axis means every" composes, so both absent means everything.
      // A loaded config can never hold one — `CONFIG_SELECTOR_MISSING` refuses
      // it — and this states what the predicate does rather than leaving the
      // composition to be guessed at.
      const neither: Selector = {};
      const reached = true;
      // ACT
      const actual = selectorMatches(neither, 'anything/at/all.md');
      // ASSERT
      expect(actual).toBe(reached);
    });

    it('takes an exclusion carrying one axis, on the same terms an include does', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...folderRule, excludeFiles: [{ fileNames: ['upstream.md'] }] };
      const excluded = 'excluded';
      // ACT
      const actual = selectionFor(rule, 'docs/research/upstream.md');
      // ASSERT
      expect(actual).toBe(excluded);
    });
  });
});
