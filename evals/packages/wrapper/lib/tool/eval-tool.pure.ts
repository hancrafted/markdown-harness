// The eval tool's pin and the hazards the wrapper neutralises, in one place. The
// version is recorded in every cohort row. The tool's own exit code is neutralised
// here and ignored by the exit derivation regardless.

export const PROMPTFOO_VERSION = '0.124.0';

export function toolArgv(settings: { configPath: string; trials: number; resultsPath: string }): string[] {
  return [
    '-y',
    `promptfoo@${PROMPTFOO_VERSION}`,
    'eval',
    '-c',
    settings.configPath,
    '--no-cache',
    '--max-concurrency',
    '1',
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
    PROMPTFOO_CACHE_ENABLED: 'false',
    PROMPTFOO_FAILED_TEST_EXIT_CODE: '0',
  };
}
