// Colocated unit test for YAML parsing and the "is it a mapping" gate.
//
// Imports its same-name `.pure` sibling and nothing else, so the fault shapes
// below are written out by hand rather than imported.

import { describe, expect, it } from 'vitest';
import { parseConfigDocument } from './config-document.pure';

const LOCATION = 'markdown-harness.config.yaml';

describe('parseConfigDocument', () => {
  describe('success cases', () => {
    it('returns the mapping and no faults', () => {
      // ARRANGE
      const text = 'frontmatter:\n  rules: []\n';
      const expected = { frontmatter: { rules: [] } };
      // ACT
      const actual = parseConfigDocument(text, LOCATION);
      // ASSERT
      expect(actual.faults).toEqual([]);
      expect(actual.document).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_NOT_YAML when the bytes do not parse', () => {
      // ARRANGE
      const text = 'frontmatter:\n  rules: [\n unclosed';
      const expected = [{ code: 'CONFIG_NOT_YAML', location: LOCATION }];
      // ACT
      const actual = parseConfigDocument(text, LOCATION);
      // ASSERT
      expect(actual.faults).toEqual(expected);
      expect(actual.document).toBeUndefined();
    });

    it('reports CONFIG_NOT_YAML when valid YAML is not a mapping', () => {
      // ARRANGE
      const text = '- one\n- two\n';
      const expected = [{ code: 'CONFIG_NOT_YAML', location: LOCATION }];
      // ACT
      const actual = parseConfigDocument(text, LOCATION);
      // ASSERT
      expect(actual.faults).toEqual(expected);
      expect(actual.document).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('treats an empty document as not a mapping', () => {
      // An empty file parses to null rather than throwing, so the mapping gate
      // is the only thing standing between it and a config with no rules.
      // ARRANGE
      const text = '';
      const expected = [{ code: 'CONFIG_NOT_YAML', location: LOCATION }];
      // ACT
      const actual = parseConfigDocument(text, LOCATION);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });

    it('reports the config path it was given, not a resolved one', () => {
      // ARRANGE
      const text = 'nope';
      const elsewhere = '../shared/mh.yaml';
      // ACT
      const actual = parseConfigDocument(text, elsewhere);
      // ASSERT
      expect(actual.faults[0]?.location).toBe(elsewhere);
    });
  });
});
