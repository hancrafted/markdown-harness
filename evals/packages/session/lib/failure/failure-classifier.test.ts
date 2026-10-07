// Colocated unit test for the failure classifier. Exit code 0 from a Host harness
// proves nothing, so every case here is decided from stream fields, stderr and the
// spawn report. One case exercises a kind no provider produces yet (trap 15's shape).

import { describe, expect, it } from 'vitest';
import type { RawSession } from '../../classify-session.ts';
import { parseSessionStream } from '../../session-stream.ts';
import { classifySession } from './failure-classifier.pure.ts';

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
