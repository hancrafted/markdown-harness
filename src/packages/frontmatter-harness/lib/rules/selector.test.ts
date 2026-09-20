// Colocated unit test for rule selection: two literal axes and excludeFiles.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.types.ts';
import { ruleSelects, selectionFor, splitPath } from './selector.pure.ts';

const treeRule: FrontmatterRule = {
  ruleId: 'research',
  intent: 'Research notes cite what they drew on',
  folderTrees: ['docs/research/'],
};

const fileNameRule: FrontmatterRule = {
  ruleId: 'log-files',
  intent: 'A log says when it was written',
  fileNames: ['log.md'],
};

describe('rule selection', () => {
  describe('success cases', () => {
    it('selects a path matching folderTrees', () => {
      // ARRANGE
      const path = 'docs/research/notes.md';
      const selected = true;
      // ACT
      const actual = ruleSelects(treeRule, path);
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('matches a fileName rule against a file at any depth', () => {
      // ARRANGE
      const rootFile = 'log.md';
      const nestedFile = 'docs/logs/log.md';
      // ACT
      const actualRoot = ruleSelects(fileNameRule, rootFile);
      const actualNested = ruleSelects(fileNameRule, nestedFile);
      // ASSERT
      expect(actualRoot).toBe(true);
      expect(actualNested).toBe(true);
    });

    it('splits root and nested paths correctly', () => {
      // ARRANGE
      const rootExpected = { folder: './', fileName: 'README.md' };
      const nestedExpected = { folder: 'docs/vision/', fileName: 'VISION.md' };
      // ACT
      const actualRoot = splitPath('README.md');
      const actualNested = splitPath('docs/vision/VISION.md');
      // ASSERT
      expect(actualRoot).toEqual(rootExpected);
      expect(actualNested).toEqual(nestedExpected);
    });
  });

  describe('failure cases', () => {
    it('declines a path outside folderTrees', () => {
      // ARRANGE
      const selected = false;
      // ACT
      const actual = ruleSelects(treeRule, 'docs/other/notes.md');
      // ASSERT
      expect(actual).toBe(selected);
    });

    it('lets excludeFiles beat a selector that would otherwise match', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'r',
        intent: 'i',
        folderTrees: ['docs/'],
        excludeFiles: [{ folders: ['docs/okf/'], fileNames: ['SPEC-v0.2.md'] }],
      };
      // ACT
      const excluded = ruleSelects(rule, 'docs/okf/SPEC-v0.2.md');
      const included = ruleSelects(rule, 'docs/other.md');
      // ASSERT
      expect(excluded).toBe(false);
      expect(included).toBe(true);
    });

    it('tells an excluded path apart from an unselected one', () => {
      // ARRANGE
      const expectedExcluded = 'excluded';
      const expectedUnselected = 'unselected';
      const rule: FrontmatterRule = {
        ruleId: 'r',
        intent: 'i',
        folderTrees: ['docs/'],
        excludeFiles: [{ fileNames: ['excluded.md'] }],
      };
      // ACT
      const excludedVerdict = selectionFor(rule, 'docs/excluded.md');
      const unselectedVerdict = selectionFor(rule, 'other/file.md');
      // ASSERT
      expect(excludedVerdict).toBe(expectedExcluded);
      expect(unselectedVerdict).toBe(expectedUnselected);
    });
  });

  describe('edge cases', () => {
    it('does not select when single folder does not match subfolder', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'single',
        intent: 'single folder only',
        folders: ['docs/'],
      };
      // ACT
      const inFolder = ruleSelects(rule, 'docs/a.md');
      const inSubfolder = ruleSelects(rule, 'docs/sub/a.md');
      // ASSERT
      expect(inFolder).toBe(true);
      expect(inSubfolder).toBe(false);
    });

    it('is segment safe: docs/vision/ does not match docs/visionary/', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'vision',
        intent: 'vision docs',
        folderTrees: ['docs/vision/'],
      };
      // ACT
      const actual = ruleSelects(rule, 'docs/visionary/draft.md');
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
