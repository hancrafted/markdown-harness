// The six states a file can be in when the generator reaches it.
//
// The markers are written out as literals here rather than imported, because a
// colocated test may reach only its same-name sibling. That is a constraint
// worth having twice over in this file: if the marker bytes ever move, this
// suite fails on its own terms rather than silently following them.

import { describe, expect, it } from 'vitest';
import { spliceRegion } from './region-splice.pure.ts';

const START = '<!-- indexes:start -->';
const END = '<!-- indexes:end -->';

/** A region as the renderer would hand one over: markers, in-band comment, one entry. */
const REGION = [START, '<!-- generated -->', '', '- [a](a.md) - One entry.', '', END];

describe('spliceRegion', () => {
  describe('success cases', () => {
    it('rewrites the span between an existing pair and touches nothing outside it', () => {
      // The adopter's prose above the start marker and below the end marker is
      // the whole point of a marked region rather than a generated file.
      // ARRANGE
      const existing = [
        '# Title',
        '',
        'Mine, above.',
        '',
        START,
        '',
        '- [old](old.md)',
        '',
        END,
        '',
        'Mine, below.',
        '',
      ].join('\n');
      const expected = ['# Title', '', 'Mine, above.', '', ...REGION, '', 'Mine, below.', ''].join('\n');
      const regenerated = 'regenerated';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.text).toBe(expected);
      expect(actual.outcome).toBe(regenerated);
      expect(actual.warnings).toEqual([]);
    });

    it('appends a pair at end of file when the file carries no marker at all', () => {
      // ARRANGE
      const existing = ['# Title', '', 'Only prose.', ''].join('\n');
      const expected = ['# Title', '', 'Only prose.', '', ...REGION, ''].join('\n');
      const appended = 'appended';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.text).toBe(expected);
      expect(actual.outcome).toBe(appended);
    });

    it('creates the file from the shipped template when none exists', () => {
      // Creation is scaffolding, not ownership: everything above the start
      // marker is the adopter's from the moment the file exists. The template's
      // own sample entry must be gone, replaced by the real list.
      // ARRANGE
      const heading = '# Index';
      const sample = 'okf-conformance';
      const realEntry = '- [a](a.md) - One entry.';
      const created = 'created';
      // ACT
      const actual = spliceRegion(undefined, REGION);
      // ASSERT
      expect(actual.outcome).toBe(created);
      expect(actual.text).toContain(heading);
      expect(actual.text).toContain(realEntry);
      expect(actual.text).not.toContain(sample);
    });
  });

  describe('failure cases', () => {
    it('refuses a file holding two well-formed pairs rather than choosing one', () => {
      // Nothing is damaged, so healing does not apply. Choosing would be a
      // guess about intent, and the file is left exactly as it was.
      // ARRANGE
      const existing = [START, END, '', START, END, ''].join('\n');
      const repeated = 'REGION_PAIR_REPEATED';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.refusal).toBe(repeated);
      expect(actual.text).toBeUndefined();
    });

    it('refuses an unterminated start marker, which can be reported but not healed', () => {
      // ARRANGE
      const existing = ['# Title', '', '<!-- indexes:start', '', '- [a](a.md)', ''].join('\n');
      const unterminated = 'REGION_START_UNTERMINATED';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.refusal).toBe(unterminated);
      expect(actual.text).toBeUndefined();
    });

    it('refuses an end marker sitting above a start marker, because there is no span', () => {
      // ARRANGE
      const existing = ['# Title', '', END, '', START, ''].join('\n');
      const crossed = 'REGION_MARKERS_CROSSED';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.refusal).toBe(crossed);
      expect(actual.text).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('heals a lone start marker by deleting it and appending a fresh pair, keeping the orphan', () => {
      // Non-destructiveness is what makes healing safe, not determinism. The
      // orphaned list stays in the file for a human to remove.
      // ARRANGE
      const orphan = '- [orphaned](orphaned.md)';
      const existing = ['# Title', '', START, '', orphan, ''].join('\n');
      const healed = 'healed';
      const traced = ['REGION_MARKER_HALF_DELETED'];
      // ACT
      const actual = spliceRegion(existing, REGION);
      const survivingStarts = (actual.text ?? '').split(START).length - 1;
      // ASSERT
      expect(actual.outcome).toBe(healed);
      expect(actual.warnings).toEqual(traced);
      expect(actual.text).toContain(orphan);
      expect(survivingStarts).toBe(1);
    });

    it('heals a lone end marker on exactly the same terms', () => {
      // The rule is about a half-deleted PAIR, not about which half survived,
      // and reusing the one append path is why it can be stated once.
      // ARRANGE
      const orphan = '- [orphaned](orphaned.md)';
      const existing = ['# Title', '', orphan, '', END, ''].join('\n');
      const healed = 'healed';
      const traced = ['REGION_MARKER_HALF_DELETED'];
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.outcome).toBe(healed);
      expect(actual.warnings).toEqual(traced);
      expect(actual.text).toContain(orphan);
    });

    it('honours a region an adopter has moved, rather than pinning it to end of file', () => {
      // Appending happens ONCE. From the second run the pair is found wherever
      // it sits, which is what makes "everything after the end marker is yours"
      // survive the adopter rearranging their own file.
      // ARRANGE
      const moved = [
        '# Title',
        '',
        START,
        '',
        '- [old](old.md)',
        '',
        END,
        '',
        'Prose the adopter moved below.',
        '',
      ].join('\n');
      const expected = ['# Title', '', ...REGION, '', 'Prose the adopter moved below.', ''].join('\n');
      // ACT
      const actual = spliceRegion(moved, REGION);
      // ASSERT
      expect(actual.text).toBe(expected);
    });

    it('ends every file it writes with exactly one newline and no blank line before it', () => {
      // Measured, not reasoned: the first run of the planner stacked a blank
      // line on creation, because splitting a newline-terminated file yields a
      // trailing empty element. Prettier strips it, so leaving it in would make
      // every created file something this repo's own gate rewrites.
      // ARRANGE
      const existing = ['# Title', '', '', '', ''].join('\n');
      const oneNewline = '\n';
      const blankBefore = '\n\n';
      // ACT
      const actual = spliceRegion(existing, REGION);
      // ASSERT
      expect(actual.text?.endsWith(oneNewline)).toBe(true);
      expect(actual.text?.endsWith(blankBefore)).toBe(false);
    });

    it('produces identical bytes from identical input, which is B4', () => {
      // ARRANGE
      const existing = ['# Title', '', START, '', '- [old](old.md)', '', END, ''].join('\n');
      // ACT
      const once = spliceRegion(existing, REGION);
      const twice = spliceRegion(once.text, REGION);
      // ASSERT
      expect(twice.text).toBe(once.text);
    });
  });
});
