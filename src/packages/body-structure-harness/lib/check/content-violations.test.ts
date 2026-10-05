// Colocated unit test for the section-content check: given each entry and the
// sections it claimed, which blocks does its `mayHold` not list.
//
// The walk that decides which sections an entry claimed is `bodyViolations`'s
// and is tested there; this file states only what is reported for a claim.

import { describe, expect, it } from 'vitest';
import type { BlockKind, HeadingEntry } from '../../section.ts';
import { contentViolations } from './content-violations.pure.ts';

const PROSE_ONLY: HeadingEntry = { purpose: 'heading', level: 2, pattern: '^Context$', mayHold: ['prose'] };
const STEPS: HeadingEntry = {
  purpose: 'enumeration',
  level: 3,
  pattern: '^[0-9]+\\. ',
  minCount: 1,
  mayHold: ['ordered-list'],
};

const section = (content: string, ...blocks: BlockKind[]) => ({ heading: { level: 2, content }, blocks });

describe('contentViolations', () => {
  describe('success cases', () => {
    it('admits any mix, order and count of the listed kinds', () => {
      // ARRANGE
      const entry: HeadingEntry = { ...PROSE_ONLY, mayHold: ['prose', 'ordered-list'] };
      const expected: readonly unknown[] = [];
      // ACT
      const actual = contentViolations([
        {
          entry,
          locator: { entry: [0] },
          sections: [section('Context', 'ordered-list', 'prose', 'prose', 'ordered-list', 'prose')],
        },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('leaves an entry that writes no mayHold unconstrained', () => {
      // ARRANGE
      const entry: HeadingEntry = { purpose: 'heading', level: 2 };
      const expected: readonly unknown[] = [];
      // ACT
      const actual = contentViolations([
        { entry, locator: { entry: [0] }, sections: [section('Any', 'prose', 'ordered-list', 'unordered-list')] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('passes an empty section, and an entry that claimed no section at all', () => {
      // ARRANGE
      const expected: readonly unknown[] = [];
      // ACT
      const actual = contentViolations([
        { entry: PROSE_ONLY, locator: { entry: [0] }, sections: [section('Context')] },
        { entry: STEPS, locator: { entry: [1] }, sections: [] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a kind the entry does not list once, with its count, naming the section and carrying the entry verbatim', () => {
      // ARRANGE
      const expected = [
        {
          violation: 'BODY_STRUCTURE__BLOCK_KIND_NOT_ALLOWED',
          entry: [4],
          content: 'Context',
          kind: 'unordered-list',
          found: 2,
          requirement: PROSE_ONLY,
        },
      ];
      // ACT
      const actual = contentViolations([
        {
          entry: PROSE_ONLY,
          locator: { entry: [4] },
          sections: [section('Context', 'prose', 'unordered-list', 'prose', 'unordered-list')],
        },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('judges an enumeration on each repeat section, one report per repeat', () => {
      // ARRANGE
      const expected = ['1. One', '3. Three'];
      // ACT
      const actual = contentViolations([
        {
          entry: STEPS,
          locator: { entry: [1] },
          sections: [
            section('1. One', 'prose'),
            section('2. Two', 'ordered-list'),
            section('3. Three', 'unordered-list'),
          ],
        },
      ]).map((violation) => ('content' in violation ? violation.content : undefined));
      // ASSERT
      expect(actual).toEqual(expected);
    });
    it('reports each offending kind of a section in the order it first appears', () => {
      // ARRANGE
      const expected = [
        ['unordered-list', 1],
        ['ordered-list', 2],
      ];
      // ACT
      const actual = contentViolations([
        {
          entry: PROSE_ONLY,
          locator: { entry: [0] },
          sections: [section('Context', 'prose', 'unordered-list', 'ordered-list', 'ordered-list')],
        },
      ]).map((violation) => ('kind' in violation ? [violation.kind, violation.found] : []));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('orders findings by claim, then section in document order, then kind, each carrying its locator', () => {
      // ARRANGE
      const expected = [
        [[0], undefined, 'A', 'ordered-list'],
        [[0], undefined, 'B', 'ordered-list'],
        [[2, 1], 'Parent', 'C', 'unordered-list'],
      ];
      // ACT
      const actual = contentViolations([
        {
          entry: PROSE_ONLY,
          locator: { entry: [0] },
          sections: [section('A', 'ordered-list'), section('B', 'ordered-list')],
        },
        { entry: PROSE_ONLY, locator: { entry: [2, 1], under: 'Parent' }, sections: [section('C', 'unordered-list')] },
      ]).map((violation) =>
        'kind' in violation ? [violation.entry, violation.under, violation.content, violation.kind] : [],
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports a section of thirty bullets as one finding', () => {
      // ARRANGE
      const expected = [30];
      // ACT
      const actual = contentViolations([
        {
          entry: PROSE_ONLY,
          locator: { entry: [0] },
          sections: [section('Context', ...Array.from({ length: 30 }, () => 'unordered-list' as const))],
        },
      ]).map((violation) => ('found' in violation ? violation.found : undefined));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
