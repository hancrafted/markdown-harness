// Colocated unit test for how a selector is reported.
//
// One rule, and it is a refusal: an axis the Operator left out is left out of
// the report too. An Operator reading a diagnostic has to recognise their own
// config in it, and "every file name" echoed back as `fileNames: []` is not
// what they wrote.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../section.ts';
import { selectorRefFor } from './selector-ref.pure';

describe('selectorRefFor', () => {
  describe('success cases', () => {
    it('reports a folder axis as written', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'research',
        intent: 'Research cites what it drew on',
        folders: ['docs/research/', 'docs/research/vendor/'],
      };
      const expected = { folders: ['docs/research/', 'docs/research/vendor/'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a file-name axis as written', () => {
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

    it('reports both axes when a rule carries both', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'provenance-exemplar',
        intent: 'One document records its own provenance in full',
        folders: ['docs/research/'],
        fileNames: ['provenance.md'],
      };
      const expected = { folders: ['docs/research/'], fileNames: ['provenance.md'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not invent a folder axis for a name-only rule', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', fileNames: ['index.md'] };
      const absent = undefined;
      // ACT
      const actual = selectorRefFor(rule).folders;
      // ASSERT
      expect(actual).toBe(absent);
    });

    it('does not invent a name axis for a folder-only rule', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', folders: ['docs/'] };
      const absent = undefined;
      // ACT
      const actual = selectorRefFor(rule).fileNames;
      // ASSERT
      expect(actual).toBe(absent);
    });
  });

  describe('edge cases', () => {
    it('reports an axis the Operator wrote empty as the empty list they wrote', () => {
      // ARRANGE
      // An empty list is a list, and it selects nothing. Reporting it as absent
      // would tell an Operator their rule reaches every folder, which is the
      // opposite of what it does.
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', folders: [], fileNames: ['index.md'] };
      const expected = { folders: [], fileNames: ['index.md'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries no key at all for an axis left out, so a reader can tell absent from empty', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', folders: ['docs/'] };
      const onlyFolders = ['folders'];
      // ACT
      const actual = Object.keys(selectorRefFor(rule));
      // ASSERT
      expect(actual).toEqual(onlyFolders);
    });
  });
});
