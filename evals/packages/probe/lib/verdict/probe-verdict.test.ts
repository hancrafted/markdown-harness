// Colocated unit test for how a probe session is read into a recorded answer. Every verdict is decided from stream
// fields, stderr and what the workspace holds, never from the exit code, which R0 showed is 0 for a denied write
// and for a sign-in wall alike. A session that could not answer is inconclusive and records nothing.

import { describe, expect, it } from 'vitest';
import { parseAgyStream } from '../../../session/session-stream.ts';
import { verdictOf } from './probe-verdict.pure.ts';

type Evidence = Parameters<typeof verdictOf>[1];

const lines = (...events: object[]): string => events.map((event) => JSON.stringify(event)).join('\n');
const init = (permissionMode: string) => ({
  event: 'init',
  init: { model: 'm', cwd: '/r', tools: ['write_to_file'], permission_mode: permissionMode },
  conversation_id: 'c',
});
const RESULT = { event: 'result', result: { status: 'SUCCESS', response: 'ok', num_turns: 1 } };
const WRITE = (state: string, output: object) => ({
  event: 'step_update',
  step_update: {
    step_index: 1,
    state,
    step_type: 'tool',
    tool_name: 'write_to_file',
    tool_info: { parameters: { TargetFile: '/r/docs/research/probe-note.md', CodeContent: 'x' }, ...output },
  },
});
const WROTE = lines(init('always-proceed'), WRITE('DONE', { output: 'File written' }), RESULT);
const AUTH = 'Open this URL to sign in: https://accounts.google.com/o/oauth2/auth?client_id=x';
const DENIED = 'jetski: tool required "write_file" permission that headless mode cannot prompt for, so it auto-denied.';

function evidence(stdout: string, extra: Partial<Evidence> & { stderr?: string; timedOut?: boolean } = {}): Evidence {
  const { stderr = '', timedOut = false, ...rest } = extra;
  return {
    raw: { spawnError: undefined, timedOut, stderr, parsed: parseAgyStream(stdout) },
    sentinel: false,
    written: true,
    credentialFilesCopied: 0,
    mode: undefined,
    ...rest,
  };
}

describe('verdictOf hook-fires-headless', () => {
  describe('success cases', () => {
    it('records works when the write completed and the hook handler left its sentinel', () => {
      // ARRANGE
      const expected = { kind: 'recorded', result: { status: 'works' } };
      // ACT
      const actual = verdictOf('hook-fires-headless', evidence(WROTE, { sentinel: true }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('records fails when the write completed and no hook ran, naming the unverified schema it rests on', () => {
      // ARRANGE
      const expected = { kind: 'recorded', result: { status: 'fails', detail: expect.stringContaining('schema') } };
      // ACT
      const actual = verdictOf('hook-fires-headless', evidence(WROTE));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('is inconclusive when the session never wrote, because a silent hook then proves nothing', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive' };
      // ACT
      const actual = verdictOf('hook-fires-headless', evidence(lines(init('always-proceed'), RESULT)));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('is inconclusive on a sign-in wall, naming the failure kind', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive', reason: expect.stringContaining('authentication-failure') };
      // ACT
      const actual = verdictOf('hook-fires-headless', evidence(lines(init('always-proceed')), { stderr: AUTH }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });
});

describe('verdictOf scoped-permission-mode', () => {
  const scoped = lines(init('accept-edits'), WRITE('DONE', { output: 'File written' }), RESULT);

  describe('success cases', () => {
    it('records works with the mode and the permission mode the init event reported when a write passed under it', () => {
      // ARRANGE
      const expected = {
        kind: 'recorded',
        result: { status: 'works', mode: 'accept-edits', permissionMode: 'accept-edits' },
      };
      // ACT
      const actual = verdictOf('scoped-permission-mode', evidence(scoped, { mode: 'accept-edits' }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('records fails when the write was auto-denied under the mode', () => {
      // ARRANGE
      const stream = lines(init('accept-edits'), RESULT);
      const expected = { kind: 'recorded', result: { status: 'fails' } };
      // ACT
      const actual = verdictOf(
        'scoped-permission-mode',
        evidence(stream, { mode: 'accept-edits', written: false, stderr: DENIED }),
      );
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('records fails when the init event still reports skip-all, so the flag did not narrow anything', () => {
      // ARRANGE
      const expected = { kind: 'recorded', result: { status: 'fails' } };
      // ACT
      const actual = verdictOf('scoped-permission-mode', evidence(WROTE, { mode: 'accept-edits' }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('is inconclusive when nothing was denied and nothing was written', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive' };
      // ACT
      const actual = verdictOf(
        'scoped-permission-mode',
        evidence(lines(init('accept-edits'), RESULT), { mode: 'accept-edits', written: false }),
      );
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('is inconclusive on a sign-in wall rather than failing the mode for the account', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive' };
      // ACT
      const actual = verdictOf(
        'scoped-permission-mode',
        evidence(lines(init('accept-edits')), { mode: 'accept-edits', stderr: AUTH }),
      );
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });
});

describe('verdictOf scratch-home-credentials', () => {
  const ANSWERED = lines(init('always-proceed'), RESULT);

  describe('success cases', () => {
    it('records works when the session answered with only the credential files copied', () => {
      // ARRANGE
      const expected = { kind: 'recorded', result: { status: 'works' } };
      // ACT
      const actual = verdictOf('scratch-home-credentials', evidence(ANSWERED, { credentialFilesCopied: 2 }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('records fails when the scratch home was asked to sign in, so the copy did not carry the authentication', () => {
      // ARRANGE
      const expected = { kind: 'recorded', result: { status: 'fails' } };
      // ACT
      const actual = verdictOf(
        'scratch-home-credentials',
        evidence(lines(init('always-proceed')), { credentialFilesCopied: 2, stderr: AUTH }),
      );
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('is inconclusive when no credential file existed to copy, because a sign-in then says nothing about the copy', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive' };
      // ACT
      const actual = verdictOf(
        'scratch-home-credentials',
        evidence(lines(init('always-proceed')), { credentialFilesCopied: 0, stderr: AUTH }),
      );
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('is inconclusive when the session timed out', () => {
      // ARRANGE
      const expected = { kind: 'inconclusive' };
      // ACT
      const actual = verdictOf('scratch-home-credentials', evidence('', { credentialFilesCopied: 2, timedOut: true }));
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });
});
