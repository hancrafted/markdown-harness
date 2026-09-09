// Colocated unit test for the freshness judgement.
//
// Every instant in this file is written out by hand. Nothing here reads a
// clock, which is the property under test as much as the comparison is.

import { describe, expect, it } from 'vitest';
import { freshnessOf } from './freshness.pure';

const NOW = '2026-12-01T00:00:00Z';

/** A document whose freshness claim is whatever is passed in. */
function documentClaiming(staleAfter: string): string {
  return `---\ntitle: YAML\nstale_after: ${staleAfter}\n---\n\nBody.\n`;
}

describe('freshnessOf', () => {
  describe('success cases', () => {
    it('reports a claim that has run out as stale, with what it read', () => {
      // ARRANGE
      const expired = '2026-11-24T00:00:00Z';
      const expected = { state: 'stale', evidence: { field: 'stale_after', value: expired } };
      // ACT
      const actual = freshnessOf(documentClaiming(expired), NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a claim that still holds as fresh, with what it read', () => {
      // ARRANGE
      const holding = '2027-01-01T00:00:00Z';
      const expected = { state: 'fresh', evidence: { field: 'stale_after', value: holding } };
      // ACT
      const actual = freshnessOf(documentClaiming(holding), NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a governed file that made no claim as unassessable, never as fresh', () => {
      // The distinction the whole state exists for: a file with no
      // `stale_after` has said nothing, and saying nothing is not the same as
      // saying it is current.
      // ARRANGE
      const silent = '---\ntitle: YAML\n---\n\nBody.\n';
      const expected = { state: 'unassessable' };
      // ACT
      const actual = freshnessOf(silent, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every other way a file declines to answer as unassessable', () => {
      // No frontmatter at all, an unterminated block, a claim written empty,
      // one that is not a string, and one that names no moment.
      // ARRANGE
      const declining = [
        'Just prose.\n',
        '---\ntitle: YAML\n',
        documentClaiming(''),
        '---\nstale_after: [2026-11-24T00:00:00Z]\n---\n',
        documentClaiming('whenever'),
      ];
      const expected = [
        { state: 'unassessable' },
        { state: 'unassessable' },
        { state: 'unassessable' },
        { state: 'unassessable' },
        { state: 'unassessable' },
      ];
      // ACT
      const actual = declining.map((text) => freshnessOf(text, NOW));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('treats the boundary instant as stale, because the date names the expiry', () => {
      // `stale_after` names the moment the claim expires rather than the last
      // moment it holds, so equality belongs to the expiry.
      // ARRANGE
      const expected = 'stale';
      // ACT
      const actual = freshnessOf(documentClaiming(NOW), NOW).state;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('compares instants rather than strings, so offsets cannot invert the answer', () => {
      // `2026-12-01T01:00:00+02:00` sorts AFTER the `Z` instant alphabetically
      // and names 23:00 the previous day, so a string comparison would call
      // this fresh. It is stale.
      // ARRANGE
      const offsetClaim = '2026-12-01T01:00:00+02:00';
      const expected = 'stale';
      // ACT
      const actual = freshnessOf(documentClaiming(offsetClaim), NOW).state;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
