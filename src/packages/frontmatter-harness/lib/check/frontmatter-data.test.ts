// Colocated unit test for turning a file into frontmatter data.
//
// The three outcomes are not interchangeable, and the tests below are mostly
// about keeping them apart. A YAML reader hands back nothing for an empty block
// and nothing for a missing one, and a harness that read those two the same way
// would report nothing at all on a file whose rule requires a field.

import { describe, expect, it } from 'vitest';
import { frontmatterData } from './frontmatter-data.pure';

describe('frontmatter data', () => {
  describe('success cases', () => {
    it('parses a block into a mapping', () => {
      // ARRANGE
      const file = '---\ntype: plain\ntitle: A file\n---\n\n# Body\n';
      const expected = { kind: 'mapping', data: { type: 'plain', title: 'A file' } };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps a nested mapping and a list intact', () => {
      // ARRANGE
      const file = '---\ngenerated:\n  by: claude-opus/5\nsources:\n  - id: spec\n---\n';
      const expected = { kind: 'mapping', data: { generated: { by: 'claude-opus/5' }, sources: [{ id: 'spec' }] } };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a file with no fence as absent', () => {
      // ARRANGE
      const file = '# Notes\n\nProse only.\n';
      const expected = { kind: 'absent' };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports bytes that are not valid YAML as unparseable', () => {
      // An unclosed flow sequence: the block exists and will not parse.
      // ARRANGE
      const file = '---\ntype: plain\ntags: [okf, provenance\n---\n';
      const expected = { kind: 'unparseable' };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a block that parses to a list as unparseable', () => {
      // A parse that succeeds is not a parse that produced frontmatter: there
      // is no top-level key to read from a sequence.
      // ARRANGE
      const file = '---\n- type: plain\n- title: A block that is a list\n---\n';
      const expected = { kind: 'unparseable' };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a block that parses to a bare scalar as unparseable', () => {
      // ARRANGE
      const file = '---\njust a sentence\n---\n';
      const expected = { kind: 'unparseable' };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a fence that never closes as unparseable', () => {
      // ARRANGE
      const file = '---\ntype: plain\ntitle: The fence that never closes\n\nProse\n';
      const expected = { kind: 'unparseable' };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads an immediately closed fence as an empty mapping', () => {
      // THE TRAP. `parse('')` returns null, and null is not a mapping — so the
      // literal shape check would call this unparseable and skip every field
      // check, when the spec says the block parses, to `{}`.
      // ARRANGE
      const file = '---\n---\n\n# Plain documents\n';
      const expected = { kind: 'mapping', data: {} };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a comment-only block as an empty mapping', () => {
      // Same null from the parser, and the same reading: the author opened and
      // closed a block, so there is a block, and it holds no keys.
      // ARRANGE
      const file = '---\n# nothing but a comment\n---\n';
      const expected = { kind: 'mapping', data: {} };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps a written-and-blank key as a null value rather than dropping it', () => {
      // `type:` and no `type` at all are different mistakes with different
      // fixes, so the key has to survive parsing.
      // ARRANGE
      const file = '---\ntype:\n---\n';
      const expected = { kind: 'mapping', data: { type: null } };
      // ACT
      const actual = frontmatterData(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
