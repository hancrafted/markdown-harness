// The canaries: one for each Host harness, delivery channel and root layout the
// matrix reaches, through the session module directly, with a task that forces the
// surface to be used. A push canary forces the Write tool, so the hook can fire; a
// pull canary names the query command, so the allow-list is exercised. Each proves
// the surface works headless in that Host harness, delivery channel and root layout.
// A failed canary is an instrument failure for every cell sharing the configuration.

import { deriveArm, placeholdersIn } from '../../../arms/derive-arms.ts';
import { drawSteeringMarker } from '../../../arms/steering-markers.ts';
import { readText } from '../../../platform/host-files.ts';
import type { Canary } from '../../../session/delivery-surface.ts';
import { CHANNELS } from '../../../session/delivery-surface.ts';
import { sourcesFor } from '../../../session/mint-guards.ts';
import { runTrial } from '../../../session/run-trial.ts';
import { describeKey } from '../canary/canary-keys.pure.ts';
import type { CanaryKey } from '../canary/canary-keys.types.ts';
import type { RunPlan } from './run-plan.types.ts';

const TARGET = 'docs/research/canary-note.md';

function hostOf(plan: RunPlan): Parameters<typeof runTrial>[0]['host'] {
  const { command, maxTurns, wallClockMs, tools } = plan.host;
  return { command, model: 'sonnet', maxTurns, wallClockMs, tools };
}

/** One steering marker per placeholder the layout's config holds, each drawn for its own carrier. */
function request(plan: RunPlan, key: CanaryKey, canary: Canary): Parameters<typeof runTrial>[0] {
  const configText = readText(`${plan.checkout}/${key.layout}/markdown-harness.config.yaml`);
  const placeholders = placeholdersIn(configText);
  const drawn = placeholders.map((placeholder) => ({
    placeholder,
    steeringMarker: drawSteeringMarker({ seed: plan.seed, caseId: 'canary', address: placeholder, corpus: configText }),
  }));
  const substitutes = drawn.map((one) => ({
    placeholder: one.placeholder,
    clause: `Add the code ${one.steeringMarker}.`,
  }));
  const derived = deriveArm({ configText, arm: 'steered', substitutes });
  return {
    arm: 'steered',
    surface: canary.surface,
    pullLine: CHANNELS[key.channel].line ?? '',
    sources: sourcesFor({ checkout: plan.checkout, seedRelative: key.layout }),
    heldOut: [],
    derivedConfig: derived.configText,
    host: hostOf(plan),
    task: canary.task(TARGET),
    steeringMarkers: drawn.map((one, index) => ({
      steeringMarker: one.steeringMarker,
      sweepExpectation: { kind: 'exactly', occurrences: derived.occurrences[index] ?? 0 },
    })),
    targetPath: TARGET,
  };
}

function runCanary(plan: RunPlan, key: CanaryKey): string | undefined {
  const canary = CHANNELS[key.channel].canary;
  if (canary === undefined) return `canary failed: the ${key.channel} channel has no canary to run`;
  const outcome = runTrial(request(plan, key, canary));
  if (outcome.declared !== undefined) return `canary failed: ${outcome.declared.kind}: ${outcome.declared.detail}`;
  if (outcome.raw?.spawnError !== undefined)
    return `canary failed: the Host harness could not start (${outcome.raw.spawnError})`;
  return canary.verdict(outcome.raw?.parsed.events ?? []);
}

/**
 * Every canary the matrix owes, stopping at the first failure and naming its key. Only one Host harness exists,
 * so the command that drives a key is the plan's one command; a second Host harness will need its own command
 * keyed the same way.
 */
export function runCanaries(plan: RunPlan): string | undefined {
  for (const key of plan.canaryKeys) {
    const failure = runCanary(plan, key);
    if (failure !== undefined) return `${failure} [${describeKey(key)}]`;
  }
  return undefined;
}
