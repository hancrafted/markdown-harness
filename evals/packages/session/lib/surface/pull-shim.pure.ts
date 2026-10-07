// The source of the pull command written to `bin/mh` in a minted root, held apart from the surface rules because
// it is JavaScript carried as strings: nothing here is evaluated by this package.

import type { Encoding } from './delivery-surface.types.ts';

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
