// Colocated unit test for the command surface.
//
// `undefined` is the parser's whole vocabulary for refusal: every shape of
// conflicting input is refused rather than resolved by precedence, so the
// caller needs to know only that it was refused, never which rule caught it.

import { describe, expect, it } from 'vitest';
import { parseArgv } from './parse-argv.pure';

const DEFAULT_CONFIG = 'markdown-harness.config.yaml';
const DEFAULT_ROOT = '.';
const QUERY = 'query';
const CHECK = 'check';
const AUDIT = 'audit';

describe('parseArgv', () => {
  describe('success cases', () => {
    it('reads a query and defaults the config', () => {
      // ARRANGE
      const target = 'docs/reference/api-limits.md';
      const expected = { command: QUERY, path: target, root: DEFAULT_ROOT, config: DEFAULT_CONFIG };
      // ACT
      const actual = parseArgv(['--query', target]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('defaults a bare invocation to check', () => {
      // No command flag means `--check`: a missing command is not conflicting
      // input, which is why it has a default and the conflicts do not.
      // ARRANGE
      const expected = { command: CHECK, path: '', root: DEFAULT_ROOT, config: DEFAULT_CONFIG };
      // ACT
      const actual = parseArgv([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries an explicit config beside a query', () => {
      // ARRANGE
      const target = 'docs/a.md';
      const config = 'fixtures/valid-test-config.yaml';
      const expected = { command: QUERY, path: target, root: DEFAULT_ROOT, config };
      // ACT
      const actual = parseArgv(['--query', target, '--config', config]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a root beside audit', () => {
      // ARRANGE
      const root = 'fixtures';
      const expected = { command: AUDIT, path: '', root, config: DEFAULT_CONFIG };
      // ACT
      const actual = parseArgv(['--audit', '--root', root]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses two command flags', () => {
      // ARRANGE
      const argv = ['--check', '--audit'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses root combined with query, because a query has no corpus', () => {
      // ARRANGE
      const argv = ['--root', 'docs', '--query', 'docs/a.md'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses an unknown flag', () => {
      // ARRANGE
      const argv = ['--verbose'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a flag given twice rather than taking the last', () => {
      // Last-one-wins would silently discard what the caller asked for, and
      // this tool answers about directories.
      // ARRANGE
      const argv = ['--root', 'a', '--root', 'b'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a flag written with no value', () => {
      // ARRANGE
      const argv = ['--config'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a value that begins with two dashes', () => {
      // ARRANGE
      const argv = ['--config', '--root'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('refuses a bare positional argument', () => {
      // The surface is flags only, so a path with no flag names nothing.
      // ARRANGE
      const argv = ['docs/a.md'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses the same command flag written twice', () => {
      // ARRANGE
      const argv = ['--audit', '--audit'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('accepts a query value that merely contains dashes', () => {
      // Only a LEADING pair of dashes marks a flag; an interior one is ordinary.
      // ARRANGE
      const target = 'docs/reference/api-limits.md';
      const expected = QUERY;
      // ACT
      const actual = parseArgv(['--query', target]);
      // ASSERT
      expect(actual?.command).toBe(expected);
    });
  });
});
