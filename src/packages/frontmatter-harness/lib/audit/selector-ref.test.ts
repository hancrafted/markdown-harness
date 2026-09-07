// Colocated unit test for how a selector is reported.
//
// One rule, and it is a refusal: the `fileName` sugar is reported as sugar. An
// Operator reading a diagnostic has to recognise their own config in it, and
// `path: ["**/log.md"]` is not what they wrote.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { selectorRefFor } from './selector-ref.pure';

describe('selectorRefFor', () => {
  describe('success cases', () => {
    it('reports a path selector as written', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'research',
        intent: 'Research cites what it drew on',
        path: ['docs/research/**/*.md'],
      };
      const expected = { path: ['docs/research/**/*.md'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a fileName selector as the sugar the Operator wrote', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'log-files',
        intent: 'A log says when it was written',
        fileName: 'log.md',
      };
      const expected = { fileName: 'log.md' };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('never expands fileName into the glob it desugars to', () => {
      // This is the assertion that fails if the report is ever built from the
      // resolver's desugared globs instead of from the rule.
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'log-files',
        intent: 'A log says when it was written',
        fileName: 'log.md',
      };
      const desugared = '**/log.md';
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(JSON.stringify(actual)).not.toContain(desugared);
    });
  });

  describe('edge cases', () => {
    it('reports every glob of a multi-glob path selector, in order', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'provenance-exemplar',
        intent: 'The two exemplars carry full provenance',
        path: ['docs/research/provenance.md', 'docs/research/provenance-broken.md'],
      };
      const expected = { path: ['docs/research/provenance.md', 'docs/research/provenance-broken.md'] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty path list as an empty list rather than as sugar', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: [] };
      const expected = { path: [] };
      // ACT
      const actual = selectorRefFor(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
