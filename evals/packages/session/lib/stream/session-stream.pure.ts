// The Claude Code stream parser: newline-delimited JSON in, normalised events and
// the init and result facts out. It never reads an exit code; failure is read from
// the result event's error flag and terminal reason.
//
// An event class the Host harness did not emit is absent, never an empty
// placeholder, because absence is how an unobservable rung is told from a clean one.

import { asList, asRecord, asString } from './json-values.pure.ts';
import type { Json } from './json-values.types.ts';
import type { StreamDraft as Draft, InitFacts, ParsedSession, ResultFacts } from './session-stream.types.ts';
import { assembleStream } from './stream-envelope.pure.ts';
import type { DraftedEvents, StreamDialect } from './stream-envelope.types.ts';

/** The keys the parser reads from a tool call's input, per tool; a tool absent here is passed through unread. */
const TOOL_INPUT_KEYS: Readonly<Record<string, readonly string[]>> = {
  Write: ['file_path', 'content'],
  Edit: ['file_path'],
  Bash: ['command'],
  Read: ['file_path'],
};

/** The expected keys a tool call's input lacks, each named by tool, call id and key. */
function shapeProblems(tool: string, id: string, input: Json): string[] {
  return (TOOL_INPUT_KEYS[tool] ?? []).filter((key) => !(key in input)).map((key) => `${tool} ${id} lacks ${key}`);
}

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

const dialect: StreamDialect = {
  isInit: (line) => line.type === 'system' && line.subtype === 'init',
  isResult: (line) => line.type === 'result',
  initBody: (line) => line,
  resultBody: (line) => line,
  initKeys: [
    'apiKeySource',
    'model',
    'claude_code_version',
    'permissionMode',
    'session_id',
    'skills',
    'mcp_servers',
    'plugins',
  ],
  resultKeys: ['is_error', 'terminal_reason', 'result'],
  initLineKeys: [],
  initFacts,
  resultFacts,
  drafted: (lines): DraftedEvents => {
    const drafts = lines.flatMap(draftsOf);
    const unexpectedShapes = drafts.flatMap((draft) =>
      draft.kind === 'tool-call' ? shapeProblems(draft.tool, draft.id, draft.input) : [],
    );
    return { drafts, unexpectedShapes };
  },
};

export function parseSessionStream(text: string): ParsedSession {
  return assembleStream(text, dialect);
}
