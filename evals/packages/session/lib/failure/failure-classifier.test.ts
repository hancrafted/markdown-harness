// Colocated unit test for the failure classifier. Exit code 0 from a Host harness
// proves nothing, so every case here is decided from stream fields, stderr and the
// spawn report. One case exercises a kind no provider produces yet (trap 15's shape).

import { describe, expect, it } from 'vitest';
import type { RawSession } from '../../classify-session.ts';
import { parseAgyStream, parseSessionStream } from '../../session-stream.ts';
import { classifySession, sessionCause } from './failure-classifier.pure.ts';

const EXPECT = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
const INIT = {
  type: 'system',
  subtype: 'init',
  session_id: 's',
  model: 'm',
  claude_code_version: 'v',
  permissionMode: 'acceptEdits',
  apiKeySource: 'none',
  skills: [],
  mcp_servers: [],
  plugins: [{ name: 'cc-plugin-agents-md' }, { name: 'cc-plugin-telemetry' }],
};

function result(overrides: object) {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 3,
    terminal_reason: 'completed',
    result: 'Done.',
    ...overrides,
  };
}

function raw(events: object[], overrides: Partial<RawSession> = {}): RawSession {
  const text = events.map((event) => JSON.stringify(event)).join('\n');
  return { spawnError: undefined, timedOut: false, stderr: '', parsed: parseSessionStream(text), ...overrides };
}

