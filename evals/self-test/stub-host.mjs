#!/usr/bin/env node
// A hand-written stand-in for the Host harness, for the deterministic and self-test
// tiers. It is a process-boundary stand-in, not a mock: a real executable that
// takes the real argv, runs the root's real hook script, writes a real file and
// prints a stream shaped like Claude Code's. No model is behind it.
//
//   node stub-host.mjs [--mode obey|deaf|ignore|partial|shell|auth-fail|slow] [--log <file>] [--say <word>] -p <task> ...
//
// obey: acts like an agent that does what the hook, the pull command (bin/mh) or the user turn tells it.
// deaf: the hook or the pull command delivers, and the agent does not act on it (a rung 4 null for the hook).
// ignore: writes a plain note, never reads the hook or runs the pull command (a rung 3 null).
// partial: acts on only the first steering code it was given (a rung 9 partial profile).
// shell: creates the file through the Bash tool when the Host harness was given one, so the Write hook never fires.
//
// An argv holding --print-timeout is read as Antigravity's (`agy`) and answered in its stream shape instead, with
// no hook (agy hook firing is unprobed, so the stand-in never runs one). Its modes:
// obey, deaf, ignore, slow as above; auth-fail: init then a stderr sign-in line, no result, exit 0;
// denied: the write is auto-denied, a stderr line says so, the stream ends in SUCCESS and the exit is 0, as R3 saw.
// The shapes are hand-written from R3, not recorded from a live session.

import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const mode = flag('--mode') ?? 'obey';
const logFile = flag('--log');
const task = flag('-p') ?? '';
const shellGranted = (flag('--tools') ?? '').split(',').includes('Bash');
const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const startedAt = Date.now();
const root = process.cwd();
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);

function finish(code = 0) {
  if (logFile)
    appendFileSync(logFile, `${JSON.stringify({ nonce, pid: process.pid, startedAt, endedAt: Date.now() })}\n`);
  process.exit(code);
}

if (argv.includes('--print-timeout')) await runAgy();

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
// A pre-screen session: no tools offered. It answers in plain text and writes nothing; --say plants a word.
if (argv.includes('--tools') && flag('--tools') === '') {
  const say = flag('--say');
  emit({
    type: 'assistant',
    message: { content: [{ type: 'text', text: `Here is a short answer.${say ? ` ${say}.` : ''}` }] },
  });
  emit({
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 1,
    terminal_reason: 'completed',
    result: 'Done.',
    modelUsage: { 'stub-model': {} },
    permission_denials: [],
  });
  finish(0);
}
if (mode === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));

const target = /docs\/[\w./-]+\.md/.exec(task)?.[0] ?? 'docs/research/note.md';
const via = mode === 'shell' && shellGranted ? 'Bash' : 'Write';
const announce = (id, content) =>
  emit({
    type: 'assistant',
    message: {
      content: [
        via === 'Bash'
          ? { type: 'tool_use', id, name: 'Bash', input: { command: `cat > ${target} <<'EOF'\n${content}\nEOF` } }
          : { type: 'tool_use', id, name: 'Write', input: { file_path: join(root, target), content } },
      ],
    },
  });
const resultOf = (id, text) =>
  emit({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: id, content: text, is_error: false }] },
  });
const land = (id, content) => {
  mkdirSync(dirname(join(root, target)), { recursive: true });
  writeFileSync(join(root, target), content);
  resultOf(id, 'File written');
};
const writeNote = (id, content) => {
  announce(id, content);
  land(id, content);
};

const CODES = /\b[A-Z]{2}\d{2}-\d{4}\b/g;
const codesIn = (text) => [...new Set(text.match(CODES) ?? [])].slice(0, mode === 'partial' ? 1 : undefined);
const draft = '---\ntype: research\ndescription: A note.\n---\n\n# Note\n\n## Findings\n\nSomething was found.\n';
const noteWith = (codes) => (codes.length === 0 ? draft : `${draft}\n${codes.join('\n')}\n`);

