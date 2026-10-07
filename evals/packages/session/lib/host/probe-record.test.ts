// Colocated unit test for the probe record: the file the probe tool writes and the profile reads, so that a probe
// outcome changes behaviour without anyone editing source.

import { describe, expect, it } from 'vitest';
import { earlierProbesMissing, parseProbeRecord, serialiseProbeRecord, withProbe } from './probe-record.pure.ts';

const WORKS = { status: 'works', detail: 'a sentinel file appeared', recordedAt: '2026-10-07T10:00:00.000Z' } as const;

/** Whether the parse named a problem, which is a sentence rather than a record. */
const isProblem = (parsed: unknown): boolean => typeof parsed === 'string';

describe('parseProbeRecord', () => {
  describe('success cases', () => {
    it('reads what the serialiser wrote', () => {
      // ARRANGE
      const record = withProbe({}, 'hook-fires-headless', WORKS);
      // ACT
      const actual = parseProbeRecord(serialiseProbeRecord(record));
      // ASSERT
      expect(actual).toEqual(record);
    });

    it('reads the mode and the permission mode of a scoped permission result', () => {
      // ARRANGE
      const result = { ...WORKS, mode: 'accept-edits', permissionMode: 'accept-edits' };
      const text = JSON.stringify({ 'scoped-permission-mode': result });
      const expected = { 'scoped-permission-mode': result };
      // ACT
      const actual = parseProbeRecord(text);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names a probe id it does not know, so a typo is not read as no answer', () => {
      // ARRANGE
      const text = JSON.stringify({ 'hook-fires': WORKS });
      const named = 'hook-fires';
      // ACT
      const actual = parseProbeRecord(text);
      // ASSERT
      expect(actual).toContain(named);
    });

    it('names a status that is neither works nor fails', () => {
      // ARRANGE
      const text = JSON.stringify({ 'hook-fires-headless': { ...WORKS, status: 'unprobed' } });
      // ACT
      const actual = parseProbeRecord(text);
      // ASSERT
      expect(isProblem(actual)).toBe(true);
    });

    it('names text that is not a JSON object', () => {
      // ARRANGE
      const texts = ['not json', '[1]', '7'];
      const expected = [true, true, true];
      // ACT
      const actual = texts.map((text) => isProblem(parseProbeRecord(text)));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names a result with no detail or no instant', () => {
      // ARRANGE
      const text = JSON.stringify({ 'hook-fires-headless': { status: 'works' } });
      // ACT
      const actual = parseProbeRecord(text);
      // ASSERT
      expect(isProblem(actual)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('reads an empty object as no probe recorded', () => {
      // ARRANGE
      const expected = {};
      // ACT
      const actual = parseProbeRecord('{}');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('withProbe', () => {
  describe('success cases', () => {
    it('adds a result without touching the others', () => {
      // ARRANGE
      const before = withProbe({}, 'hook-fires-headless', WORKS);
      const expected = ['hook-fires-headless', 'scoped-permission-mode'];
      // ACT
      const after = withProbe(before, 'scoped-permission-mode', { ...WORKS, status: 'fails' });
      // ASSERT
      expect(Object.keys(after)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('replaces an earlier answer to the same probe, so a re-run is the new answer', () => {
      // ARRANGE
      const before = withProbe({}, 'hook-fires-headless', WORKS);
      const expected = 'fails';
      const probe = 'hook-fires-headless';
      // ACT
      const after = withProbe(before, probe, { ...WORKS, status: 'fails' });
      // ASSERT
      expect(after[probe]?.status).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('does not change the record it was given', () => {
      // ARRANGE
      const before = {};
      // ACT
      withProbe(before, 'hook-fires-headless', WORKS);
      // ASSERT
      expect(before).toEqual({});
    });
  });
});

describe('earlierProbesMissing', () => {
  describe('success cases', () => {
    it('lists nothing for the first probe, which has nothing before it', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = earlierProbesMissing('hook-fires-headless', {});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists nothing once every earlier probe is recorded, whatever it answered', () => {
      // ARRANGE
      const record = withProbe(withProbe({}, 'hook-fires-headless', WORKS), 'scoped-permission-mode', {
        ...WORKS,
        status: 'fails',
      });
      // ACT
      const actual = earlierProbesMissing('scratch-home-credentials', record);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('names every earlier probe still unrecorded, in order, for the last probe', () => {
      // ARRANGE
      const expected = ['hook-fires-headless', 'scoped-permission-mode'];
      // ACT
      const actual = earlierProbesMissing('scratch-home-credentials', {});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the skipped one when only a later earlier probe is recorded', () => {
      // ARRANGE
      const record = withProbe({}, 'scoped-permission-mode', WORKS);
      const expected = ['hook-fires-headless'];
      // ACT
      const actual = earlierProbesMissing('scratch-home-credentials', record);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not count the probe itself as an earlier one', () => {
      // ARRANGE
      const expected = ['hook-fires-headless'];
      // ACT
      const actual = earlierProbesMissing('scoped-permission-mode', {});
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
