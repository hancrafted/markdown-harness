// The eval tool's pin and the hazards the wrapper neutralises, in one place. The
// version is recorded in every cohort row. The tool's own exit code is neutralised
// here and ignored by the exit derivation regardless.

import type { ToolSettings } from './eval-tool.types.ts';

export const PROMPTFOO_VERSION = '0.124.0';

export function toolArgv(settings: ToolSettings): string[] {
  return [
    '-y',
    `promptfoo@${PROMPTFOO_VERSION}`,
    'eval',
    '-c',
    settings.configPath,
    ...(settings.cache ? [] : ['--no-cache']),
    '--max-concurrency',
    String(settings.concurrency),
    '--repeat',
    String(settings.trials),
    '--no-progress-bar',
    '--no-write',
    '-o',
    settings.resultsPath,
  ];
}

export function toolEnvironment(
  parent: Readonly<Record<string, string | undefined>>,
  stateDir: string,
  cache = false,
): Record<string, string> {
  const inherited = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR'].flatMap((name) => {
    const value = parent[name];
    return value === undefined ? [] : [[name, value] as const];
  });
  return {
    ...Object.fromEntries(inherited),
    PROMPTFOO_CONFIG_DIR: stateDir,
    PROMPTFOO_DISABLE_TELEMETRY: '1',
    PROMPTFOO_DISABLE_UPDATE: '1',
    PROMPTFOO_DISABLE_SHARING: '1',
    PROMPTFOO_CACHE_ENABLED: String(cache),
    PROMPTFOO_FAILED_TEST_EXIT_CODE: '0',
  };
}
