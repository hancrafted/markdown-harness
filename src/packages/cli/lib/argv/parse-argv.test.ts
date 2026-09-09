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
const ASSESS = 'assess';
const CHECK = 'check';
const AUDIT = 'audit';
const HELP = 'help';

/** `--now` not given. The parser records absence rather than reading a clock. */
const NO_INSTANT = '';

describe('parseArgv', () => {
  describe('success cases', () => {
    it('reads a query and defaults the config', () => {
      // ARRANGE
      const target = 'docs/reference/api-limits.md';
      const expected = { command: QUERY, path: target, root: DEFAULT_ROOT, config: DEFAULT_CONFIG, now: NO_INSTANT };
      // ACT
      const actual = parseArgv(['--query', target]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('defaults a bare invocation to check', () => {
      // No command flag means `--check`: a missing command is not conflicting
      // input, which is why it has a default and the conflicts do not.
      // ARRANGE
      const expected = { command: CHECK, path: '', root: DEFAULT_ROOT, config: DEFAULT_CONFIG, now: NO_INSTANT };
      // ACT
      const actual = parseArgv([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries an explicit config beside a query', () => {
      // ARRANGE
      const target = 'docs/a.md';
      const config = 'fixtures/valid-test-config.yaml';
      const expected = { command: QUERY, path: target, root: DEFAULT_ROOT, config, now: NO_INSTANT };
      // ACT
      const actual = parseArgv(['--query', target, '--config', config]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a root beside audit', () => {
      // ARRANGE
      const root = 'fixtures';
      const expected = { command: AUDIT, path: '', root, config: DEFAULT_CONFIG, now: NO_INSTANT };
      // ACT
      const actual = parseArgv(['--audit', '--root', root]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads an assessment and the instant it is judged against', () => {
      // ARRANGE
      const target = 'docs/research/yaml.md';
      const instant = '2026-12-01T00:00:00Z';
      const expected = { command: ASSESS, path: target, root: DEFAULT_ROOT, config: DEFAULT_CONFIG, now: instant };
      // ACT
      const actual = parseArgv(['--assess', target, '--now', instant]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads an assessment with no instant, leaving the clock to the impure edge', () => {
      // The one default this parser does not apply. Absence is recorded rather
      // than resolved, because resolving it would mean reading a clock.
      // ARRANGE
      const target = 'docs/research/yaml.md';
      const expected = { command: ASSESS, path: target, root: DEFAULT_ROOT, config: DEFAULT_CONFIG, now: NO_INSTANT };
      // ACT
      const actual = parseArgv(['--assess', target]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads help as a command of its own', () => {
      // The defaults still travel, because one invocation shape is easier to
      // hold than one with a hole in it — `help` simply reads neither.
      // ARRANGE
      const expected = { command: HELP, path: '', root: DEFAULT_ROOT, config: DEFAULT_CONFIG, now: NO_INSTANT };
      // ACT
      const actual = parseArgv(['--help']);
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

    it('refuses help beside a real command rather than letting help win', () => {
      // Two command flags name two different questions. Precedence would answer
      // one of them silently, and this parser answers neither.
      // ARRANGE
      const argv = ['--check', '--help'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a root beside an assessment, which answers about one path', () => {
      // ARRANGE
      const argv = ['--assess', 'docs/a.md', '--root', 'fixtures'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses an instant beside a command that reads no clock', () => {
      // Refused rather than ignored: dropping it silently would let a caller
      // believe a `--check` had been pinned to an instant, and `--check` is
      // hermetic by contract.
      // ARRANGE
      const argv = ['--check', '--now', '2026-12-01T00:00:00Z'];
      // ACT
      const actual = parseArgv(argv);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses an instant it could not compare against', () => {
      // ARRANGE
      const argv = ['--assess', 'docs/a.md', '--now', 'yesterday'];
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

    it('refuses help beside a flag it would only have ignored', () => {
      // `--help` reads neither a corpus nor a config, so a `--config` beside it
      // is conflicting input on the same terms a `--root` beside `--query` is.
      // ARRANGE
      const argv = ['--help', '--config', 'fixtures/valid-test-config.yaml'];
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
