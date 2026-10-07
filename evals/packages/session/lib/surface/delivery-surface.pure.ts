// The delivery surfaces a cell can measure, and what each one needs of the root and
// the Host harness. A pull surface gives the agent one shell command, `bin/mh query`,
// and an instruction-file line saying to use it; the shell allow-list holds that
// command and nothing else, until a cell widens it on purpose.

import type { DeliverySurface, Encoding, ShellScope } from './delivery-surface.types.ts';

export const SHIM_PATH = 'bin/mh';

const QUERY_ALLOWED = ['Bash(bin/mh query:*)', 'Bash(./bin/mh query:*)'];
// File-writing commands a widened cell adds, so an agent can create the target file without the Write tool.
const WRITING_ALLOWED = ['Bash(cat:*)', 'Bash(tee:*)', 'Bash(printf:*)', 'Bash(echo:*)', 'Bash(mkdir:*)'];

const COHERENT: Readonly<Record<DeliverySurface['channel'], { shells: ShellScope[]; encodings: Encoding[] }>> = {
  push: { shells: ['none', 'widened'], encodings: ['hook-prose'] },
  pull: { shells: ['query-only'], encodings: ['json', 'prose', 'intent-only'] },
  'user-turn': { shells: ['none'], encodings: ['none'] },
};

/** A sentence naming what is wrong with a surface, or undefined when its three fields agree. */
export function incoherentSurface(surface: DeliverySurface): string | undefined {
  const allowed = COHERENT[surface.channel];
  if (!allowed.shells.includes(surface.shell))
    return `shell ${surface.shell} is not a ${surface.channel} surface (${allowed.shells.join(' or ')})`;
  if (!allowed.encodings.includes(surface.encoding))
    return `encoding ${surface.encoding} is not a ${surface.channel} surface (${allowed.encodings.join(' or ')})`;
  return undefined;
}

/** The tools a session is given: the base set, plus the shell for any surface that grants one. */
export function toolsFor(shell: ShellScope, base: readonly string[]): string[] {
  return shell === 'none' ? [...base] : [...base, 'Bash'];
}

/** The shell permission patterns pre-approved for a session; any other shell command is denied in a headless run. */
export function allowedToolsFor(shell: ShellScope): string[] {
  if (shell === 'none') return [];
  return shell === 'query-only' ? QUERY_ALLOWED : [...QUERY_ALLOWED, ...WRITING_ALLOWED];
}

/** Whether a surface ships the hook script into the root: the push hook, or the prose pull command that renders through it. */
export function needsHookScript(surface: DeliverySurface): boolean {
  return surface.channel === 'push' || surface.encoding === 'prose';
}

/** The constructed instruction-file line a pull surface adds; the committed case supplies its words. */
export function withPullLine(instructions: string, pullLine: string): string {
  return `${instructions.replace(/\n*$/, '\n')}\n${pullLine}\n`;
}

const SHIM_HEAD = `#!/usr/bin/env node
'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const ENCODING = '__ENCODING__';
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'node_modules/@hancrafted/markdown-harness/dist/packages/cli/cli.js');
const hook = path.join(root, '.agents/skills/markdown-harness/scripts/query-hook.mjs');
const args = process.argv.slice(2);
const run = (file, argv, input) => spawnSync(process.execPath, [file, ...argv], { cwd: process.cwd(), input, encoding: 'utf8' });
`;

const SHIM_BODY = `const answer = run(cli, args);
const intents = (value) =>
  typeof value !== 'object' || value === null
    ? []
    : Object.entries(value).flatMap(([key, child]) => (key === 'intent' && typeof child === 'string' ? [child] : intents(child)));
function prose() {
  const payload = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path.resolve(process.cwd(), args[1] ?? '') } });
  return JSON.parse(run(hook, [], payload).stdout).hookSpecificOutput.additionalContext + '\\n';
}
function render() {
  if (args[0] !== 'query' || ENCODING === 'json') return answer.stdout;
  if (ENCODING === 'intent-only') return intents(JSON.parse(answer.stdout).result).join('\\n') + '\\n';
  return prose();
}
let text;
try {
  text = render();
} catch {
  text = 'No steering content for this path.\\n';
}
process.stdout.write(text);
process.stderr.write(answer.stderr);
process.exit(answer.status ?? 1);
`;

/**
 * The source of the pull command written to `bin/mh` in a minted root. It runs the copied, built `mh` and
 * returns its answer in the surface's encoding: untouched JSON, the hook's prose rendering, or the intents alone.
 */
export function pullShimSource(encoding: Encoding): string {
  return `${SHIM_HEAD.replace('__ENCODING__', encoding)}${SHIM_BODY}`;
}
