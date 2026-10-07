// The canary: one per run, through the session module directly, with a task that
// forces the Write tool. It proves the hook can fire headless in this Host
// harness, delivery channel and root layout. A failed canary is an instrument
// failure for every cell sharing the configuration.

import { deriveArm } from '../../../arms/derive-arms.ts';
import { drawSteeringMarker } from '../../../arms/steering-markers.ts';
import { readText } from '../../../platform/host-files.ts';
import { evaluateCanary } from '../../../session/canary-verdict.ts';
import { sourcesFor } from '../../../session/mint-guards.ts';
import { runTrial } from '../../../session/run-trial.ts';
import type { RunPlan } from './run-plan.types.ts';

const SEED_DIR = 'evals/suites/steering/seed/research-note';
const PLACEHOLDER = 'STEERING_CLAUSE_PLACEHOLDER';
const TARGET = 'docs/research/canary-note.md';

function request(plan: RunPlan): Parameters<typeof runTrial>[0] {
  const configText = readText(`${plan.checkout}/${SEED_DIR}/markdown-harness.config.yaml`);
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
  const host = {
    command: plan.host.command,
    model: 'sonnet',
    maxTurns: plan.host.maxTurns,
    wallClockMs: plan.host.wallClockMs,
    tools: plan.host.tools,
  };
  const task = `Use the Write tool to create ${TARGET} with a short note.`;
  const sweepExpectation = { kind: 'exactly', occurrences: derived.substitutions } as const;
  return {
    arm: 'steered',
    sources: sourcesFor(plan.checkout, SEED_DIR),
    heldOut: [],
    derivedConfig: derived.configText,
    host,
    task,
    steeringMarker,
    targetPath: TARGET,
    sweepExpectation,
  };
}

export function runCanary(plan: RunPlan): string | undefined {
  const outcome = runTrial(request(plan));
  if (outcome.declared !== undefined) return `canary failed: ${outcome.declared.kind}: ${outcome.declared.detail}`;
  if (outcome.raw?.spawnError !== undefined)
    return `canary failed: the Host harness could not start (${outcome.raw.spawnError})`;
  return evaluateCanary(outcome.raw?.parsed.events ?? []);
}
