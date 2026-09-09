// Colocated unit test for the catalog of field violation codes.
//
// It imports its same-name `.pure` sibling and nothing else: the colocated test
// lane admits exactly that one edge. The eighteen codes are written out by hand
// below rather than read back off the catalog, because a test that derives its
// expectation from the subject agrees with every possible subject.

import { describe, expect, it } from 'vitest';
import { FIELD_VIOLATION_CODES } from './violation.pure';

describe('FIELD_VIOLATION_CODES', () => {
  describe('success cases', () => {
    it('ships the eighteen codes the specification names, in specification order', () => {
      // ARRANGE
      const eighteenCodes = [
        'MISSING_REQUIRED_FIELD',
        'EMPTY_REQUIRED_FIELD',
        'FORBIDDEN_FIELD_PRESENT',
        'VALUE_NOT_ALLOWED',
        'FORMAT_MISMATCH',
        'PATTERN_MISMATCH',
        'VALUE_TOO_SHORT',
        'VALUE_TOO_LONG',
        'TOO_FEW_ITEMS',
        'TOO_MANY_ITEMS',
        'ITEM_TOO_LONG',
        'CONSTRAINT_SHAPE_MISMATCH',
        'UNKNOWN_KEY_FORBIDDEN',
        'FRONTMATTER_FORBIDDEN',
        'EXACTLY_ONE_OF_NONE_PRESENT',
        'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
        'ANY_OF_UNSATISFIED',
        'ALL_OF_UNSATISFIED',
      ];
      // ACT
      const shipped = Object.keys(FIELD_VIOLATION_CODES);
      // ASSERT
      expect(shipped).toEqual(eighteenCodes);
    });

    it('answers every key with its own name, so a lookup and a literal are interchangeable', () => {
      // ARRANGE
      const entries = Object.entries(FIELD_VIOLATION_CODES);
      // ACT
      const disagreeing = entries.filter(([key, value]) => key !== value).map(([key]) => key);
      // ASSERT
      expect(disagreeing).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('withholds the unparseable-frontmatter code, which is file-level and outside the eighteen', () => {
      // ARRANGE
      const outsideTheEighteen = 'FRONTMATTER_UNPARSEABLE';
      // ACT
      const shipped = Object.keys(FIELD_VIOLATION_CODES);
      // ASSERT
      expect(shipped).not.toContain(outsideTheEighteen);
    });

    it('withholds every config fault code, which addresses the Operator and not the Contributor', () => {
      // ARRANGE
      const operatorPrefix = 'CONFIG_';
      // ACT
      const prefixed = Object.keys(FIELD_VIOLATION_CODES).filter((code) => code.startsWith(operatorPrefix));
      // ASSERT
      expect(prefixed).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('carries the six codes that discriminate violation shapes holding no field address', () => {
      // The catalog is named for field violations, but six of its members are
      // the discriminants of shapes whose `field` is `null`. Dropping one would
      // leave a shipped violation carrying a code the catalog cannot name.
      // ARRANGE
      const fieldlessDiscriminants = [
        'UNKNOWN_KEY_FORBIDDEN',
        'FRONTMATTER_FORBIDDEN',
        'EXACTLY_ONE_OF_NONE_PRESENT',
        'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
        'ANY_OF_UNSATISFIED',
        'ALL_OF_UNSATISFIED',
      ];
      // ACT
      const shipped = Object.keys(FIELD_VIOLATION_CODES);
      // ASSERT
      expect(shipped).toEqual(expect.arrayContaining(fieldlessDiscriminants));
    });

    it('gives no two keys the same value, which is what keeps the derived union eighteen wide', () => {
      // The union is `(typeof FIELD_VIOLATION_CODES)[keyof typeof ...]`, so it
      // is built from the VALUES. A duplicated value narrows the contract to
      // seventeen members while the object still reports eighteen keys.
      // ARRANGE
      const eighteen = 18;
      // ACT
      const distinctValues = new Set(Object.values(FIELD_VIOLATION_CODES)).size;
      // ASSERT
      expect(distinctValues).toBe(eighteen);
    });
  });
});
