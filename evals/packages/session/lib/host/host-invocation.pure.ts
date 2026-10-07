// The Claude Code argv and child-environment builders. The flag set was re-read
// from `claude --help` (2.1.285) at implementation. The environment is an
// allow-list, not a deny-list: anything not named here never reaches the child,
// which is what keeps the proxy base URL, an API key and the parent session's
// `CLAUDE_CODE_*` variables out.

import type { ClaudeArgvInput } from './host-invocation.types.ts';

export const ALLOWED_ENVIRONMENT: readonly string[] = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR'];

const FORCED_ENVIRONMENT: Readonly<Record<string, string>> = { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };

export function buildClaudeArgv(input: ClaudeArgvInput): string[] {
  return [
    '-p',
    input.task,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-hook-events',
    '--max-turns',
    String(input.maxTurns),
    '--no-session-persistence',
    '--model',
    input.model,
    '--setting-sources',
    'project',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--permission-mode',
    'acceptEdits',
    '--tools',
    input.tools.join(','),
    ...(input.allowedTools.length === 0 ? [] : ['--allowedTools', ...input.allowedTools]),
  ];
}

export function buildChildEnvironment(parent: Readonly<Record<string, string | undefined>>): Record<string, string> {
  const allowed = ALLOWED_ENVIRONMENT.flatMap((name) => {
    const value = parent[name];
    return value === undefined ? [] : [[name, value] as const];
  });
  return { ...Object.fromEntries(allowed), ...FORCED_ENVIRONMENT };
}
