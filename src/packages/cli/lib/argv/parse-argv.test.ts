// Colocated unit test for the command surface.
//
// A refusal carries a reason only when a Module name was involved: every other
// shape of conflicting input is explained by the synopsis alone, so the caller
// needs to know only that it was refused, never which rule caught it.
//
// The Module set is a stand-in written here rather than the declared one, so a
// case can name a Module that implements fewer commands than any shipped one.

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

/** A refusal the synopsis alone explains. */
const REFUSED = { kind: 'refused', reason: '' };

/** Two stand-in Modules: one implementing every command, one implementing three. */
const MODULES = [
  { key: 'frontmatter', commands: [CHECK, QUERY, AUDIT, ASSESS] },
  { key: 'body-structure', commands: [CHECK, QUERY, AUDIT] },
] as const;
const BOTH = ['frontmatter', 'body-structure'];

describe('parseArgv', () => {
  describe('success cases', () => {
    it('reads a query, asks every Module implementing it, and defaults the config', () => {
      // ARRANGE
      const target = 'docs/reference/api-limits.md';
      const invocation = {
        command: QUERY,
        modules: BOTH,
        path: target,
        root: DEFAULT_ROOT,
        config: DEFAULT_CONFIG,
        now: NO_INSTANT,
      };
      const expected = { kind: 'parsed', invocation };
      // ACT
      const actual = parseArgv([QUERY, target], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('defaults a bare invocation to an unscoped check', () => {
      // No command word means `check`: a missing command is not conflicting
      // input, which is why it has a default and the conflicts do not.
      // ARRANGE
      const invocation = {
        command: CHECK,
        modules: BOTH,
        path: '',
        root: DEFAULT_ROOT,
        config: DEFAULT_CONFIG,
        now: NO_INSTANT,
      };
      const expected = { kind: 'parsed', invocation };
      // ACT
      const actual = parseArgv([], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('scopes a command to the one Module named before it', () => {
      // ARRANGE
      const root = 'fixtures';
      const invocation = {
        command: AUDIT,
        modules: ['body-structure'],
        path: '',
        root,
        config: DEFAULT_CONFIG,
        now: NO_INSTANT,
      };
      const expected = { kind: 'parsed', invocation };
      // ACT
      const actual = parseArgv(['body-structure', AUDIT, '--root', root], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('asks only the Modules implementing an unscoped assessment, with its instant', () => {
      // ARRANGE
      const target = 'docs/research/yaml.md';
      const instant = '2026-12-01T00:00:00Z';
      const invocation = {
        command: ASSESS,
        modules: ['frontmatter'],
        path: target,
        root: DEFAULT_ROOT,
        config: DEFAULT_CONFIG,
        now: instant,
      };
      const expected = { kind: 'parsed', invocation };
      // ACT
      const actual = parseArgv([ASSESS, target, '--now', instant], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads an assessment with no instant, leaving the clock to the impure edge', () => {
      // The one default this parser does not apply. Absence is recorded rather
      // than resolved, because resolving it would mean reading a clock.
      // ARRANGE
      const target = 'docs/research/yaml.md';
      const expected = NO_INSTANT;
      // ACT
      const parsed = parseArgv([ASSESS, target], MODULES);
      const actual = parsed.kind === 'parsed' ? parsed.invocation.now : undefined;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('reads help as a command of its own, asking no Module', () => {
      // ARRANGE
      const invocation = {
        command: HELP,
        modules: [],
        path: '',
        root: DEFAULT_ROOT,
        config: DEFAULT_CONFIG,
        now: NO_INSTANT,
      };
      const expected = { kind: 'parsed', invocation };
      // ACT
      const actual = parseArgv(['--help'], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a scoped command the Module does not implement, naming the Modules that do', () => {
      // ARRANGE
      const expected = { kind: 'refused', reason: 'body-structure does not implement assess; frontmatter does' };
      // ACT
      const actual = parseArgv(['body-structure', ASSESS, 'docs/a.md'], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an unknown word, naming the commands and the Modules', () => {
      // ARRANGE
      const reason =
        '"frontmater" is neither a command nor a Module. Commands: check, query, audit, assess. Modules: frontmatter, body-structure';
      const expected = { kind: 'refused', reason };
      // ACT
      const actual = parseArgv(['frontmater', CHECK], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a Module name with no command, naming the commands it implements', () => {
      // ARRANGE
      const expected = { kind: 'refused', reason: 'body-structure needs a command: check, query, audit' };
      // ACT
      const actual = parseArgv(['body-structure', '--root', 'docs'], MODULES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an unscoped command no Module implements', () => {
      // Unreachable with the shipped Module set, where frontmatter implements
      // all four; reachable the moment a set leaves one command uncovered.
      // ARRANGE
      const threeOnly = [{ key: 'body-structure', commands: [CHECK, QUERY, AUDIT] }] as const;
      const expected = { kind: 'refused', reason: 'no Module implements assess' };
      // ACT
      const actual = parseArgv([ASSESS, 'docs/a.md'], threeOnly);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the retired flag form of a command rather than aliasing it', () => {
      // ARRANGE
      const argv = ['--check'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses two command words', () => {
      // ARRANGE
      const argv = [CHECK, AUDIT];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses root combined with query, because a query has no corpus', () => {
      // ARRANGE
      const argv = ['--root', 'docs', QUERY, 'docs/a.md'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses an unknown flag', () => {
      // ARRANGE
      const argv = ['--verbose'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses a flag given twice rather than taking the last', () => {
      // Last-one-wins would silently discard what the caller asked for, and
      // this tool answers about directories.
      // ARRANGE
      const argv = ['--root', 'a', '--root', 'b'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses a flag written with no value', () => {
      // ARRANGE
      const argv = ['--config'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses a value that begins with two dashes', () => {
      // ARRANGE
      const argv = ['--config', '--root'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses help beside a real command rather than letting help win', () => {
      // Two commands name two different questions. Precedence would answer
      // one of them silently, and this parser answers neither.
      // ARRANGE
      const argv = [CHECK, '--help'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses a root beside an assessment, which answers about one path', () => {
      // ARRANGE
      const argv = [ASSESS, 'docs/a.md', '--root', 'fixtures'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses an instant beside a command that reads no clock', () => {
      // Refused rather than ignored: dropping it silently would let a caller
      // believe a `check` had been pinned to an instant, and `check` is
      // hermetic by contract.
      // ARRANGE
      const argv = [CHECK, '--now', '2026-12-01T00:00:00Z'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses an instant it could not compare against', () => {
      // ARRANGE
      const argv = [ASSESS, 'docs/a.md', '--now', 'yesterday'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });
  });

  describe('edge cases', () => {
    it('refuses a query with no path, and a check with one', () => {
      // ARRANGE
      const expected = [REFUSED, REFUSED];
      // ACT
      const actual = [parseArgv([QUERY], MODULES), parseArgv([CHECK, 'docs/a.md'], MODULES)];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('takes a path that spells a command or a Module name as a path', () => {
      // Only the words before the command are read as a scope; after it, a word
      // is the operand whatever it spells.
      // ARRANGE
      const expected = ['check', 'frontmatter'];
      // ACT
      const parsed = [parseArgv([QUERY, 'check'], MODULES), parseArgv([QUERY, 'frontmatter'], MODULES)];
      const actual = parsed.map((each) => (each.kind === 'parsed' ? each.invocation.path : undefined));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a Module name followed by a word that is no command', () => {
      // ARRANGE
      const argv = ['frontmatter', 'frontmatter'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('refuses help beside a flag it would only have ignored', () => {
      // `--help` reads neither a corpus nor a config, so a `--config` beside it
      // is conflicting input on the same terms a `--root` beside `query` is.
      // ARRANGE
      const argv = ['--help', '--config', 'fixtures/valid-test-config.yaml'];
      // ACT
      const actual = parseArgv(argv, MODULES);
      // ASSERT
      expect(actual).toEqual(REFUSED);
    });

    it('names "do" when more than one other Module implements the command', () => {
      // ARRANGE
      const three = [
        { key: 'a', commands: [CHECK] },
        { key: 'b', commands: [CHECK, ASSESS] },
        { key: 'c', commands: [ASSESS] },
      ] as const;
      const expected = { kind: 'refused', reason: 'a does not implement assess; b, c do' };
      // ACT
      const actual = parseArgv(['a', ASSESS, 'docs/a.md'], three);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
