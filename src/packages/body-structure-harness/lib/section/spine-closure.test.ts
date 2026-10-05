// Colocated unit test for the two questions about a Rule's `undefinedHeadings`
// key, asked alike of a typed Rule and of YAML as written.

import { describe, expect, it } from 'vitest';
import { closesSpine, writesClosureBeyondDefault } from './spine-closure.pure.ts';

describe('spine closure', () => {
  describe('success cases', () => {
    it('closes the spine on forbid and on nothing else', () => {
      // ARRANGE
      const expected = [true, false, false, false];
      // ACT
      const actual = [
        { undefinedHeadings: 'forbid' },
        { undefinedHeadings: 'allow' },
        { undefinedHeadings: 'Forbid' },
        {},
      ].map(closesSpine);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('writes a closure beyond the default for forbid, but not for allow or no key', () => {
      // ARRANGE
      const expected = [true, false, false];
      // ACT
      const actual = [{ undefinedHeadings: 'forbid' }, { undefinedHeadings: 'allow' }, {}].map(
        writesClosureBeyondDefault,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('counts an invalid value as written beyond the default, though it closes nothing', () => {
      // ARRANGE
      const invalid = { undefinedHeadings: 'forbidden' };
      const expected = { closes: false, beyond: true };
      // ACT
      const actual = { closes: closesSpine(invalid), beyond: writesClosureBeyondDefault(invalid) };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts a key written with nothing after it as written beyond the default', () => {
      // ARRANGE
      const blank = { undefinedHeadings: null };
      const expected = { closes: false, beyond: true };
      // ACT
      const actual = { closes: closesSpine(blank), beyond: writesClosureBeyondDefault(blank) };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a Rule straight off the YAML as a record of unknowns', () => {
      // ARRANGE
      const yaml: Record<string, unknown> = { undefinedHeadings: 'forbid' };
      const expected = [true, true];
      // ACT
      const actual = [closesSpine(yaml), writesClosureBeyondDefault(yaml)];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
