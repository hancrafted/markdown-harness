// Colocated unit test for field addressing.
//
// The interesting cases are all about what a CONTAINER does to the address
// below it. An absent list makes a per-entry constraint vacuous, while a list
// that is really a string makes the same constraint a shape collision — and
// those are opposite findings, one silent and one reported.

import { describe, expect, it } from 'vitest';
import { resolveAddress } from './field-address.pure';

describe('field addressing', () => {
  describe('success cases', () => {
    it('finds a top-level key', () => {
      // ARRANGE
      const data = { type: 'research', description: 'A note' };
      const expected = { kind: 'sites', sites: [{ field: 'type', present: true, value: 'research' }] };
      // ACT
      const actual = resolveAddress('type', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds a key inside a mapping', () => {
      // ARRANGE
      const data = { generated: { by: 'claude-opus/5', at: '2026-08-25T09:00:00Z' } };
      const expected = { kind: 'sites', sites: [{ field: 'generated.by', present: true, value: 'claude-opus/5' }] };
      // ACT
      const actual = resolveAddress('generated.by', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches every entry of a list, carrying the index in the address', () => {
      // The response carries no line or column, so the concrete address is the
      // only locator a per-entry finding has.
      // ARRANGE
      const data = { sources: [{ resource: 'docs/a.md' }, { resource: 'has a space' }] };
      const expected = {
        kind: 'sites',
        sites: [
          { field: 'sources[0].resource', present: true, value: 'docs/a.md' },
          { field: 'sources[1].resource', present: true, value: 'has a space' },
        ],
      };
      // ACT
      const actual = resolveAddress('sources[].resource', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a top-level key that was never written as absent', () => {
      // ARRANGE
      const data = { title: 'No type here' };
      const expected = { kind: 'sites', sites: [{ field: 'type', present: false, value: undefined }] };
      // ACT
      const actual = resolveAddress('type', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an entry address over a non-list as a shape mismatch', () => {
      // The config asked a question the data cannot answer, and a constraint
      // that reports nothing when it meets the wrong shape is a false negative.
      // ARRANGE
      const data = { sources: 'text' };
      const expected = { kind: 'shape-mismatch' };
      // ACT
      const actual = resolveAddress('sources[].id', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a mapping address over a scalar as a shape mismatch', () => {
      // ARRANGE
      const data = { generated: 'claude-opus/5' };
      const expected = { kind: 'shape-mismatch' };
      // ACT
      const actual = resolveAddress('generated.by', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('makes a per-entry constraint vacuous when the list is absent', () => {
      // A claim about every entry of no entries is true. Reporting here would
      // quietly turn every per-entry constraint into `required`.
      // ARRANGE
      const data = { type: 'research' };
      const expected = { kind: 'vacuous' };
      // ACT
      const actual = resolveAddress('sources[].id', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reaches no site at all in an empty list', () => {
      // ARRANGE
      const data = { sources: [] };
      const expected = { kind: 'sites', sites: [] };
      // ACT
      const actual = resolveAddress('sources[].id', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats a written-and-blank container as absent rather than misshapen', () => {
      // `generated:` with nothing under it is the author writing an empty key,
      // not the Operator misapplying a constraint — so the address names
      // nothing and `CONSTRAINT_SHAPE_MISMATCH`, which no markdown edit can
      // fix, would be addressed to the wrong person.
      // ARRANGE
      const data = { generated: null };
      const expected = { kind: 'sites', sites: [{ field: 'generated.by', present: false, value: undefined }] };
      // ACT
      const actual = resolveAddress('generated.by', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a key missing from a mapping that does exist as absent', () => {
      // ARRANGE
      const data = { generated: { at: '2026-08-25T09:00:00Z' } };
      const expected = { kind: 'sites', sites: [{ field: 'generated.by', present: false, value: undefined }] };
      // ACT
      const actual = resolveAddress('generated.by', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps a written-and-blank leaf present, holding null', () => {
      // ARRANGE
      const data = { type: null };
      const expected = { kind: 'sites', sites: [{ field: 'type', present: true, value: null }] };
      // ACT
      const actual = resolveAddress('type', data);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