const isPull = existsSync(join(root, 'bin', 'mh'));
// the shell is given no hook: a Bash creation never reaches the Write matcher
const runsHook = hooksOn && mode !== 'ignore' && via === 'Write';
let told = codesIn(task);
if (isPull && mode !== 'ignore') {
  emit({ type: 'assistant', message: { content: [{ type: 'text', text: 'Checking the guidance first.' }] } });
  emit({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id: 'q1', name: 'Bash', input: { command: `bin/mh query ${target}` } }] },
  });
  const query = spawnSync(process.execPath, [join(root, 'bin/mh'), 'query', target], { cwd: root, encoding: 'utf8' });
  resultOf('q1', query.stdout);
  writeNote('w1', mode === 'deaf' ? draft : noteWith(codesIn(query.stdout)));
} else if (runsHook) {
  // 'deaf' runs the hook and then does not act on it
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
  told = codesIn(run.stdout);
  if (told.length > 0 && mode !== 'deaf') writeNote('w2', noteWith(told));
} else {
  writeNote('w1', mode === 'ignore' ? draft : noteWith(told));
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

// The Antigravity stand-in. Declared after use: function declarations are hoisted, and it needs the helpers above.
async function runAgy() {
  const model = flag('--model') ?? 'stub-agy-model';
  const stepEvent = (index, state, fields) =>
    emit({ event: 'step_update', step_update: { step_index: index, state, ...fields } });
  const tool = (index, name, parameters, output) => {
    stepEvent(index, 'ACTIVE', { step_type: 'tool', tool_name: name, tool_info: { parameters } });
    stepEvent(index, 'DONE', { step_type: 'tool', tool_name: name, tool_info: { parameters, output } });
  };
  emit({
    event: 'init',
    init: { model, cwd: root, tools: ['run_command', 'view_file', 'write_to_file'], permission_mode: 'always-proceed' },
    conversation_id: `stub-agy-${nonce}`,
  });
  if (mode === 'auth-fail') {
    process.stderr.write('Open this URL to sign in: https://accounts.google.com/o/oauth2/auth?client_id=stub\n');
    finish(0);
  }
  if (mode === 'slow') await new Promise((resolve) => setTimeout(resolve, 400));
  const agyTarget = /docs\/[\w./-]+\.md/.exec(task)?.[0] ?? 'docs/research/note.md';
  const agyCodes = (text) => [...new Set(text.match(/\b[A-Z]{2}\d{2}-\d{4}\b/g) ?? [])];
  const agyDraft = '---\ntype: research\ndescription: A note.\n---\n\n# Note\n\n## Findings\n\nSomething was found.\n';
  let index = 1;
  let told = agyCodes(task);
  if (existsSync(join(root, 'bin', 'mh')) && mode !== 'ignore') {
    const query = spawnSync(process.execPath, [join(root, 'bin/mh'), 'query', agyTarget], {
      cwd: root,
      encoding: 'utf8',
    });
    tool(index, 'run_command', { CommandLine: `bin/mh query ${agyTarget}` }, query.stdout);
    index += 1;
    if (mode !== 'deaf') told = agyCodes(query.stdout);
  }
  const content = mode === 'ignore' || mode === 'deaf' ? agyDraft : `${agyDraft}\n${told.join('\n')}\n`;
  if (mode === 'denied') {
    process.stderr.write(
      'jetski: no output produced \u2014 tool required "write_file" permission that headless mode cannot prompt for, so it auto-denied.\n',
    );
  } else {
    mkdirSync(dirname(join(root, agyTarget)), { recursive: true });
    writeFileSync(join(root, agyTarget), content);
    tool(index, 'write_to_file', { TargetFile: join(root, agyTarget), CodeContent: content }, 'File written');
  }
  emit({ event: 'result', result: { status: 'SUCCESS', response: 'Done.', num_turns: index, duration_seconds: 0.1 } });
  finish(0);
}
