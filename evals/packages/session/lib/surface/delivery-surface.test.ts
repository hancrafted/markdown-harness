// Colocated unit test for the delivery surfaces: which three-field combinations are
// coherent, what shell a surface is given, and which files a surface ships.

import { describe, expect, it } from 'vitest';
import {
  allowedToolsFor,
  incoherentSurface,
  needsHookScript,
  toolsFor,
  withPullLine,
} from './delivery-surface.pure.ts';

const PUSH = { channel: 'push', shell: 'none', encoding: 'hook-prose' } as const;
const PUSH_WIDENED = { channel: 'push', shell: 'widened', encoding: 'hook-prose' } as const;
const PULL_JSON = { channel: 'pull', shell: 'query-only', encoding: 'json' } as const;
const PULL_PROSE = { channel: 'pull', shell: 'query-only', encoding: 'prose' } as const;
const PULL_INTENTS = { channel: 'pull', shell: 'query-only', encoding: 'intent-only' } as const;
const USER_TURN = { channel: 'user-turn', shell: 'none', encoding: 'none' } as const;

describe('incoherentSurface', () => {
  describe('success cases', () => {
    it('accepts every surface a matrix measures', () => {
      // ARRANGE
      const surfaces = [PUSH, PUSH_WIDENED, PULL_JSON, PULL_PROSE, PULL_INTENTS, USER_TURN];
      // ACT
      const actual = surfaces.map(incoherentSurface);
      // ASSERT
      expect(actual).toEqual(surfaces.map(() => undefined));
    });
  });

  describe('failure cases', () => {
    it('names a pull surface with no shell, and a push surface with a pull encoding', () => {
      // ARRANGE
      const expected = [/shell none is not a pull surface/, /encoding json is not a push surface/];
      // ACT
      const actual = [
        incoherentSurface({ channel: 'pull', shell: 'none', encoding: 'json' }),
        incoherentSurface({ channel: 'push', shell: 'none', encoding: 'json' }),
      ];
      // ASSERT
      expected.forEach((pattern, index) => expect(actual[index]).toMatch(pattern));
    });
  });

  describe('edge cases', () => {
    it('refuses a user-turn surface that was given a shell', () => {
      // ARRANGE
      const expected = /shell query-only is not a user-turn surface/;
      // ACT
      const actual = incoherentSurface({ channel: 'user-turn', shell: 'query-only', encoding: 'none' });
      // ASSERT
      expect(actual).toMatch(expected);
    });
  });
});

describe('shell scope', () => {
  const QUERY = ['Bash(bin/mh query:*)', 'Bash(./bin/mh query:*)'];
  const WRITERS = ['cat', 'tee', 'printf', 'echo', 'mkdir'];

  describe('success cases', () => {
    it('gives no shell to a surface with none, and the query command alone to a pull surface', () => {
      // ARRANGE
      const expected = [[], QUERY];
      // ACT
      const actual = [allowedToolsFor('none'), allowedToolsFor('query-only')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('adds the writing commands, and keeps the query command, only when the shell is widened', () => {
      // ARRANGE
      const expected = [...QUERY, ...WRITERS.map((writer) => `Bash(${writer}:*)`)];
      // ACT
      const actual = allowedToolsFor('widened');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('allows no write-capable command in a query-only shell', () => {
      // ARRANGE
      const allowed = allowedToolsFor('query-only').join(' ');
      // ACT
      const found = WRITERS.filter((writer) => allowed.includes(`Bash(${writer}`));
      // ASSERT
      expect(found).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('adds the shell to the tool set exactly when the surface grants one', () => {
      // ARRANGE
      const base = ['Read', 'Write'];
      const withShell = [...base, 'Bash'];
      // ACT
      const actual = [toolsFor('none', base), toolsFor('query-only', base), toolsFor('widened', base)];
      // ASSERT
      expect(actual).toEqual([base, withShell, withShell]);
    });

    it('ships the hook script for the push hook and for the prose pull command, and for nothing else', () => {
      // ARRANGE
      const expected = [true, true, false, false, false];
      // ACT
      const actual = [PUSH, PULL_PROSE, PULL_JSON, PULL_INTENTS, USER_TURN].map(needsHookScript);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('withPullLine', () => {
  describe('success cases', () => {
    it('appends the line after the existing instructions on a line of its own', () => {
      // ARRANGE
      const expected = 'Notes.\n\nRun the query.\n';
      // ACT
      const actual = withPullLine('Notes.\n', 'Run the query.');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('does not duplicate or lose the instructions when they carry no trailing newline', () => {
      // ARRANGE
      const expected = 'Notes.\n\nRun the query.\n';
      // ACT
      const actual = withPullLine('Notes.', 'Run the query.');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps a single blank line when the instructions end in several newlines', () => {
      // ARRANGE
      const expected = 'Notes.\n\nRun the query.\n';
      // ACT
      const actual = withPullLine('Notes.\n\n\n', 'Run the query.');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
