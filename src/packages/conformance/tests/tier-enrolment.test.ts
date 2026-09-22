// The enrolment check: every tier has a runner, and every runner has a tier.
//
// Both sides are derived from the tree rather than listed, so the failure this
// produces is the one that matters — a tier whose fixtures were committed and
// whose runner was never written, which would otherwise be invisible. The gate
// would stay green over a specification nothing enumerates.
//
// This file is NOT a runner. `tier-enrolment.test.ts` does not end in
// `-tier.test.ts`, which is what keeps it out of the set it derives.

import { describe, expect, it } from 'vitest';
import { declaredTierNames, enrolledTiers, tierRunners } from '../tier-enrolment.ts';

/** The tier the second Module brings, named so its absence can be asserted. */
const INTEGRATED = 'integrated';

describe('tier enrolment', () => {
  describe('success cases', () => {
    it('derives fixtures and runners from the declared tier set', () => {
      // ARRANGE
      const declared = [...declaredTierNames()];
      // ACT
      const actual = { fixtures: [...enrolledTiers()], runners: [...tierRunners()] };
      // ASSERT
      expect(actual).toEqual({ fixtures: declared, runners: declared });
    });
  });

  describe('failure cases', () => {
    it('leaves no tier without a runner', () => {
      // The direction the check exists for, named separately from the equality
      // above so the failure message says which tier went unenrolled rather
      // than printing two lists and leaving the reader to diff them.
      // ARRANGE
      const claimed = new Set(tierRunners());
      const none: readonly string[] = [];
      // ACT
      const unenrolled = enrolledTiers().filter((tier) => !claimed.has(tier));
      // ASSERT
      expect(unenrolled).toEqual(none);
    });

    it('leaves no runner without a tier', () => {
      // ARRANGE
      const present = new Set(enrolledTiers());
      const none: readonly string[] = [];
      // ACT
      const orphaned = tierRunners().filter((tier) => !present.has(tier));
      // ASSERT
      expect(orphaned).toEqual(none);
    });
  });

  describe('edge cases', () => {
    it('derives both sets from the tree, so the comparison cannot pass over nothing', () => {
      // Two empty lists are equal. Without this, a fixtures root that moved and
      // a tests folder that moved would agree perfectly and prove nothing.
      // ARRANGE
      const empty = 0;
      // ACT
      const counted = { tiers: enrolledTiers().length, runners: tierRunners().length };
      // ASSERT
      expect(counted.tiers).toBeGreaterThan(empty);
      expect(counted.runners).toBeGreaterThan(empty);
    });

    it('leaves the integrated tier absent on both sides, so it cannot arrive on one', () => {
      // A corpus two Modules govern at once cannot be written while one Module
      // exists, so the tier arrives with the second. Its absence is derived
      // from the same two sets rather than recorded as a gap: whichever side it
      // lands on first, the equality above goes red and the other side has to
      // be written before the suite is green again.
      // ARRANGE
      const absentFromBoth = { tier: false, runner: false };
      // ACT
      const actual = { tier: enrolledTiers().includes(INTEGRATED), runner: tierRunners().includes(INTEGRATED) };
      // ASSERT
      expect(actual).toEqual(absentFromBoth);
    });
  });
});
