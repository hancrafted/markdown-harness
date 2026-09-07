// Colocated unit test for the three named formats.
//
// Form only, and that means no calendar arithmetic: the datetime cases below
// deliberately include a date that does not exist and expect it to pass. A
// validator that reached for `Date` would fail it, and would be checking
// something this constraint does not claim.

import { describe, expect, it } from 'vitest';
import { matchesFormat } from './value-format.pure';

describe('named formats', () => {
  describe('success cases', () => {
    it.each([
      '2026-08-25T09:00:00Z',
      '2026-08-25T11:30:00z',
      '2026-08-25t09:00:00Z',
      '2026-08-25T09:00:00.123Z',
      '2026-08-25T09:00:00+02:00',
      '2026-08-25T09:00:00-05:30',
    ])('accepts %s as a datetime', (value) => {
      // ARRANGE
      const wellFormed = true;
      // ACT
      const actual = matchesFormat('datetime', value);
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it.each(['docs/okf/SPEC-v0.2.md', 'https://example.invalid/survey', 's3://bucket/key.parquet', './relative'])(
      'accepts %s as a uri',
      (value) => {
        // ARRANGE
        const wellFormed = true;
        // ACT
        const actual = matchesFormat('uri', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each(['human:hancrafted', 'process:nightly-export', 'claude-opus/5', 'human:okf-authors'])(
      'accepts %s as an actor',
      (value) => {
        // ARRANGE
        const wellFormed = true;
        // ACT
        const actual = matchesFormat('actor', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );
  });

  describe('failure cases', () => {
    it.each(['yesterday', '2026-08-24', '2026-08-25T09:00:00', '2026-08-25T09:00Z', '', '2026-08-25 09:00:00Z'])(
      'rejects %s as a datetime',
      (value) => {
        // ARRANGE
        const wellFormed = false;
        // ACT
        const actual = matchesFormat('datetime', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );

    it.each(['has a space in it', '', '   ', 's3://bucket/quarterly usage.parquet'])('rejects %s as a uri', (value) => {
      // ARRANGE
      const wellFormed = false;
      // ACT
      const actual = matchesFormat('uri', value);
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it.each(['human/hancrafted', 'process/nightly', 'claude/opus/5', 'noslash', '/5', 'claude-opus/', 'human:', ''])(
      'rejects %s as an actor',
      (value) => {
        // ARRANGE
        const wellFormed = false;
        // ACT
        const actual = matchesFormat('actor', value);
        // ASSERT
        expect(actual).toBe(wellFormed);
      },
    );
  });

  describe('edge cases', () => {
    it('accepts a date that never happened, because form is all this checks', () => {
      // `2026-02-30` is not a day. It is well-FORMED, which is the whole of what
      // `format: datetime` claims, and the spec says so outright.
      // ARRANGE
      const wellFormed = true;
      // ACT
      const actual = matchesFormat('datetime', '2026-02-30T00:00:00Z');
      // ASSERT
      expect(actual).toBe(wellFormed);
    });

    it('rejects a month-13 date for want of a time and an offset, not for the month', () => {
      // The same reading from the other side: what fails here is the missing
      // time and offset. Adding them would make month 13 pass.
      // ARRANGE
      const bare = false;
      const stamped = true;
      // ACT
      const withoutTime = matchesFormat('datetime', '2026-13-45');
      const withTime = matchesFormat('datetime', '2026-13-45T00:00:00Z');
      // ASSERT
      expect(withoutTime).toBe(bare);
      expect(withTime).toBe(stamped);
    });

    it('reserves the two colon-form producers from the slash form', () => {
      // The rule that was previously discoverable only by reading a fixture.
      // ARRANGE
      const reserved = false;
      const ordinary = true;
      // ACT
      const asSlash = matchesFormat('actor', 'human/hancrafted');
      const asColon = matchesFormat('actor', 'human:hancrafted');
      const tool = matchesFormat('actor', 'human-review/2');
      // ASSERT
      expect(asSlash).toBe(reserved);
      expect(asColon).toBe(ordinary);
      expect(tool).toBe(ordinary);
    });
  });
});
