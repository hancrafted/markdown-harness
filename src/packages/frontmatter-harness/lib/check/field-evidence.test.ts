// Colocated unit test for what a violation says about the value it found.
//
// Two rules, and both are about what a report must NOT carry. A container
// contributes its size and never its contents, because frontmatter lists are
// unbounded and violations repeat per file across a corpus. And emptiness has
// exactly one definition here, shared by `presence: required` and by every
// cross-field set, so `title: ''` cannot satisfy `allOf` while also failing
// `required`.

import { describe, expect, it } from 'vitest';
import { evidenceFor, isEmptyValue } from './field-evidence.pure';

describe('field evidence', () => {
  describe('success cases', () => {
    it.each([
      ['a string', 'research'],
      ['a number', 5],
      ['a boolean', true],
    ])('reports %s verbatim', (_label, value) => {
      // ARRANGE
      const expected = value;
      // ACT
      const actual = evidenceFor(value);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a list as its entry count, never its entries', () => {
      // ARRANGE
      const value = ['okf', 'provenance', 'frontmatter'];
      const expected = { items: 3 };
      // ACT
      const actual = evidenceFor(value);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a mapping as its keys, never their values', () => {
      // ARRANGE
      const value = { by: 'claude-opus/5', at: '2026-08-25T09:00:00Z' };
      const expected = { keys: ['by', 'at'] };
      // ACT
      const actual = evidenceFor(value);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each([
      ['an empty string', ''],
      ['an empty list', []],
      ['an empty mapping', {}],
      ['a bare key', null],
    ])('counts %s as empty', (_label, value) => {
      // ARRANGE
      const empty = true;
      // ACT
      const actual = isEmptyValue(value);
      // ASSERT
      expect(actual).toBe(empty);
    });
  });

  describe('edge cases', () => {
    it.each([
      ['zero', 0],
      ['false', false],
    ])('does not count %s as empty', (_label, value) => {
      // A falsy value is a value. Reading emptiness off truthiness would tell
      // an author to fill in a field they deliberately set.
      // ARRANGE
      const empty = false;
      // ACT
      const actual = isEmptyValue(value);
      // ASSERT
      expect(actual).toBe(empty);
    });

    it('keeps a nested list out of the evidence it reports', () => {
      // ARRANGE
      const value = [{ id: 'spec', secret: 'do not print me' }];
      const expected = { items: 1 };
      // ACT
      const actual = evidenceFor(value);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a bare key as null, which is a value and not an absence', () => {
      // ARRANGE
      const expected = null;
      // ACT
      const actual = evidenceFor(null);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
