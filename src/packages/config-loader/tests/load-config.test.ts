// Integration suite for the config loader, at the grain a caller sees.
//
// These reach the filesystem on purpose: the read edge is the one part of the
// loader no colocated test can exercise, because the colocated lane admits only
// a `.pure` sibling. Every path below is an existing repo fixture rather than a
// planted temp file, so the suite depends on nothing it did not commit.

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../load-config.ts';

const VALID = 'fixtures/conformance/valid-test-config.yaml';
const A_DIRECTORY = 'fixtures/conformance';
const NOT_YAML = 'fixtures/conformance/docs/log.md';
const MISSING = 'fixtures/conformance/no-such-config.yaml';

describe('loadConfig', () => {
  describe('success cases', () => {
    it('loads the conformance config with no faults', () => {
      // ARRANGE
      const expected = 0;
      // ACT
      const actual = loadConfig(VALID);
      // ASSERT
      expect(actual.faults).toHaveLength(expected);
      expect(actual.config?.frontmatter?.rules.length).toBeGreaterThan(expected);
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_NOT_FOUND for a path with nothing at it', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_NOT_FOUND', location: MISSING }];
      // ACT
      const actual = loadConfig(MISSING);
      // ASSERT
      expect(actual.faults).toEqual(expected);
      expect(actual.config).toBeUndefined();
    });

    it('reports CONFIG_UNREADABLE when the path is a directory', () => {
      // "Something is there but cannot be read as a file" — the case a bare
      // existence check would call success.
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNREADABLE', location: A_DIRECTORY }];
      // ACT
      const actual = loadConfig(A_DIRECTORY);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });

    it('reports CONFIG_NOT_YAML for bytes that are not a mapping', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_NOT_YAML', location: NOT_YAML }];
      // ACT
      const actual = loadConfig(NOT_YAML);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('echoes the config path exactly as given, never resolved', () => {
      // A stored response must compare equal on another machine, so an absolute
      // path must never appear in a fault the caller wrote relatively.
      // ARRANGE
      const relative = './fixtures/conformance/no-such-config.yaml';
      // ACT
      const actual = loadConfig(relative);
      // ASSERT
      expect(actual.faults[0]?.location).toBe(relative);
    });

    it('stops before validating when the bytes never parsed', () => {
      // A file with no keys has nothing to recognise, so exactly one fault
      // travels rather than that fault plus a cascade of key complaints.
      // ARRANGE
      const only = 1;
      // ACT
      const actual = loadConfig(NOT_YAML);
      // ASSERT
      expect(actual.faults).toHaveLength(only);
    });
  });
});
