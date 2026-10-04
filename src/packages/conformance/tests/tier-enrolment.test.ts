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

/** The tier the second Module brings, named so its arrival on both sides can be asserted. */
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

    it('holds the integrated tier on both sides, so it cannot leave by one', () => {
      // A corpus two Modules govern at once could not be written while one
      // Module existed, so the tier arrived with the second (#220). This used to
      // assert its absence from both sets; it now asserts its presence in both,
      // so deleting the fixtures or the runner alone goes red here by name
      // rather than only through the equality above.
      // ARRANGE
      const presentInBoth = { tier: true, runner: true };
      // ACT
      const actual = { tier: enrolledTiers().includes(INTEGRATED), runner: tierRunners().includes(INTEGRATED) };
      // ASSERT
      expect(actual).toEqual(presentInBoth);
    });
  });
});
