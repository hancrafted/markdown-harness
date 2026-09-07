// Colocated unit test for fence extraction: where a frontmatter block starts,
// where it ends, and the three ways it can fail to be one.
//
// This file knows nothing about YAML. Splitting the fences from the parse is
// what lets an unterminated fence be told apart from bytes that will not parse,
// and both from a file that never opened a block at all.

import { describe, expect, it } from 'vitest';
import { frontmatterBlock } from './frontmatter-block.pure';

describe('frontmatter block extraction', () => {
  describe('success cases', () => {
    it('returns the bytes between the fences', () => {
      // ARRANGE
      const file = '---\ntype: plain\ntitle: A file\n---\n\n# Body\n';
      const expected = { kind: 'present', text: 'type: plain\ntitle: A file' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('stops at the first closing fence, leaving later ones to the body', () => {
      // A horizontal rule further down the document is body text, not a second
      // block, so the closing fence is the FIRST one and not the last.
      // ARRANGE
      const file = '---\ntype: plain\n---\n\nProse\n\n---\n\nMore prose\n';
      const expected = { kind: 'present', text: 'type: plain' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a file with no fence at all as absent', () => {
      // ARRANGE
      const file = '# Notes that never opened a block\n\nProse only.\n';
      const expected = { kind: 'absent' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an opening fence that is never closed as unterminated', () => {
      // A file that opened a block and lost it is a BROKEN block, not an absent
      // one — the distinction the spec folds into `FRONTMATTER_UNPARSEABLE`.
      // ARRANGE
      const file = '---\ntype: plain\ntitle: The fence that never closes\n\nProse\n';
      const expected = { kind: 'unterminated' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not read a fence that opens anywhere but the first line', () => {
      // ARRANGE
      const file = '# A heading first\n\n---\ntype: plain\n---\n';
      const expected = { kind: 'absent' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('returns empty bytes for an immediately closed fence', () => {
      // Not the unparseable case: the block exists and is empty, which is what
      // `presence: required` has to fire against rather than skip.
      // ARRANGE
      const file = '---\n---\n\n# Plain documents\n';
      const expected = { kind: 'present', text: '' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a block whose lines end in carriage returns', () => {
      // A file authored on Windows must not read as a file with no frontmatter.
      // ARRANGE
      const file = '---\r\ntype: plain\r\n---\r\n\r\n# Body\r\n';
      const expected = { kind: 'present', text: 'type: plain' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a block behind a byte-order mark', () => {
      // ARRANGE
      const file = '﻿---\ntype: plain\n---\n';
      const expected = { kind: 'present', text: 'type: plain' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads an entirely empty file as absent', () => {
      // ARRANGE
      const file = '';
      const expected = { kind: 'absent' };
      // ACT
      const actual = frontmatterBlock(file);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
