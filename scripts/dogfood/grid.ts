/**
 * The grid: two configs, three Host harnesses, six cells.
 *
 * Shared by the builder and the scorer because a second copy of the arm-to-config
 * mapping is a copy that can drift, and a scorer reading a run against the wrong
 * config produces numbers that look fine and mean nothing.
 */

/** The two configs under test, by the name the grid calls each arm. */
export const CONFIGS = { A: 'markdown-harness.config.yaml', B: 'markdown-harness.config.b.yaml' } as const;

export type Arm = keyof typeof CONFIGS;

export const ARMS = Object.keys(CONFIGS) as readonly Arm[];

/** One pack per Host harness, so every arm is replicated across all three. */
export const HOSTS = ['haiku', 'sonnet', 'gemini'] as const;

export function packName(arm: Arm, host: string): string {
  return `run-${arm}-${host}`;
}

/** The arm a pack belongs to, read back from its directory name. */
export function armOf(packDirName: string): Arm {
  const arm = ARMS.find((candidate) => packDirName.startsWith(`run-${candidate}-`));
  if (arm === undefined) throw new Error(`not a pack directory name: ${packDirName}`);
  return arm;
}
