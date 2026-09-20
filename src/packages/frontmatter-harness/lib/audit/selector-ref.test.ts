// Colocated unit test for how a selector is reported.
//
// One rule, and it is a refusal: the `fileName` sugar is reported as sugar. An
// Operator reading a diagnostic has to recognise their own config in it, and
// `path: ["**/log.md"]` is not what they wrote.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.types.ts';
import { selectorRefFor } from './selector-ref.pure.ts';

describe('selectorRefFor', () => {
  describe('success cases', () => {
    it('reports folderTrees and folders selector as written', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'research',
        intent: 'Research cites what it drew on',
        folderTrees: ['docs/research/'],
        folders: ['docs/legacy/'],
      };
      const expected = { folderTrees: ['docs/research/'], folders: ['docs/legacy/'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a fileNames selector as written', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'log-files',
        intent: 'A log says when it was written',
        fileNames: ['log.md'],
      };
      const expected = { fileNames: ['log.md'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('never invents keys that were not present on the rule', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'log-files',
        intent: 'A log says when it was written',
        fileNames: ['log.md'],
      };
      const missingKey = 'folderTrees';
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).not.toHaveProperty(missingKey);
    });
  });

  describe('edge cases', () => {
    it('reports combined folderTrees and fileNames axes together', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'provenance-exemplar',
        intent: 'The two exemplars carry full provenance',
        folderTrees: ['docs/research/'],
        fileNames: ['provenance.md', 'provenance-broken.md'],
      };
      const expected = {
        folderTrees: ['docs/research/'],
        fileNames: ['provenance.md', 'provenance-broken.md'],
      };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty object when no selector axes were defined', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i' };
      const expected = {};
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
