// The rejected-config tier's runner.
//
// The tier exists and holds no cases yet. That is a state, not an oversight:
// this ticket splits the corpus into tiers and issue #158 fills this one with
// config bytes a load must refuse, each frozen against the whole config-error
// response.
//
// So this runner asserts the state rather than looping over nothing. The
// `it.each` a filled tier wants would pass vacuously today, and a vacuous green
// here is exactly what the enrolment check beside it exists to stop one level
// up. The emptiness assertion goes red on the first case directory committed,
// which is what hands #158 a red suite to write the real runner against.

import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { caseDirectoriesIn, casesIn, conformanceRoot, tierRoot } from '../case-corpus.ts';

const REJECTED_CONFIG = 'rejected-config';

describe('the rejected-config tier', () => {
  describe('success cases', () => {
    it('points at its own tier rather than at the directory holding every tier', () => {
      // The whole reason the corpus moved. A runner pointed one level up reads
      // every tier's files as its own, and for the tier next door that means
      // reading its cases with the wrong prefix rather than failing.
      // ARRANGE
      const expected = join(conformanceRoot(), REJECTED_CONFIG) + sep;
      // ACT
      const actual = tierRoot(REJECTED_CONFIG);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('holds no markdown, so no Conformance case can be filed here by mistake', () => {
      // A rejected config produces no document. A case here is a DIRECTORY —
      // config bytes under the adopter's own config filename plus one frozen
      // expectation — which is also why ARCH-002's case glob stops at
      // `<tier>/docs/**/*.md` and never reaches this tier.
      // ARRANGE
      const noMarkdown: readonly string[] = [];
      // ACT
      const actual = [...casesIn(REJECTED_CONFIG)];
      // ASSERT
      expect(actual).toEqual(noMarkdown);
    });
  });

  describe('edge cases', () => {
    it('holds no case directories yet, so the first one committed turns this red', () => {
      // https://github.com/hancrafted/markdown-harness/issues/158 fills the
      // tier and replaces this test with the coverage-and-closure loop over the
      // fault catalog. Until then the tier is enrolled, reachable and empty,
      // and this is the sentence that says so out loud.
      // ARRANGE
      const noCasesYet: readonly string[] = [];
      // ACT
      const actual = [...caseDirectoriesIn(REJECTED_CONFIG)];
      // ASSERT
      expect(actual).toEqual(noCasesYet);
    });
  });
});
