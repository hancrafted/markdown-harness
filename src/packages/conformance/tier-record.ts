import { fileNameOf } from '../foundation/host-path.ts';
import { runnerFileFor } from './lib/tier/tier-name.pure.ts';
import type { ConformanceTier } from './lib/tier/tier-record.types.ts';

export type { ConformanceTier } from './lib/tier/tier-record.types.ts';

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
    caseKind: 'markdown',
    configFile: 'valid-test-config.yaml',
    caseCount: 195,
  },
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
