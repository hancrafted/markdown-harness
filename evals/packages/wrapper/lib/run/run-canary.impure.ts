// The canaries: one for each Host harness, delivery channel and root layout the
// matrix reaches, through the session module directly, with a task that forces
// the Write tool. Each proves the hook can fire headless in that Host harness,
// delivery channel and root layout. A failed canary is an instrument failure
// for every cell sharing the configuration.

import { deriveArm } from '../../../arms/derive-arms.ts';
import { drawSteeringMarker } from '../../../arms/steering-markers.ts';
import { readText } from '../../../platform/host-files.ts';
import { evaluateCanary } from '../../../session/canary-verdict.ts';
import { sourcesFor } from '../../../session/mint-guards.ts';
import { runTrial } from '../../../session/run-trial.ts';
import { describeKey } from '../canary/canary-keys.pure.ts';
import type { CanaryKey } from '../canary/canary-keys.types.ts';
import type { RunPlan } from './run-plan.types.ts';

const PLACEHOLDER = 'STEERING_CLAUSE_PLACEHOLDER';
const TARGET = 'docs/research/canary-note.md';

function hostOf(plan: RunPlan): Parameters<typeof runTrial>[0]['host'] {
  const { command, maxTurns, wallClockMs, tools } = plan.host;
  return { command, model: 'sonnet', maxTurns, wallClockMs, tools };
}

function request(plan: RunPlan, key: CanaryKey): Parameters<typeof runTrial>[0] {
  const configText = readText(`${plan.checkout}/${key.layout}/markdown-harness.config.yaml`);
  const steeringMarker = drawSteeringMarker({
    seed: plan.seed,
    caseId: 'canary',
    address: 'canary',
    corpus: configText,
  });
  const derived = deriveArm({
    configText,
    arm: 'steered',
    placeholder: PLACEHOLDER,
    clause: `Add the code ${steeringMarker}.`,
  });
  const task = `Use the Write tool to create ${TARGET} with a short note.`;
  const sweepExpectation = { kind: 'exactly', occurrences: derived.substitutions } as const;
  return {
    arm: 'steered',
    sources: sourcesFor({ checkout: plan.checkout, seedRelative: key.layout }),
    heldOut: [],
    derivedConfig: derived.configText,
    host: hostOf(plan),
    task,
    steeringMarker,
    targetPath: TARGET,
    sweepExpectation,
  };
}

function runCanary(plan: RunPlan, key: CanaryKey): string | undefined {
  const outcome = runTrial(request(plan, key));
  if (outcome.declared !== undefined) return `canary failed: ${outcome.declared.kind}: ${outcome.declared.detail}`;
  if (outcome.raw?.spawnError !== undefined)
    return `canary failed: the Host harness could not start (${outcome.raw.spawnError})`;
  return evaluateCanary(outcome.raw?.parsed.events ?? []);
}

/**
 * Every canary the matrix owes, stopping at the first failure and naming its key. Phase 1 has one Host harness,
 * so the command that drives a key is the plan's one command; a second Host harness will need its own command
 * keyed the same way, which is the row phase 2 adds.
 */
export function runCanaries(plan: RunPlan): string | undefined {
  for (const key of plan.canaryKeys) {
    const failure = runCanary(plan, key);
    if (failure !== undefined) return `${failure} [${describeKey(key)}]`;
  }
  return undefined;
}
