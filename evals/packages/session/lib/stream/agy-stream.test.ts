// Colocated unit test for the Antigravity stream parser. Every stream here is hand-written from the shapes R3
// recorded for `agy` 1.3.0 `--output-format stream-json`. UNVERIFIED AGAINST A LIVE SESSION: R3 recorded the
// init, step_update and result envelopes and the `TargetFile` parameter, but not the name of a write's content
// parameter, a shell call's command parameter, or the field that carries a tool's output. Those three are this
// parser's assumptions (CodeContent, CommandLine, output), and a live stream will say whether they hold; the
// missing-key list is how a wrong guess shows.

import { describe, expect, it } from 'vitest';
import { parseAgyStream } from './agy-stream.pure.ts';

const INIT = {
  event: 'init',
  init: {
    model: 'gemini-3.8-flash-low',
    cwd: '/r',
    tools: ['run_command', 'view_file', 'write_to_file'],
    permission_mode: 'always-proceed',
  },
  conversation_id: 'c-1',
};

const step = (index: number, state: string, fields: object) => ({
  event: 'step_update',
  step_update: { step_index: index, state, ...fields },
});

const WRITE = { step_type: 'tool', tool_name: 'write_to_file' };
const WRITE_PARAMS = { parameters: { TargetFile: '/r/docs/a.md', CodeContent: 'hello' } };

const RESULT = {
  event: 'result',
  result: { status: 'SUCCESS', response: 'Done.', num_turns: 2, duration_seconds: 7.4, usage: { input_tokens: 10 } },
};

const ofKind = (parsed: ReturnType<typeof parseAgyStream>, kind: string) =>
  parsed.events.filter((event) => event.kind === kind);

const lines = (...events: object[]): string => events.map((event) => JSON.stringify(event)).join('\n');

const SUCCESS = lines(
  INIT,
  step(0, 'DONE', { step_type: 'user_input', text_delta: 'task' }),
  step(1, 'ACTIVE', { step_type: 'agent_response', text_delta: 'Writing ' }),
  step(1, 'DONE', { step_type: 'agent_response', text_delta: 'it.' }),
  step(2, 'ACTIVE', { ...WRITE, tool_info: { parameters: { TargetFile: '/r/docs/a.md' } } }),
  step(2, 'DONE', { ...WRITE, tool_info: { ...WRITE_PARAMS, output: 'File written' } }),
  RESULT,
);

