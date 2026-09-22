// Unit suite for the marker grammar, against bodies written here.
//
// Nothing in this file opens a committed Conformance case. A test that read one
// would pass or fail on a contract it has no business asserting, and would make
// the corpus editable to keep a unit green.

import { describe, expect, it } from 'vitest';
import { assessMarkersIn, expectMarkersIn } from './marker-scan.pure.ts';

describe('expectMarkersIn', () => {
  describe('success cases', () => {
    it('reads the verdict a case states', () => {
      // ARRANGE
      const body = '---\ntype: reference\n---\n\n<!-- expect: PASSES -->\n\nClosed key set.\n';
      const stated = ['PASSES'];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });

    it('reads a marker written without surrounding spaces', () => {
      // An author who writes `<!--expect: FAILS-->` has stated a verdict. A
      // scanner that could not see it would report a missing marker on a case
      // that carries one, and the reasoning paragraph beneath would go unread.
      // ARRANGE
      const body = '<!--expect: FAILS-->\n';
      const stated = ['FAILS'];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });
  });

  describe('failure cases', () => {
    it('reads no marker out of a case that carries none', () => {
      // ARRANGE
      const body = '---\ntype: reference\n---\n\nNo claim at all.\n';
      const none: readonly string[] = [];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(none);
    });

    it('reads both markers when a case carries two, so the caller can refuse', () => {
      // The cardinality is the caller's to enforce; answering with the first
      // would hide the second and let a case state two contracts at once.
      // ARRANGE
      const body = '<!-- expect: PASSES -->\n\nBody.\n\n<!-- expect: FAILS -->\n';
      const stated = ['PASSES', 'FAILS'];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });

    it('reads a verdict outside the vocabulary rather than dropping it', () => {
      // ARRANGE
      const body = '<!-- expect: MAYBE -->\n';
      const stated = ['MAYBE'];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });
  });

  describe('edge cases', () => {
    it('never reads an assess marker as an expect marker', () => {
      // The two regexes each name their own keyword, which is why ARCH-002's
      // second marker needed no change to the first rule.
      // ARRANGE
      const body = '<!-- assess: REVIEW -->\n';
      const none: readonly string[] = [];
      // ACT
      const actual = expectMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(none);
    });

    it('leaves the regex usable twice, so a second case is not skipped', () => {
      // A `g` regex held at module scope carries `lastIndex`. `matchAll` works
      // on a clone and leaves it alone — asserted rather than assumed, because
      // the failure it would cause is every other case reading as unmarked.
      // ARRANGE
      const body = '<!-- expect: UNGOVERNED -->\n';
      const twice = [['UNGOVERNED'], ['UNGOVERNED']];
      // ACT
      const actual = [expectMarkersIn(body), expectMarkersIn(body)];
      // ASSERT
      expect(actual).toEqual(twice);
    });
  });
});

describe('assessMarkersIn', () => {
  describe('success cases', () => {
    it('reads the agent action a case states', () => {
      // ARRANGE
      const body = '<!-- expect: PASSES -->\n<!-- assess: REVIEW -->\n';
      const stated = ['REVIEW'];
      // ACT
      const actual = assessMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });
  });

  describe('failure cases', () => {
    it('reads both actions when a case carries two', () => {
      // ARRANGE
      const body = '<!-- assess: REVIEW -->\n\nBody.\n\n<!-- assess: PROCEED -->\n';
      const stated = ['REVIEW', 'PROCEED'];
      // ACT
      const actual = assessMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(stated);
    });
  });

  describe('edge cases', () => {
    it('reads nothing where absence is legal', () => {
      // Zero is the one difference from `expect:`, and most of this corpus
      // makes no freshness claim at all.
      // ARRANGE
      const body = '<!-- expect: PASSES -->\n\nNo freshness claim here.\n';
      const none: readonly string[] = [];
      // ACT
      const actual = assessMarkersIn(body);
      // ASSERT
      expect(actual).toEqual(none);
    });
  });
});
