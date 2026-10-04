// Colocated unit test for the spine walk: `heading` entries claimed one heading
// each, `enumeration` entries owning a run, and every leftover given to the
// first rule that fits (design-ADR 0017).

import { describe, expect, it } from 'vitest';
import type { HeadingEntry } from '../../section.ts';
import { headingEntryViolations } from './heading-entries.pure.ts';

const TITLE: HeadingEntry = { purpose: 'heading', level: 1 };
const FINDINGS: HeadingEntry = {
  purpose: 'heading',
  level: 2,
  pattern: '^Findings$',
  intent: 'What was measured, with numbers.',
};
const SOURCES: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^Source: ', minCount: 1, maxCount: 2 };
const OPTIONAL: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Consequences$', presence: 'optional' };
const ANY_PARTS: HeadingEntry = { purpose: 'enumeration', level: 2, minCount: 0 };
const CONCLUSION: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Conclusion$' };

const h = (level: number, content: string) => ({ level, content });

describe('headingEntryViolations', () => {
  describe('success cases', () => {
    it('claims every heading entry in order and counts the repeats of an enumeration', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Findings'), h(3, 'Detail'), h(2, 'Source: One'), h(2, 'Source: Two')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingEntryViolations([TITLE, FINDINGS, SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets headings no later entry claims interleave an enumeration run', () => {
      // ARRANGE
      const outline = [h(2, 'Source: One'), h(3, 'Aside'), h(2, 'Other'), h(2, 'Source: Two')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingEntryViolations([SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets an enumeration yield to a later heading entry, so an unpatterned run ends before the Conclusion', () => {
      // ARRANGE
      const outline = [h(1, 'Title'), h(2, 'A'), h(2, 'B'), h(2, 'Conclusion')];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingEntryViolations([TITLE, ANY_PARTS, CONCLUSION], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a required heading entry with no matching heading as missing, entry verbatim', () => {
      // ARRANGE
      const outline = [h(1, 'Report'), h(2, 'Source: One')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS }];
      // ACT
      const actual = headingEntryViolations([TITLE, FINDINGS, SOURCES], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a heading entry whose only match sits before the cursor as out of order, never as missing', () => {
      // ARRANGE
      const source: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Source: ' };
      const outline = [h(1, 'Report'), h(2, 'Source: One'), h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER', entry: 2, requirement: source }];
      // ACT
      const actual = headingEntryViolations([TITLE, FINDINGS, source], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a second heading a heading entry matches as repeated, with found one plus the repeats', () => {
      // ARRANGE
      const outline = [h(1, 'One'), h(1, 'Two'), h(1, 'Three')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_REPEATED', entry: 0, found: 3, requirement: TITLE }];
      // ACT
      const actual = headingEntryViolations([TITLE], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an enumeration below its minimum and above its maximum with found counted', () => {
      // ARRANGE
      const none = [h(1, 'Report')];
      const three = [h(2, 'Source: A'), h(2, 'Source: B'), h(2, 'Source: C')];
      const expected = [
        ['BODY_STRUCTURE__ENUMERATION_BELOW_MINIMUM', 0],
        ['BODY_STRUCTURE__ENUMERATION_ABOVE_MAXIMUM', 3],
      ];
      // ACT
      const actual = [none, three].map((outline) => {
        const [violation] = headingEntryViolations([SOURCES], outline);
        return [violation?.violation, violation !== undefined && 'found' in violation ? violation.found : -1];
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a repeat outside its run as out of order and still counts it, never as missing', () => {
      // ARRANGE
      const outline = [h(2, 'Conclusion'), h(2, 'Part')];
      const parts: HeadingEntry = { purpose: 'enumeration', level: 2, pattern: '^Part', minCount: 1 };
      const expected = ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER'];
      // ACT
      const actual = headingEntryViolations([parts, CONCLUSION], outline).map((v) => v.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('stays silent for an absent optional heading entry but reports a misplaced one as out of order', () => {
      // ARRANGE
      const absent = [h(2, 'Findings')];
      const misplaced = [h(2, 'Consequences'), h(2, 'Findings')];
      const expected = [[], ['BODY_STRUCTURE__HEADING_OUT_OF_ORDER']];
      // ACT
      const actual = [absent, misplaced].map((outline) =>
        headingEntryViolations([FINDINGS, OPTIONAL], outline).map((v) => v.violation),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('searches a pattern and never anchors it, case-sensitively', () => {
      // ARRANGE
      const contains: HeadingEntry = { purpose: 'heading', level: 2, pattern: 'ecis' };
      const expected = [[], [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 0, requirement: contains }]];
      // ACT
      const actual = [[h(2, 'A Decision')], [h(2, 'DECISION')]].map((outline) =>
        headingEntryViolations([contains], outline),
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches greedily: an earlier unpatterned entry takes the first match a later entry needed', () => {
      // ARRANGE
      const any2: HeadingEntry = { purpose: 'heading', level: 2 };
      const outline = [h(2, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 1, requirement: FINDINGS }];
      // ACT
      const actual = headingEntryViolations([any2, FINDINGS], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('matches an entry only at its own level', () => {
      // ARRANGE
      const outline = [h(3, 'Findings')];
      const expected = [{ violation: 'BODY_STRUCTURE__HEADING_MISSING', entry: 0, requirement: FINDINGS }];
      // ACT
      const actual = headingEntryViolations([FINDINGS], outline);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports nothing for a Rule that writes no headings', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = headingEntryViolations(undefined, [h(1, 'x')]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