describe('classifySession', () => {
  describe('success cases', () => {
    it('grades a completed session', () => {
      // ARRANGE
      const expected = { outcome: 'graded' };
      // ACT
      const actual = classifySession(raw([INIT, result({})]), EXPECT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('grades a turn cap reached, because nothing written is a result and not a crash', () => {
      // ARRANGE
      const expected = { outcome: 'graded' };
      // ACT
      const actual = classifySession(
        raw([INIT, result({ subtype: 'error_max_turns', terminal_reason: 'max_turns' })]),
        EXPECT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('passes a failure named outside the session through, including a kind no provider produces yet', () => {
      // ARRANGE
      const expectedKind = 'duplicate-session-id';
      const expected = { outcome: 'instrument-failure', kind: expectedKind };
      // ACT
      const actual = classifySession(raw([INIT, result({})], { declared: expectedKind }), EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it.each([
      ['host-binary-missing', raw([], { spawnError: 'ENOENT' })],
      ['wall-clock-timeout', raw([INIT], { timedOut: true })],
      ['no-parseable-stream', raw([])],
      [
        'authentication-failure',
        raw([
          INIT,
          result({ is_error: true, terminal_reason: 'api_error', result: 'Not logged in · Please run /login' }),
        ]),
      ],
      [
        'rate-limit-exhausted',
        raw([INIT, result({ is_error: true, terminal_reason: 'api_error', result: 'You have hit your usage limit' })]),
      ],
      ['unrecognised-terminal-reason', raw([INIT, result({ terminal_reason: 'something_new' })])],
      ['init-assertion-failed', raw([{ ...INIT, apiKeySource: 'ANTHROPIC_API_KEY' }, result({})])],
    ] as const)('names %s', (kind, session) => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind };
      // ACT
      const actual = classifySession(session, EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('treats a skill or an MCP server in the init event as a failed isolation assertion', () => {
      // ARRANGE
      const leaked = raw([{ ...INIT, skills: ['x'], mcp_servers: [{ name: 'y' }] }, result({})]);
      const expected = { outcome: 'instrument-failure', kind: 'init-assertion-failed' };
      // ACT
      const actual = classifySession(leaked, EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('reads an unexpected plugin as a failed assertion and an expected subset as fine', () => {
      // ARRANGE
      const extra = raw([{ ...INIT, plugins: [{ name: 'rogue' }] }, result({})]);
      const subset = raw([{ ...INIT, plugins: [{ name: 'cc-plugin-agents-md' }] }, result({})]);
      const expected = ['instrument-failure', 'graded'];
      // ACT
      const actual = [classifySession(extra, EXPECT).outcome, classifySession(subset, EXPECT).outcome];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a stream whose expected keys are missing as an instrument failure, not a score', () => {
      // ARRANGE
      const session = raw([{ type: 'system', subtype: 'init' }, result({})]);
      const expected = { outcome: 'instrument-failure', kind: 'init-assertion-failed' };
      // ACT
      const actual = classifySession(session, EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });
});

// Antigravity: `agy` exits 0 on an authentication failure and on a denied write (R0 item 6, R3), so every case
// below carries exit status 0 and is decided from stream fields and stderr alone. The streams are hand-written
// from R3's recorded envelope and are UNVERIFIED AGAINST A LIVE SESSION; the stderr wording of the denial is R3's
// quoted line, the authentication wording is the OAuth URL R3 saw under a scratch HOME.

const AGY_EXPECT = {
  apiKeySource: 'unknown',
  expectedPlugins: [],
  permissionMode: 'always-proceed',
  model: 'gemini-3.8-flash-low',
};
const AGY_INIT = {
  event: 'init',
  init: { model: 'gemini-3.8-flash-low', cwd: '/r', tools: ['write_to_file'], permission_mode: 'always-proceed' },
  conversation_id: 'c-1',
};
const AGY_RESULT = { event: 'result', result: { status: 'SUCCESS', response: 'Done.', num_turns: 1 } };
const DENIED_STDERR =
  'jetski: no output produced \u2014 tool required "write_file" permission that headless mode cannot prompt for, so it auto-denied. Add an allow-rule under permissions.allow in settings.json';
const AUTH_STDERR = 'Open this URL to sign in: https://accounts.google.com/o/oauth2/auth?client_id=x';

function agyRaw(events: object[], overrides: Partial<RawSession> = {}): RawSession {
  const text = events.map((event) => JSON.stringify(event)).join('\n');
  return {
    spawnError: undefined,
    timedOut: false,
    stderr: '',
    parsed: parseAgyStream(text),
    exitStatus: 0,
    ...overrides,
  };
}

describe('classifySession for an Antigravity session that exited 0', () => {
  describe('success cases', () => {
    it('grades a SUCCESS session whose init shows the requested model and the skip-permissions mode', () => {
      // ARRANGE
      const expected = { outcome: 'graded' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT, AGY_RESULT]), AGY_EXPECT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names an authentication failure from stderr when the stream stops after init, whatever the exit status', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'authentication-failure' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT], { stderr: AUTH_STDERR }), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('names an authentication failure from a non-SUCCESS result whose response says so', () => {
      // ARRANGE
      const failed = {
        event: 'result',
        result: { status: 'FAILED', response: 'Authentication required', num_turns: 0 },
      };
      const expected = { outcome: 'instrument-failure', kind: 'authentication-failure' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT, failed]), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('names a denied write from stderr even though the stream ends in a SUCCESS result and the exit was 0', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'permission-denied' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT, AGY_RESULT], { stderr: DENIED_STDERR }), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('names a denied write that left no result at all as a denial, not as an unparseable stream', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'permission-denied' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT], { stderr: DENIED_STDERR }), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('names agy stopping at its own print timeout as the wall-clock timeout', () => {
      // ARRANGE
      const timeout = { event: 'result', result: { status: 'TIMEOUT', response: '', num_turns: 4 } };
      const expected = { outcome: 'instrument-failure', kind: 'wall-clock-timeout' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT, timeout]), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('fails the init assertion when agy ran a different model than the cell asked for', () => {
      // ARRANGE
      const other = { ...AGY_INIT, init: { ...AGY_INIT.init, model: 'claude-sonnet-5-5-medium' } };
      const expected = {
        outcome: 'instrument-failure',
        kind: 'init-assertion-failed',
        detail: 'model claude-sonnet-5-5-medium',
      };
      // ACT
      const actual = classifySession(agyRaw([other, AGY_RESULT]), AGY_EXPECT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('fails the init assertion when the permission mode is not the one the argv asked for', () => {
      // ARRANGE
      const other = { ...AGY_INIT, init: { ...AGY_INIT.init, permission_mode: 'ask' } };
      const expected = { outcome: 'instrument-failure', kind: 'init-assertion-failed' };
      // ACT
      const actual = classifySession(agyRaw([other, AGY_RESULT]), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('does not call a stream with no result an authentication failure when stderr says nothing about it', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'no-parseable-stream' };
      // ACT
      const actual = classifySession(agyRaw([AGY_INIT], { stderr: 'something else' }), AGY_EXPECT);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('leaves a Claude Code session with no model expectation unconstrained on model', () => {
      // ARRANGE
      const expected = { outcome: 'graded' };
      // ACT
      const actual = classifySession(raw([INIT, result({})]), EXPECT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('sessionCause', () => {
  describe('success cases', () => {
    it('names the cause of a session that failed before grading, with no init expectation to hold it to', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'authentication-failure' };
      // ACT
      const actual = sessionCause(agyRaw([AGY_INIT], { stderr: AUTH_STDERR }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('names a denied write too, so a canary does not blame the pull command for an auto-denied write', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'permission-denied' };
      // ACT
      const actual = sessionCause(agyRaw([AGY_INIT, AGY_RESULT], { stderr: DENIED_STDERR }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('names nothing for a session that ran clean, leaving the canary to read its stream', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = sessionCause(agyRaw([AGY_INIT, AGY_RESULT]));
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