describe('parseAgyStream', () => {
  describe('success cases', () => {
    it('reads the init event into the facts the isolation assertions read', () => {
      // ARRANGE
      const expected = {
        model: 'gemini-3.8-flash-low',
        permissionMode: 'always-proceed',
        sessionId: 'c-1',
        toolCount: 3,
        apiKeySource: 'unknown',
        version: 'unknown',
        skills: [],
        mcpServers: [],
        plugins: [],
      };
      // ACT
      const parsed = parseAgyStream(SUCCESS);
      // ASSERT
      expect(parsed.init).toEqual(expected);
    });

    it('reads a SUCCESS result as completed, with the turn count and response', () => {
      // ARRANGE
      const expected = {
        subtype: 'SUCCESS',
        isError: false,
        terminalReason: 'completed',
        numTurns: 2,
        text: 'Done.',
        modelsUsed: ['gemini-3.8-flash-low'],
        permissionDenials: 0,
      };
      // ACT
      const parsed = parseAgyStream(SUCCESS);
      // ASSERT
      expect(parsed.result).toEqual(expected);
    });

    it('normalises a write_to_file step into one Write call whose input carries the merged parameters', () => {
      // ARRANGE
      const kind = 'tool-call';
      const expected = [{ kind, tool: 'Write', input: { file_path: '/r/docs/a.md', content: 'hello' } }];
      // ACT
      const calls = ofKind(parseAgyStream(SUCCESS), kind);
      // ASSERT
      expect(calls).toMatchObject(expected);
      expect(calls).toHaveLength(expected.length);
    });

    it('pairs the call with a tool result that follows it and carries the step output', () => {
      // ARRANGE
      const expected = { kind: 'tool-result', isError: false, text: 'File written', id: 'step-2', seq: 3 };
      // ACT
      const parsed = parseAgyStream(SUCCESS);
      const [call] = ofKind(parsed, 'tool-call');
      const [result] = ofKind(parsed, 'tool-result');
      // ASSERT
      expect(result).toMatchObject(expected);
      expect(call).toMatchObject({ id: expected.id, seq: expected.seq - 1 });
    });

    it('joins the text deltas of one agent_response step into a single assistant text', () => {
      // ARRANGE
      const kind = 'assistant-text';
      const expected = [{ kind, text: 'Writing it.' }];
      // ACT
      const texts = ofKind(parseAgyStream(SUCCESS), kind);
      // ASSERT
      expect(texts).toMatchObject(expected);
      expect(texts).toHaveLength(expected.length);
    });

    it('normalises run_command to a Bash call carrying its command, so the query command is recognised', () => {
      // ARRANGE
      const stream = lines(
        INIT,
        step(1, 'DONE', {
          step_type: 'tool',
          tool_name: 'run_command',
          tool_info: { parameters: { CommandLine: 'bin/mh query docs/a.md' }, output: '{"ok":true}' },
        }),
        RESULT,
      );
      const kind = 'tool-call';
      const expected = { kind, tool: 'Bash', input: { command: 'bin/mh query docs/a.md' } };
      // ACT
      const [call] = ofKind(parseAgyStream(stream), kind);
      // ASSERT
      expect(call).toMatchObject(expected);
    });

    it('emits no hook event, because agy hook firing is unprobed and an absent class means unobservable', () => {
      // ARRANGE
      const forbidden = ['hook-start', 'hook-response'];
      // ACT
      const kinds = parseAgyStream(SUCCESS).events.map((event) => event.kind);
      // ASSERT
      for (const kind of forbidden) expect(kinds).not.toContain(kind);
    });
  });

  describe('failure cases', () => {
    it('reads a non-SUCCESS result as an error whose reason is the lower-cased status', () => {
      // ARRANGE
      const stream = lines(INIT, {
        event: 'result',
        result: { status: 'FAILED', response: 'Not signed in', num_turns: 0 },
      });
      const expected = { isError: true, terminalReason: 'failed', text: 'Not signed in', subtype: 'FAILED' };
      // ACT
      const parsed = parseAgyStream(stream);
      // ASSERT
      expect(parsed.result).toMatchObject(expected);
    });

    it('leaves the result undefined when the stream stops after init, as an auth wall does', () => {
      // ARRANGE
      const stream = lines(INIT);
      const expectedModel = 'gemini-3.8-flash-low';
      // ACT
      const parsed = parseAgyStream(stream);
      // ASSERT
      expect(parsed.result).toBeUndefined();
      expect(parsed.init?.model).toBe(expectedModel);
    });

    it('names an init key the stream lacks, so a changed wire shape is an instrument failure and not a score', () => {
      // ARRANGE
      const stream = lines({ event: 'init', init: { model: 'm', cwd: '/r' }, conversation_id: 'c' }, RESULT);
      const expected = ['init.tools', 'init.permission_mode'];
      // ACT
      const parsed = parseAgyStream(stream);
      // ASSERT
      expect(parsed.missingKeys).toEqual(expected);
    });

    it('names a result key the stream lacks', () => {
      // ARRANGE
      const stream = lines(INIT, { event: 'result', result: { status: 'SUCCESS' } });
      const expected = ['result.response', 'result.num_turns'];
      // ACT
      const parsed = parseAgyStream(stream);
      // ASSERT
      expect(parsed.missingKeys).toEqual(expected);
    });

    it('reads a tool step that ended in a state other than DONE as an errored result', () => {
      // ARRANGE
      const stream = lines(
        INIT,
        step(1, 'ERROR', { ...WRITE, tool_info: { parameters: { TargetFile: '/r/a.md' }, error: 'denied' } }),
        RESULT,
      );
      const kind = 'tool-result';
      const expected = { kind, isError: true, text: 'denied' };
      // ACT
      const [result] = ofKind(parseAgyStream(stream), kind);
      // ASSERT
      expect(result).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('emits a call for a tool step that never reached DONE, with no result', () => {
      // ARRANGE
      const stream = lines(INIT, step(1, 'ACTIVE', { ...WRITE, tool_info: WRITE_PARAMS }));
      const expected = ['init', 'tool-call'];
      // ACT
      const kinds = parseAgyStream(stream).events.map((event) => event.kind);
      // ASSERT
      expect(kinds).toEqual(expected);
    });

    it('counts a line that is not a JSON object and skips it', () => {
      // ARRANGE
      const stream = `${lines(INIT)}\nnot json\n[1,2]\n${lines(RESULT)}`;
      const expected = { unparsedLines: 2, result: { isError: false } };
      // ACT
      const parsed = parseAgyStream(stream);
      // ASSERT
      expect(parsed).toMatchObject(expected);
    });

    it('passes an unrecognised tool name through unchanged, with its parameters as input', () => {
      // ARRANGE
      const stream = lines(
        INIT,
        step(1, 'DONE', { step_type: 'tool', tool_name: 'grep_search', tool_info: { parameters: { Query: 'x' } } }),
      );
      const kind = 'tool-call';
      const expected = { kind, tool: 'grep_search', input: { Query: 'x' } };
      // ACT
      const [call] = ofKind(parseAgyStream(stream), kind);
      // ASSERT
      expect(call).toMatchObject(expected);
    });

    it('reads empty output as an empty stream with nothing parsed', () => {
      // ARRANGE
      const expected = { events: [], init: undefined, result: undefined, unparsedLines: 0, missingKeys: [] };
      // ACT
      const parsed = parseAgyStream('');
      // ASSERT
      expect(parsed).toEqual(expected);
    });
  });
});
