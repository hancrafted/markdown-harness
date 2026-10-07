// The Antigravity (`agy`) stream parser: newline-delimited JSON in, the same normalised events and the init and
// result facts as the Claude Code parser out. It never reads an exit code. R0 settled that `agy` exits 0 on an
// authentication failure and on a denied write, so failure is read from the result event's status, and by the
// classifier from stderr.
//
// The envelope is from R3 (`agy` 1.3.0, measured once): an `init` event, `step_update` events keyed by a step
// index that move from ACTIVE to DONE, and a `result` event. UNVERIFIED: R3 did not record the name of a write's
// content parameter, a shell call's command parameter, or the field that carries a tool's output. This parser
// assumes CodeContent, CommandLine and `output`; a live stream that disagrees shows as an empty written text
// (rung 8 would then misread) so the first live stream must be checked against these three before any score
// from it is read.
//
// Tool names are normalised to the Claude Code names the observers key on: write_to_file is Write, run_command
// is Bash, view_file is Read. Any other tool name passes through unchanged. No hook event is ever emitted: hook
// firing in headless `agy` is unprobed, and an event class the Host harness did not emit is absent.

import { asList, asRecord, asString, missingFrom, parseLine } from './json-values.pure.ts';
import type { Json } from './json-values.types.ts';
import type { InitFacts, ParsedSession, ResultFacts, SessionEvent } from './session-stream.types.ts';

type Draft = SessionEvent extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

const TOOL_NAMES: Readonly<Record<string, string>> = { write_to_file: 'Write', run_command: 'Bash', view_file: 'Read' };
const INIT_KEYS = ['model', 'cwd', 'tools', 'permission_mode'];
const RESULT_KEYS = ['status', 'response', 'num_turns'];

interface Step {
  readonly index: number;
  readonly type: string;
  readonly tool: string;
  readonly state: string;
  readonly parameters: Json;
  readonly output: string;
  readonly text: string;
}

function inputOf(tool: string, parameters: Json): Json {
  if (tool === 'Write') {
    const { TargetFile, CodeContent, ...rest } = parameters;
    return { ...rest, file_path: asString(TargetFile), content: asString(CodeContent) };
  }
  if (tool === 'Bash') return { command: asString(parameters.CommandLine) };
  return parameters;
}

const isBlank = (value: unknown): boolean =>
  value === undefined || value === '' || (Object.keys(asRecord(value)).length === 0 && typeof value === 'object');

/** The entries of a record that carry something: a later update never blanks what an earlier one set. */
function present(record: Json): Json {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => !isBlank(value)));
}

/** One update folded into what the step held before: later facts win, blanks do not, text deltas accumulate. */
function mergeRaw(before: Json, update: Json): Json {
  const info = { ...asRecord(before.tool_info), ...present(asRecord(update.tool_info)) };
  const text = `${asString(before.text)}${asString(update.text_delta)}`;
  return { ...before, ...present(update), tool_info: info, text };
}

function toStep(raw: Json): Step {
  const info = asRecord(raw.tool_info);
  return {
    index: typeof raw.step_index === 'number' ? raw.step_index : -1,
    type: asString(raw.step_type),
    tool: asString(raw.tool_name),
    state: asString(raw.state),
    parameters: asRecord(info.parameters),
    output: asString(info.error) || asString(info.output),
    text: asString(raw.text),
  };
}

function toolDrafts(step: Step): Draft[] {
  const tool = TOOL_NAMES[step.tool] ?? step.tool;
  const id = `step-${step.index}`;
  const call: Draft = { kind: 'tool-call', id, tool, input: inputOf(tool, step.parameters) };
  if (step.state === 'ACTIVE') return [call];
  return [call, { kind: 'tool-result', id, isError: step.state !== 'DONE', text: step.output }];
}

function stepDrafts(step: Step): Draft[] {
  if (step.type === 'tool' && step.tool !== '') return toolDrafts(step);
  return step.type === 'agent_response' && step.text !== '' ? [{ kind: 'assistant-text', text: step.text }] : [];
}

/** The events of every step in step order: a step that never left ACTIVE is a call with no result. */
function stepEvents(updates: readonly Json[]): Draft[] {
  const steps = new Map<number, Json>();
  for (const update of updates) {
    const index = toStep(update).index;
    steps.set(index, mergeRaw(steps.get(index) ?? {}, update));
  }
  const ordered = [...steps.values()].map(toStep).sort((left, right) => left.index - right.index);
  return ordered.flatMap(stepDrafts);
}

function initFacts(line: Json): InitFacts {
  const init = asRecord(line.init);
  return {
    apiKeySource: 'unknown',
    model: asString(init.model),
    version: 'unknown',
    permissionMode: asString(init.permission_mode),
    sessionId: asString(line.conversation_id),
    toolCount: asList(init.tools).length,
    skills: [],
    mcpServers: [],
    plugins: [],
  };
}

function resultFacts(line: Json, model: string): ResultFacts {
  const result = asRecord(line.result);
  const status = asString(result.status);
  return {
    subtype: status,
    isError: status !== 'SUCCESS',
    terminalReason: status === 'SUCCESS' ? 'completed' : status.toLowerCase(),
    numTurns: typeof result.num_turns === 'number' ? result.num_turns : 0,
    text: asString(result.response),
    modelsUsed: model === '' ? [] : [model],
    permissionDenials: 0,
  };
}

function missingKeys(initLine: Json | undefined, resultLine: Json | undefined): string[] {
  const id = initLine === undefined || 'conversation_id' in initLine ? [] : ['conversation_id'];
  return [
    ...missingFrom(initLine && asRecord(initLine.init), INIT_KEYS, 'init'),
    ...id,
    ...missingFrom(resultLine && asRecord(resultLine.result), RESULT_KEYS, 'result'),
  ];
}

export function parseAgyStream(text: string): ParsedSession {
  const rows = text.split('\n').filter((row) => row.trim() !== '');
  const parsed = rows.map(parseLine).filter((line): line is Json => line !== undefined);
  const initLine = parsed.find((line) => line.event === 'init');
  const resultLine = parsed.find((line) => line.event === 'result');
  const updates = parsed.filter((line) => line.event === 'step_update').map((line) => asRecord(line.step_update));
  const init = initLine && initFacts(initLine);
  const drafts: Draft[] = [...(init === undefined ? [] : [{ kind: 'init' } as const]), ...stepEvents(updates)];
  return {
    events: drafts.map((draft, seq) => ({ ...draft, seq }) as SessionEvent),
    init,
    result: resultLine && resultFacts(resultLine, init?.model ?? ''),
    unparsedLines: rows.length - parsed.length,
    missingKeys: missingKeys(initLine, resultLine),
  };
}
