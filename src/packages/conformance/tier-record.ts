import { fileNameOf } from '../foundation/host-path.ts';
import { runnerFileFor } from './lib/tier/tier-name.pure.ts';
import type { ConformanceTier } from './lib/tier/tier-record.types.ts';

export type { ConformanceTier } from './lib/tier/tier-record.types.ts';

/**
 * Every Conformance tier and the metadata its runner must use.
 *
 * This is the declaration point for the fixture directory, case shape, config
 * filename, reviewed case count, and assessment instant where applicable.
 */
export const CONFORMANCE_TIERS = [
  {
    name: 'frontmatter',
    caseKind: 'markdown',
    configFile: 'valid-test-config.yaml',
    caseCount: 40,
    assessmentInstant: '2026-12-01T00:00:00Z',
  },
  {
    name: 'rejected-config',
    caseKind: 'rejected-config',
    configFile: 'markdown-harness.config.yaml',
    caseCount: 16,
  },
] as const satisfies readonly ConformanceTier[];

/** The declared `frontmatter` tier. */
export function tierNamed(name: 'frontmatter'): (typeof CONFORMANCE_TIERS)[0];
/** The declared `rejected-config` tier. */
export function tierNamed(name: 'rejected-config'): (typeof CONFORMANCE_TIERS)[1];
/** The declared tier named `name`, never an implicit fallback. */
export function tierNamed(name: string): (typeof CONFORMANCE_TIERS)[number];
export function tierNamed(name: string): (typeof CONFORMANCE_TIERS)[number] {
  const tier = CONFORMANCE_TIERS.find((candidate) => candidate.name === name);
  if (tier === undefined) throw new Error(`no Conformance tier named ${name}`);
  return tier;
}

/** The declared tier whose runner is the module at `moduleUrl`. */
export function tierForRunner(moduleUrl: string): ConformanceTier {
  const runner = fileNameOf(moduleUrl);
  const tier = CONFORMANCE_TIERS.find((candidate) => runnerFileFor(candidate.name) === runner);
  if (tier === undefined) throw new Error(`no Conformance tier runner named ${runner}`);
  return tier;
}
