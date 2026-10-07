// Colocated unit test for the intent-carrier walk.
//
// The walk is generic: it names no Module's section type, so the seam is a plain
// parsed document in and a list of addresses out.

import { describe, expect, it } from 'vitest';
import { intentCarrierAddresses } from './intent-carriers.pure';

describe('intentCarrierAddresses', () => {
  describe('success cases', () => {
    it('finds a string intent at any depth and addresses it from the root', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [{ id: 'a', intent: 'x' }, { id: 'b' }] }, intent: 'top' };
      const expected = ['frontmatter.rules[0].intent', 'intent'];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('ignores an intent key whose value is not a string', () => {
      // ARRANGE
      const document = { a: { intent: 3 }, b: { intent: null }, c: { intent: { nested: 'x' } } };
      const expected: string[] = [];
      // ACT
      const actual = intentCarrierAddresses(document);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('returns nothing for a scalar or an empty document', () => {
      // ARRANGE
      const documents = ['intent', 7, null, {}, []];
      const expected = [[], [], [], [], []];
      // ACT
      const actual = documents.map(intentCarrierAddresses);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
