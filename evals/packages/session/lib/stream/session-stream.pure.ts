// The Claude Code stream parser: newline-delimited JSON in, normalised events and
// the init and result facts out. It never reads an exit code; failure is read from
// the result event's error flag and terminal reason.
//
// An event class the Host harness did not emit is absent, never an empty
// placeholder, because absence is how an unobservable rung is told from a clean one.

import { asList, asRecord, asString, missingFrom, parseLine } from './json-values.pure.ts';
import type { Json } from './json-values.types.ts';
import type { InitFacts, ParsedSession, ResultFacts, SessionEvent } from './session-stream.types.ts';

type Draft = SessionEvent extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

const names = (value: unknown): string[] =>
  asList(value).map((item) => (typeof item === 'string' ? item : asString(asRecord(item).name)));

function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  return asList(content)
    .map((part) => asString(asRecord(part).text))
    .join('\n');
}

function blockDraft(block: Json): Draft | undefined {
  if (block.type === 'text') return { kind: 'assistant-text', text: asString(block.text) };
  if (block.type !== 'tool_use') return undefined;
  return { kind: 'tool-call', id: asString(block.id), tool: asString(block.name), input: asRecord(block.input) };
}

function resultBlockDraft(block: Json): Draft | undefined {
  if (block.type !== 'tool_result') return undefined;
  return {
    kind: 'tool-result',
    id: asString(block.tool_use_id),
    isError: block.is_error === true,
    text: contentText(block.content),
  };
}

function systemDraft(line: Json): Draft[] {
  if (line.subtype === 'init') return [{ kind: 'init' }];
  const hookName = asString(line.hook_name);
  if (line.subtype === 'hook_started') return [{ kind: 'hook-start', hookName }];
  if (line.subtype === 'hook_response') return [{ kind: 'hook-response', hookName, output: asString(line.output) }];
  return [];
}

function draftsOf(line: Json): Draft[] {
  const blocks = asList(asRecord(line.message).content).map(asRecord);
  if (line.type === 'system') return systemDraft(line);
  if (line.type === 'assistant') return blocks.map(blockDraft).filter((draft): draft is Draft => draft !== undefined);
  if (line.type === 'user') return blocks.map(resultBlockDraft).filter((draft): draft is Draft => draft !== undefined);
  if (line.type === 'result') return [{ kind: 'result', text: asString(line.result) }];
  return [];
}

function initFacts(line: Json): InitFacts {
  return {
    apiKeySource: asString(line.apiKeySource),
    model: asString(line.model),
    version: asString(line.claude_code_version),
    permissionMode: asString(line.permissionMode),
    sessionId: asString(line.session_id),
    toolCount: asList(line.tools).length,
    skills: names(line.skills),
    mcpServers: names(line.mcp_servers),
    plugins: names(line.plugins),
  };
}

function resultFacts(line: Json): ResultFacts {
  return {
    subtype: asString(line.subtype),
    isError: line.is_error === true,
    terminalReason: asString(line.terminal_reason),
    numTurns: typeof line.num_turns === 'number' ? line.num_turns : 0,
    text: asString(line.result),
    modelsUsed: Object.keys(asRecord(line.modelUsage)),
    permissionDenials: asList(line.permission_denials).length,
  };
}

const INIT_KEYS = [
  'apiKeySource',
  'model',
  'claude_code_version',
  'permissionMode',
  'session_id',
  'skills',
  'mcp_servers',
  'plugins',
];
const RESULT_KEYS = ['is_error', 'terminal_reason', 'result'];

export function parseSessionStream(text: string): ParsedSession {
  const rows = text.split('\n').filter((row) => row.trim() !== '');
  const lines = rows.map(parseLine);
  const parsed = lines.filter((line): line is Json => line !== undefined);
  const initLine = parsed.find((line) => line.type === 'system' && line.subtype === 'init');
  const resultLine = parsed.find((line) => line.type === 'result');
  const events = parsed.flatMap(draftsOf).map((draft, seq) => ({ ...draft, seq }) as SessionEvent);
  return {
    events,
    init: initLine === undefined ? undefined : initFacts(initLine),
    result: resultLine === undefined ? undefined : resultFacts(resultLine),
    unparsedLines: rows.length - parsed.length,
    missingKeys: [...missingFrom(initLine, INIT_KEYS, 'init'), ...missingFrom(resultLine, RESULT_KEYS, 'result')],
  };
}
