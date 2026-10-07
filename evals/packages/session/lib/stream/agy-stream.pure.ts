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

import { asList, asRecord, asString } from './json-values.pure.ts';
import type { Json } from './json-values.types.ts';
import type { StreamDraft as Draft, InitFacts, ParsedSession, ResultFacts } from './session-stream.types.ts';
import { assembleStream } from './stream-envelope.pure.ts';
import type { DraftedEvents, StreamDialect } from './stream-envelope.types.ts';

const TOOL_NAMES: Readonly<Record<string, string>> = { write_to_file: 'Write', run_command: 'Bash', view_file: 'Read' };

/** The parameters the parser reads from a finished call, per `agy` tool; a tool absent here is passed through unread. */
const TOOL_PARAMETERS: Readonly<Record<string, readonly string[]>> = {
  write_to_file: ['TargetFile', 'CodeContent'],
  run_command: ['CommandLine'],
};

/** The keys a step's updates ever carried, whatever their values: a blank value is a key that was there. */
interface SeenKeys {
  readonly parameters: ReadonlySet<string>;
  readonly info: ReadonlySet<string>;
}

interface Step {
  readonly index: number;
  readonly type: string;
  readonly tool: string;
  readonly state: string;
  readonly parameters: Json;
  readonly output: string;
  readonly text: string;
  readonly seen: SeenKeys;
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

function toStep(raw: Json, seen: SeenKeys = { parameters: new Set(), info: new Set() }): Step {
  const info = asRecord(raw.tool_info);
  return {
    seen,
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

/** Which tool_info and parameter keys each step's updates carried, by step index. */
function seenKeysByStep(updates: readonly Json[]): Map<number, SeenKeys> {
  const seen = new Map<number, { parameters: Set<string>; info: Set<string> }>();
  for (const update of updates) {
    const index = toStep(update).index;
    const keys = seen.get(index) ?? { parameters: new Set<string>(), info: new Set<string>() };
    const info = asRecord(update.tool_info);
    Object.keys(info).forEach((key) => keys.info.add(key));
    Object.keys(asRecord(info.parameters)).forEach((key) => keys.parameters.add(key));
    seen.set(index, keys);
  }
  return seen;
}

/** The expected keys a finished write or shell call lacks; a call that failed or never finished is not held to them. */
function shapeProblems(step: Step): string[] {
  const wanted = TOOL_PARAMETERS[step.tool];
  if (step.type !== 'tool' || wanted === undefined || step.state !== 'DONE') return [];
  const missing = wanted.filter((key) => !step.seen.parameters.has(key));
  const output = step.seen.info.has('output') || step.seen.info.has('error') ? [] : ['output'];
  return [...missing, ...output].map((key) => `${step.tool} step-${step.index} lacks ${key}`);
}

/** The events and shape problems of every step in step order: a step that never left ACTIVE is a call with no result. */
function stepEvents(updates: readonly Json[]): DraftedEvents {
  const steps = new Map<number, Json>();
  const seen = seenKeysByStep(updates);
  for (const update of updates) {
    const index = toStep(update).index;
    steps.set(index, mergeRaw(steps.get(index) ?? {}, update));
  }
  const ordered = [...steps.values()]
    .map((raw) => toStep(raw, seen.get(toStep(raw).index)))
    .sort((left, right) => left.index - right.index);
  return { drafts: ordered.flatMap(stepDrafts), unexpectedShapes: ordered.flatMap(shapeProblems) };
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

const dialect: StreamDialect = {
  isInit: (line) => line.event === 'init',
  isResult: (line) => line.event === 'result',
  initBody: (line) => asRecord(line.init),
  resultBody: (line) => asRecord(line.result),
  initKeys: ['model', 'cwd', 'tools', 'permission_mode'],
  resultKeys: ['status', 'response', 'num_turns'],
  initLineKeys: ['conversation_id'],
  initFacts,
  resultFacts: (line, init) => resultFacts(line, init?.model ?? ''),
  drafted: (lines, init): DraftedEvents => {
    const updates = lines.filter((line) => line.event === 'step_update').map((line) => asRecord(line.step_update));
    const steps = stepEvents(updates);
    const opening: Draft[] = init === undefined ? [] : [{ kind: 'init' }];
    return { drafts: [...opening, ...steps.drafts], unexpectedShapes: steps.unexpectedShapes };
  },
};

export function parseAgyStream(text: string): ParsedSession {
  return assembleStream(text, dialect);
}
