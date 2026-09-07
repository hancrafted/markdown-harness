// Colocated unit test for the `isConfigError` narrowing helper.
//
// It imports its same-name `.pure` sibling and nothing else: the colocated test
// lane admits exactly that one edge, so the shapes below are written out by hand
// rather than imported from `./config-error.types`.

import { describe, expect, it } from 'vitest';
import { isConfigError } from './config-error.pure';

describe('isConfigError', () => {
  describe('success cases', () => {
    it('recognises a rejection by its error key', () => {
      // ARRANGE
      const rejection = { error: 'CONFIG_REJECTED', faults: [] };
      const recognised = true;
      // ACT
      const actual = isConfigError(rejection);
      // ASSERT
      expect(actual).toBe(recognised);
    });
  });

  describe('failure cases', () => {
    it('leaves a governed query result unclaimed', () => {
      // ARRANGE
      const governed = { governance: 'governed', path: 'docs/a.md', requirements: { fields: [] } };
      const recognised = false;
      // ACT
      const actual = isConfigError(governed);
      // ASSERT
      expect(actual).toBe(recognised);
    });

    it('leaves an invisible query result unclaimed', () => {
      // ARRANGE
      const invisible = { governance: 'invisible', path: 'docs/b.md' };
      const recognised = false;
      // ACT
      const actual = isConfigError(invisible);
      // ASSERT
      expect(actual).toBe(recognised);
    });
  });

  describe('edge cases', () => {
    it('keys on presence rather than value, so an undefined error still narrows', () => {
      // A sibling result never carries the key at all, so presence is the whole
      // test. Keying on the literal would make the guard disagree with its own
      // doc comment the moment a fault list arrived with no code.
      // ARRANGE
      const undefinedError = { error: undefined };
      const recognised = true;
      // ACT
      const actual = isConfigError(undefinedError);
      // ASSERT
      expect(actual).toBe(recognised);
    });

    it('claims nothing from an empty object', () => {
      // ARRANGE
      const empty = {};
      const recognised = false;
      // ACT
      const actual = isConfigError(empty);
      // ASSERT
      expect(actual).toBe(recognised);
    });
  });
});
