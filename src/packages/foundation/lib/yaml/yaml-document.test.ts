// Colocated unit test for the one seam that turns YAML bytes into a mapping
// or says why they are not one. `config-document.pure.ts` and
// `frontmatter-data.pure.ts` used to each hand-roll this — try, catch, drop
// the parser's message, narrow to a mapping — and disagreed on exactly one
// case: what an empty document means. That disagreement is why `emptyDocument`
// is an explicit argument here rather than a single hard-coded answer; see
// this file's own docblock for the two callers' reasons.

import { describe, expect, it } from 'vitest';
import { parseYamlDocument } from './yaml-document.pure';

describe('parseYamlDocument', () => {
  describe('success cases', () => {
    it('returns the mapping a document parses to', () => {
      // ARRANGE
      const text = 'frontmatter:\n rules: []\n';
      const expected = { kind: 'mapping', document: { frontmatter: { rules: [] } } };
      // ACT
      const actual = parseYamlDocument(text, 'fault');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a fault, not the parser message, when the bytes do not parse', () => {
      // ARRANGE
      const text = 'frontmatter:\n rules: [\n unclosed';
      const expected = { kind: 'fault' };
      // ACT
      const actual = parseYamlDocument(text, 'fault');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a fault when valid YAML parses to something other than a mapping', () => {
      // ARRANGE
      const text = '- one\n- two\n';
      const expected = { kind: 'fault' };
      // ACT
      const actual = parseYamlDocument(text, 'fault');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it("reports a fault for an empty document under 'fault'", () => {
      // An empty document parses to `undefined` rather than throwing, so the
      // mapping gate is the only thing standing between it and a caller that
      // would otherwise treat it as content.
      // ARRANGE
      const text = '';
      const expected = { kind: 'fault' };
      // ACT
      const actual = parseYamlDocument(text, 'fault');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it("reports an empty mapping for an empty document under 'empty-mapping'", () => {
      // ARRANGE
      const text = '';
      const expected = { kind: 'mapping', document: {} };
      // ACT
      const actual = parseYamlDocument(text, 'empty-mapping');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it("reports an empty mapping for a comment-only document under 'empty-mapping'", () => {
      // A block holding only a comment also parses to `null`.
      // ARRANGE
      const text = '# nothing here\n';
      const expected = { kind: 'mapping', document: {} };
      // ACT
      const actual = parseYamlDocument(text, 'empty-mapping');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
