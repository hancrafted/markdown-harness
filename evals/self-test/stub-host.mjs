#!/usr/bin/env node
// A hand-written stand-in for the Host harness, for the deterministic and self-test
// tiers. It is a process-boundary stand-in, not a mock: a real executable that
// takes the real argv, runs the root's real hook script, writes a real file and
// prints a stream shaped like Claude Code's. No model is behind it.
//
//   node stub-host.mjs [--mode obey|ignore|auth-fail|slow] [--log <file>] -p <task> ...
//
// obey: acts like an agent that does what the hook (or the user turn) tells it.
// ignore: writes a plain note and never uses what it was told.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const mode = flag('--mode') ?? 'obey';
const logFile = flag('--log');
const task = flag('-p') ?? '';
const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const startedAt = Date.now();
const root = process.cwd();
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);

function finish(code = 0) {
  if (logFile)
    appendFileSync(logFile, `${JSON.stringify({ nonce, pid: process.pid, startedAt, endedAt: Date.now() })}\n`);
  process.exit(code);
}

const hooksOn = existsSync(join(root, '.claude', 'settings.json'));
emit({
  type: 'system',
  subtype: 'init',
  session_id: `stub-${nonce}`,
  model: 'stub-model',
  claude_code_version: 'stub-1',
  permissionMode: 'acceptEdits',
  apiKeySource: 'none',
  skills: [],
  mcp_servers: [],
  plugins: [{ name: 'cc-plugin-agents-md' }, { name: 'cc-plugin-telemetry' }],
});

if (mode === 'auth-fail') {
  emit({
    type: 'result',
    subtype: 'error',
    is_error: true,
    num_turns: 0,
    terminal_reason: 'api_error',
    result: 'Not logged in · Please run /login',
  });
  finish(0);
}
if (mode === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));

const target = /docs\/[\w./-]+\.md/.exec(task)?.[0] ?? 'docs/research/note.md';
const announce = (id, content) =>
  emit({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id, name: 'Write', input: { file_path: join(root, target), content } }] },
  });
const land = (id, content) => {
  mkdirSync(dirname(join(root, target)), { recursive: true });
  writeFileSync(join(root, target), content);
  emit({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'File written', is_error: false }] },
  });
};
const write = (id, content) => {
  announce(id, content);
  land(id, content);
};

const CODE = /\b[A-Z]{2}\d{2}-\d{4}\b/;
const draft = '---\ntype: research\ndescription: A note.\n---\n\n# Note\n\n## Findings\n\nSomething was found.\n';
const noteWith = (code) => `${draft}\n${code}\n`;

let told = CODE.exec(task)?.[0];
if (hooksOn && mode !== 'ignore') {
  emit({ type: 'assistant', message: { content: [{ type: 'text', text: 'Writing the note.' }] } });
  // PreToolUse: the call is announced, the hook runs BEFORE the file exists, then the write lands.
  announce('w1', draft);
  const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(root, target) } });
  emit({ type: 'system', subtype: 'hook_started', hook_name: 'PreToolUse:Write' });
  const run = spawnSync(process.execPath, [join(root, '.agents/skills/markdown-harness/scripts/query-hook.mjs')], {
    cwd: root,
    input: payload,
    encoding: 'utf8',
  });
  emit({ type: 'system', subtype: 'hook_response', hook_name: 'PreToolUse:Write', output: run.stdout });
  land('w1', draft);
  told = CODE.exec(run.stdout)?.[0] ?? told;
  if (told) write('w2', noteWith(told));
} else {
  write('w1', mode === 'ignore' || !told ? draft : noteWith(told));
}

emit({
  type: 'result',
  subtype: 'success',
  is_error: false,
  num_turns: 3,
  terminal_reason: 'completed',
  result: 'Done.',
  modelUsage: { 'stub-model': {} },
  permission_denials: [],
});
finish(0);
