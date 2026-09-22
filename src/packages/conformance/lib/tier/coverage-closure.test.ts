import { describe, expect, it } from 'vitest';
import { coverageAndClosure } from './coverage-closure.pure.ts';

describe('coverageAndClosure', () => {
  describe('success cases', () => {
    it('answers complete coverage and closure together', () => {
      // ARRANGE
      const declared = ['one', 'two'];
      const reached = ['one', 'two'];
      const frozen = ['one', 'two'];
      const complete = { unreached: [], undeclared: [] };
      // ACT
      const actual = coverageAndClosure(declared, reached, frozen);
      // ASSERT
      expect(actual).toEqual(complete);
    });
  });

  describe('failure cases', () => {
    it('reports a declared value no case reaches', () => {
      // ARRANGE
      const declared = ['one', 'two'];
      const reached = ['one'];
      const frozen = ['one'];
      const incomplete = { unreached: ['two'], undeclared: [] };
      // ACT
      const actual = coverageAndClosure(declared, reached, frozen);
      // ASSERT
      expect(actual).toEqual(incomplete);
    });

    it('reports a frozen value outside the declared vocabulary', () => {
      // ARRANGE
      const declared = ['one'];
      const reached = ['one'];
      const frozen = ['one', 'two'];
      const dishonest = { unreached: [], undeclared: ['two'] };
      // ACT
      const actual = coverageAndClosure(declared, reached, frozen);
      // ASSERT
      expect(actual).toEqual(dishonest);
    });
  });

  describe('edge cases', () => {
    it('keeps duplicate frozen values out of the closure result', () => {
      // ARRANGE
      const declared = ['one'];
      const reached = ['one'];
      const frozen = ['one', 'one'];
      const complete = { unreached: [], undeclared: [] };
      // ACT
      const actual = coverageAndClosure(declared, reached, frozen);
      // ASSERT
      expect(actual).toEqual(complete);
    });
  });
});
