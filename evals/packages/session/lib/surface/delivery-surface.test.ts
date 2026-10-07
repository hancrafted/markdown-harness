// Colocated unit test for the delivery surfaces: which three-field combinations are
// coherent, what shell a surface is given, and which files a surface ships.

import { describe, expect, it } from 'vitest';
import {
  ASSESS_CANARY_TARGET,
  CHANNELS,
  PULL_LINE,
  QUERY_COMMAND_TEXT,
  allowedToolsFor,
  grantsShellWrites,
  hookScriptsFor,
  incoherentSurface,
  isDeliveryChannel,
  needsHookScript,
  toolsFor,
  withPullLine,
} from './delivery-surface.pure.ts';

const PUSH = { channel: 'push', shell: 'none', encoding: 'hook-prose' } as const;
const PUSH_WIDENED = { channel: 'push', shell: 'widened', encoding: 'hook-prose' } as const;
const PULL_JSON = { channel: 'pull', shell: 'query-only', encoding: 'json' } as const;
const PULL_PROSE = { channel: 'pull', shell: 'query-only', encoding: 'prose' } as const;
const PULL_INTENTS = { channel: 'pull', shell: 'query-only', encoding: 'intent-only' } as const;
const ASSESS = { channel: 'assess', shell: 'none', encoding: 'hook-prose' } as const;
const USER_TURN = { channel: 'user-turn', shell: 'none', encoding: 'none' } as const;

describe('incoherentSurface', () => {
  describe('success cases', () => {
    it('accepts every surface a matrix measures', () => {
      // ARRANGE
      const surfaces = [PUSH, PUSH_WIDENED, PULL_JSON, PULL_PROSE, PULL_INTENTS, ASSESS, USER_TURN];
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

    it('refuses an assess surface given a shell or a pull encoding', () => {
      // ARRANGE
      const expected = [/shell widened is not a assess surface/, /encoding json is not a assess surface/];
      // ACT
      const actual = [
        incoherentSurface({ channel: 'assess', shell: 'widened', encoding: 'hook-prose' }),
        incoherentSurface({ channel: 'assess', shell: 'none', encoding: 'json' }),
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
    it('returns a copy of the allow-list, so a caller changing it cannot widen the next session', () => {
      // ARRANGE
      const before = [...allowedToolsFor('query-only')];
      // ACT
      allowedToolsFor('query-only').push('Bash(rm:*)');
      allowedToolsFor('widened').push('Bash(rm:*)');
      const after = allowedToolsFor('query-only');
      // ASSERT
      expect(after).toEqual(before);
    });

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

    it('ships a hook script for the push hook, the assess hook and the prose pull command, and for nothing else', () => {
      // ARRANGE
      const expected = [true, true, true, false, false, false];
      // ACT
      const actual = [PUSH, ASSESS, PULL_PROSE, PULL_JSON, PULL_INTENTS, USER_TURN].map(needsHookScript);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('hookScriptsFor', () => {
  describe('success cases', () => {
    it('names the query hook for push and prose pull, and the assess hook with the log it imports for assess', () => {
      // ARRANGE
      const expected = [['query-hook.mjs'], ['query-hook.mjs'], ['assess-hook.mjs', 'activity-log.mjs']];
      // ACT
      const actual = [PUSH, PULL_PROSE, ASSESS].map(hookScriptsFor);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names nothing for a surface with no hook: raw JSON pull, intents-only pull and the user turn', () => {
      // ARRANGE
      const expected = [[], [], []];
      // ACT
      const actual = [PULL_JSON, PULL_INTENTS, USER_TURN].map(hookScriptsFor);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not offer the query hook to an assess surface, nor the assess hook to a push one', () => {
      // ARRANGE
      const expected = [false, false];
      // ACT
      const actual = [
        hookScriptsFor(ASSESS).includes('query-hook.mjs'),
        hookScriptsFor(PUSH).includes('assess-hook.mjs'),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('the assess channel', () => {
  describe('success cases', () => {
    it('is a delivery channel, owes a canary on its own surface, and gives no shell', () => {
      // ARRANGE
      const row = CHANNELS.assess;
      // ACT
      const actual = [isDeliveryChannel('assess'), row.canary?.surface, allowedToolsFor('none'), row.line];
      // ASSERT
      expect(actual).toEqual([true, ASSESS, [], undefined]);
    });

    it('forces the hook to fire: its canary task reads the stale note, then edits it', () => {
      // ARRANGE
      const task = CHANNELS.assess.canary?.task(ASSESS_CANARY_TARGET) ?? '';
      // ACT
      const actual = [task.includes(`Read ${ASSESS_CANARY_TARGET}`), /Edit/.test(task)];
      // ASSERT
      expect(actual).toEqual([true, true]);
    });

    it('names the file the canary reads, so a layout holding it is stale at any real clock', () => {
      // ARRANGE
      const expected = 'docs/research/feature-flags.md';
      // ACT
      const actual = CHANNELS.assess.canary?.target;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('is not the push channel: it carries no pull line and ships no query hook, so a push cell never borrows its root', () => {
      // ARRANGE
      const expected = [undefined, false];
      // ACT
      const actual = [CHANNELS.assess.line, hookScriptsFor(ASSESS).includes('query-hook.mjs')];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves the other channels with no canary target of their own, so they keep the invented new-file path', () => {
      // ARRANGE
      const expected = [undefined, undefined];
      // ACT
      const actual = [CHANNELS.push.canary?.target, CHANNELS.pull.canary?.target];
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

describe('the channel table', () => {
  const CHANNEL_NAMES = ['push', 'pull', 'user-turn'];

  describe('success cases', () => {
    it('holds one row for each delivery channel and knows no other', () => {
      // ARRANGE
      const expected = [CHANNEL_NAMES.map(() => true), false];
      // ACT
      const actual = [CHANNEL_NAMES.map(isDeliveryChannel), isDeliveryChannel('push-and-pull')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('owes a canary to the push and pull channels and none to the user turn', () => {
      // ARRANGE
      const expected = [true, true, false];
      // ACT
      const actual = [CHANNELS.push.canary, CHANNELS.pull.canary, CHANNELS['user-turn'].canary].map(
        (canary) => canary !== undefined,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the query command once: the instruction line, the pull canary task and the allow-list all say it', () => {
      // ARRANGE
      const target = 'docs/a.md';
      const allowed = allowedToolsFor('query-only').join(' ');
      // ACT
      const said = [PULL_LINE, CHANNELS.pull.canary?.task(target) ?? '', allowed];
      // ASSERT
      for (const text of said) expect(text).toContain(QUERY_COMMAND_TEXT);
    });
  });

  describe('failure cases', () => {
    it('lets the push canary force the Write tool and not the query command', () => {
      // ARRANGE
      const target = 'docs/a.md';
      // ACT
      const task = CHANNELS.push.canary?.task(target) ?? '';
      // ASSERT
      expect(task).not.toContain(QUERY_COMMAND_TEXT);
    });

    it('gives the push and user-turn channels no instruction-file line', () => {
      // ARRANGE
      const expected = [undefined, undefined, PULL_LINE];
      // ACT
      const actual = [CHANNELS.push.line, CHANNELS['user-turn'].line, CHANNELS.pull.line];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('grants shell writes to the widened scope alone, and to an unrecorded scope not at all', () => {
      // ARRANGE
      const expected = [false, false, true, false];
      // ACT
      const actual = [
        grantsShellWrites('none'),
        grantsShellWrites('query-only'),
        grantsShellWrites('widened'),
        grantsShellWrites(undefined),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
