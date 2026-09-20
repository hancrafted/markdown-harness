// Unit suite for the tier/runner naming convention.
//
// It proves the LOGIC of the pairing and can prove nothing about its reach:
// whether the convention actually meets the tree is what
// `tests/tier-enrolment.test.ts` measures, against the real directories.

import { describe, expect, it } from 'vitest';
import { runnerFileFor, tierOfRunnerFile } from './tier-name.pure.ts';

describe('tier naming', () => {
  describe('success cases', () => {
    it('names the runner a tier must be checked by', () => {
      // ARRANGE
      const tier = 'frontmatter';
      const runner = 'frontmatter-tier.test.ts';
      // ACT
      const actual = runnerFileFor(tier);
      // ASSERT
      expect(actual).toBe(runner);
    });

    it('reads the tier back off the runner it named', () => {
      // Round trip rather than two literals: the two halves are what must
      // agree, and asserting each against its own spelling would let them
      // agree with the test while disagreeing with each other.
      // ARRANGE
      const tier = 'rejected-config';
      // ACT
      const actual = tierOfRunnerFile(runnerFileFor(tier));
      // ASSERT
      expect(actual).toBe(tier);
    });
  });

  describe('failure cases', () => {
    it('claims no tier for a neighbour that is not a runner', () => {
      // ARRANGE
      const neighbour = 'tier-enrolment.test.ts';
      // ACT
      const actual = tierOfRunnerFile(neighbour);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('claims no tier for a file whose name only ends in .test.ts', () => {
      // ARRANGE
      const neighbour = 'case-marker.test.ts';
      // ACT
      const actual = tierOfRunnerFile(neighbour);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('claims no tier for the suffix standing alone', () => {
      // `-tier.test.ts` names the empty tier. A directory cannot be named
      // that, so reading one out would be a runner enrolled against nothing.
      // ARRANGE
      const bare = '-tier.test.ts';
      // ACT
      const actual = tierOfRunnerFile(bare);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('keeps a hyphenated tier whole', () => {
      // ARRANGE
      const runner = 'rejected-config-tier.test.ts';
      const tier = 'rejected-config';
      // ACT
      const actual = tierOfRunnerFile(runner);
      // ASSERT
      expect(actual).toBe(tier);
    });
  });
});
