// Colocated unit test for the stream parser, on hand-written streams: a success,
// an authentication failure and a denied permission. Its tests encode the
// author's belief about the wire shape; the first real stream becomes a fixture.

import { describe, expect, it } from 'vitest';
import { parseSessionStream } from './session-stream.pure.ts';

const INIT = {
  type: 'system',
  subtype: 'init',
  session_id: 's-1',
  model: 'claude-sonnet-5-5',
  claude_code_version: '2.1.285',
  permissionMode: 'acceptEdits',
  apiKeySource: 'none',
  skills: [],
  mcp_servers: [],
  plugins: [{ name: 'cc-plugin-agents-md' }],
};

function stream(...events: object[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

const WRITE_CALL = {
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id: 't1', name: 'Write', input: { file_path: '/r/a.md', content: 'hi' } }] },
};

const SUCCESS = stream(
  INIT,
  { type: 'system', subtype: 'hook_started', hook_name: 'PreToolUse:Write' },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'Writing it.' }, ...WRITE_CALL.message.content] } },
  { type: 'system', subtype: 'hook_response', hook_name: 'PreToolUse:Write', output: '{"x":1}' },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok', is_error: false }] } },
  {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 2,
    terminal_reason: 'completed',
    result: 'Done.',
    modelUsage: { 'claude-sonnet-5-5': {} },
    permission_denials: [],
  },
);

describe('parseSessionStream', () => {
  describe('success cases', () => {
    it('numbers the normalised events in stream order', () => {
      // ARRANGE
      const expected = ['init', 'hook-start', 'assistant-text', 'tool-call', 'hook-response', 'tool-result', 'result'];
      const expectedSeq = expected.map((_, index) => index);
      // ACT
      const parsed = parseSessionStream(SUCCESS);
      // ASSERT
      expect(parsed.events.map((event) => event.kind)).toEqual(expected);
      expect(parsed.events.map((event) => event.seq)).toEqual(expectedSeq);
    });

    it('reads the init and result facts the assertions need', () => {
      // ARRANGE
      const expected = {
        apiKey: 'none',
        plugin: ['cc-plugin-agents-md'],
        reason: 'completed',
        models: ['claude-sonnet-5-5'],
      };
      // ACT
      const { init, result } = parseSessionStream(SUCCESS);
      // ASSERT
      expect({
        apiKey: init?.apiKeySource,
        plugin: init?.plugins,
        reason: result?.terminalReason,
        models: result?.modelsUsed,
      }).toEqual(expected);
    });

    it('keeps the hook output verbatim and the tool input intact', () => {
      // ARRANGE
      const expectedOutput = '{"x":1}';
      const expectedCall = { tool: 'Write', input: { file_path: '/r/a.md', content: 'hi' } };
      // ACT
      const events = parseSessionStream(SUCCESS).events;
      const response = events.find((event) => event.kind === 'hook-response');
      const call = events.find((event) => event.kind === 'tool-call');
      // ASSERT
      expect(response).toMatchObject({ output: expectedOutput });
      expect(call).toMatchObject(expectedCall);
    });
  });

  describe('failure cases', () => {
    it('reads an authentication failure from the result event, not from any exit code', () => {
      // ARRANGE
      const text = stream(INIT, {
        type: 'result',
        subtype: 'error',
        is_error: true,
        num_turns: 0,
        terminal_reason: 'api_error',
        result: 'Not logged in · Please run /login',
      });
      const expected = { isError: true, terminalReason: 'api_error', text: 'Not logged in · Please run /login' };
      // ACT
      const result = parseSessionStream(text).result;
      // ASSERT
      expect(result).toMatchObject(expected);
    });

    it('records a denied permission as an error tool result and a denial count', () => {
      // ARRANGE
      const text = stream(
        INIT,
        WRITE_CALL,
        {
          type: 'user',
          message: {
            content: [{ type: 'tool_result', tool_use_id: 't1', content: 'permission denied', is_error: true }],
          },
        },
        {
          type: 'result',
          subtype: 'success',
          is_error: false,
          num_turns: 2,
          terminal_reason: 'completed',
          result: 'Could not write.',
          permission_denials: [{ tool_name: 'Write' }],
        },
      );
      const expectedKind = 'tool-result';
      const expectedDenials = 1;
      // ACT
      const parsed = parseSessionStream(text);
      // ASSERT
      expect(parsed.events.find((event) => event.kind === expectedKind)).toMatchObject({ isError: true });
      expect(parsed.result?.permissionDenials).toBe(expectedDenials);
    });

    it('reports missing expected keys on the init event as shape problems', () => {
      // ARRANGE
      const text = stream(
        { type: 'system', subtype: 'init' },
        { type: 'result', subtype: 'success', is_error: false, terminal_reason: 'completed', result: '' },
      );
      const expectedKey = 'init.apiKeySource';
      // ACT
      const missing = parseSessionStream(text).missingKeys;
      // ASSERT
      expect(missing).toContain(expectedKey);
    });
  });

  describe('edge cases', () => {
    it('counts lines that are not JSON objects and finds no result in an empty stream', () => {
      // ARRANGE
      const text = 'not json\n\n{"type":"system"}\n[1]';
      const expectedUnparsed = 2;
      // ACT
      const parsed = parseSessionStream(text);
      // ASSERT
      expect(parsed.unparsedLines).toBe(expectedUnparsed);
      expect(parsed.result).toBeUndefined();
    });
  });
});
