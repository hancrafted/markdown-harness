import { fileNameOf } from '../foundation/host-path.ts';
import { runnerFileFor } from './lib/tier/tier-name.pure.ts';
import type { ConformanceTier } from './lib/tier/tier-record.types.ts';

export type { ConformanceTier } from './lib/tier/tier-record.types.ts';

/**
 * The adopter's default config file name, which `mh` finds with no flag.
 *
 * One constant for every tier whose config sits where an adopter's would: each
 * spec folder of a spec-folder tier is a synthetic repo root, and each
 * rejected-config case writes its bytes under the name a load would look for.
 */
export const ADOPTER_CONFIG_FILE = 'markdown-harness.config.yaml';

/**
 * Every Conformance tier and the metadata its runner must use.
 *
 * In directory-name order, because the enrolment check compares this list
 * against the tree's sorted directories and runners as an ordered sequence.
 *
 * This is the declaration point for the fixture directory, case shape, config
 * filename, reviewed case count, and assessment instant where applicable.
 */
export const CONFORMANCE_TIERS = [
  {
    name: 'body-structure',
    caseKind: 'spec-folder',
    configFile: ADOPTER_CONFIG_FILE,
    caseCount: 301,
  },
  {
    name: 'frontmatter',
    caseKind: 'markdown',
    configFile: 'valid-test-config.yaml',
    caseCount: 40,
    assessmentInstant: '2026-12-01T00:00:00Z',
  },
  {
    name: 'integrated',
    caseKind: 'markdown',
    configFile: 'valid-test-config.yaml',
    caseCount: 30,
  },
  {
    name: 'rejected-config',
    caseKind: 'rejected-config',
    configFile: ADOPTER_CONFIG_FILE,
    caseCount: 85,
  },
] as const satisfies readonly ConformanceTier[];

/** Any one declared tier, with the literal metadata its record states. */
type DeclaredTier = (typeof CONFORMANCE_TIERS)[number];

/**
 * The declared tier named `name`, typed as exactly that record.
 *
 * Selected BY NAME rather than by tuple position, so inserting a tier ahead of
 * another in directory order cannot silently retype a caller as its neighbour.
 */
export function tierNamed<Name extends DeclaredTier['name']>(name: Name): Extract<DeclaredTier, { name: Name }>;
/** The declared tier named `name`, never an implicit fallback. */
export function tierNamed(name: string): DeclaredTier;
export function tierNamed(name: string): DeclaredTier {
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
