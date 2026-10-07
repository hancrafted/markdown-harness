// Colocated unit test for the cohort builder: a field with no value fails the run
// rather than defaulting to unknown, and two rows pair only when their cohort matches.

import { describe, expect, it } from 'vitest';
import { COHORT_FIELDS, buildCohortRow, pairCohorts } from './cohort-row.pure.ts';

function complete(): Record<string, unknown> {
  return Object.fromEntries(COHORT_FIELDS.map((field, index) => [field, `value-${index}`]));
}

describe('buildCohortRow', () => {
  describe('success cases', () => {
    it('accepts a row with every field, keeping false and zero as real values', () => {
      // ARRANGE
      const fields = { ...complete(), errorFlag: false, turnCount: 0 };
      // ACT
      const built = buildCohortRow(fields, []);
      // ASSERT
      expect(built).toMatchObject({ ok: true, row: { errorFlag: false, turnCount: 0 } });
    });

    it('allows unknown only for a field the observation table says could not be observed', () => {
      // ARRANGE
      const fields = { ...complete(), authSource: 'unknown' };
      // ACT
      const built = buildCohortRow(fields, ['authSource']);
      // ASSERT
      expect(built.ok).toBe(true);
    });
  });

  describe('failure cases', () => {
    it.each(COHORT_FIELDS.map((field) => [field]))('refuses a row that omits %s', (field) => {
      // ARRANGE
      const fields = complete();
      delete fields[field];
      // ACT
      const built = buildCohortRow(fields, []);
      // ASSERT
      expect(built).toEqual({ ok: false, missing: [field] });
    });

    it('refuses unknown, null and the empty string anywhere else', () => {
      // ARRANGE
      const fields = { ...complete(), hostVersion: 'unknown', mhDigest: null, seed: '' };
      const expected = { ok: false, missing: ['seed', 'hostVersion', 'mhDigest'] };
      // ACT
      const built = buildCohortRow(fields, []);
      // ASSERT
      expect(built).toMatchObject({ ok: expected.ok });
      expect([...(built.ok ? [] : built.missing)].sort()).toEqual([...expected.missing].sort());
    });
  });

  describe('edge cases', () => {
    it('refuses to pair rows that ran under different permission scopes, skip-all and scoped being different cohorts', () => {
      // ARRANGE
      const left = { ...complete(), permissionScope: 'skip-all' };
      const right = { ...complete(), permissionScope: 'scoped:accept-edits' };
      const expected = { ok: false, differing: ['permissionScope'] };
      // ACT
      const actual = pairCohorts(left, right);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('pairs rows that agree on every cohort field and refuses ones that differ', () => {
      // ARRANGE
      const left = { ...complete() };
      const right = { ...complete(), hostVersion: 'other', mhDigest: 'other', arm: 'neutralised' };
      const expectedDiffering = ['hostVersion', 'mhDigest'];
      // ACT
      const same = pairCohorts(left, { ...left, arm: 'neutralised' });
      const different = pairCohorts(left, right);
      // ASSERT
      expect(same).toEqual({ ok: true });
      expect(different).toEqual({ ok: false, differing: expectedDiffering });
    });
  });
});
