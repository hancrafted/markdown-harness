// The live-script exclusion scanner. Expands the gate and commit chains through
// every `npm run <name>` they invoke, reads the workflow text, and fails when a
// live or self-test script name, the eval tool's name or a Host harness
// invocation appears. A scan that expanded to nothing is itself a violation.

import type { ScanInput, ScanReport } from './live-exclusion.types.ts';

const INVOKES = /(?:npm run|npm run-script|pnpm run|yarn run|yarn)\s+([\w:.-]+)/g;

function invoked(command: string): string[] {
  return [...command.matchAll(INVOKES)].map((match) => match[1] ?? '');
}

function expand(input: ScanInput): string[] {
  const seen: string[] = [];
  const queue = [...input.gateScripts];
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    const command = input.scripts[name];
    if (command === undefined || seen.includes(name)) continue;
    seen.push(name);
    queue.push(...invoked(command));
  }
  return seen;
}

function hits(text: string, forbidden: readonly string[], where: string): string[] {
  return forbidden.filter((name) => text.includes(name)).map((name) => `${where} names ${name}`);
}

export function scanForLiveScripts(input: ScanInput): ScanReport {
  const chain = expand(input);
  const fromScripts = chain.flatMap((name) => hits(input.scripts[name] ?? '', input.forbidden, `script ${name}`));
  const fromChain = chain
    .filter((name) => input.forbidden.includes(name))
    .map((name) => `the gate chain reaches ${name}`);
  const fromWorkflows = Object.entries(input.workflows).flatMap(([path, text]) => hits(text, input.forbidden, path));
  const empty = chain.length === 0 ? ['the scan read nothing: no gate script expanded'] : [];
  return { chain, violations: [...empty, ...fromScripts, ...fromChain, ...fromWorkflows] };
}

const TOOL_AND_HOST = ['promptfoo', 'claude -p', 'agy -p'];

/**
 * The names a gate chain or workflow must never reach, derived from the manifest so a new live script cannot
 * be forgotten: every `evals:*` script name, the `run-*` entry file each one invokes, the eval tool, and a
 * Host harness invocation.
 */
export function forbiddenNames(scripts: Readonly<Record<string, string>>): string[] {
  const live = Object.entries(scripts).filter(([name]) => name.startsWith('evals:'));
  const entries = live.flatMap(([, command]) =>
    [...command.matchAll(/\b(run-[\w-]+)\.ts\b/g)].map((match) => match[1] ?? ''),
  );
  return [...new Set([...live.map(([name]) => name), ...entries, ...TOOL_AND_HOST])];
}
