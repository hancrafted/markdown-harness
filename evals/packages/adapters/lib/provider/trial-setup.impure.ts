// Setting a trial up: the tested carrier, the steering marker drawn for it, the
// derived arm, and the trial run itself.

import { deriveArm, testedCarrierAddress } from '../../../arms/derive-arms.ts';
import { drawSteeringMarker } from '../../../arms/steering-markers.ts';
import { readText, readTextFiles } from '../../../platform/host-files.ts';
import { sourcesFor } from '../../../session/mint-guards.ts';
import type { TrialOutcome } from '../../../session/run-trial.ts';
import { runTrial } from '../../../session/run-trial.ts';
import { derivationArmFor, fillClause, surfaceOf, taskFor } from './provider-config.pure.ts';
import type { CaseCarrier } from './provider-config.types.ts';
import type { Prepared, PreparedCarrier, TrialParts } from './session-record.types.ts';

// Deliberately a second copy of the list in `prescreen/lib/run/prescreen-inputs.impure.ts`, which adds `runs`;
// see the comment there for why no shared home exists.
const CORPUS_SKIP = ['node_modules', 'dist', '.git', '.worktrees', '.claude', '.scratch'];

function corpusOf(checkout: string): string {
  return readTextFiles(checkout, CORPUS_SKIP)
    .map((file) => file.text)
    .join('\n');
}

interface Draw {
  readonly settings: TrialParts['settings'];
  readonly caseId: string;
  readonly configText: string;
  readonly corpus: string;
}

function carrierFor(draw: Draw, carrier: CaseCarrier): Omit<PreparedCarrier, 'occurrences'> {
  const address = testedCarrierAddress(draw.configText, carrier.placeholder) ?? 'untested';
  const steeringMarker = drawSteeringMarker({
    seed: draw.settings.seed,
    caseId: draw.caseId,
    address,
    corpus: draw.corpus,
  });
  const clause = fillClause(carrier.clauseTemplate, steeringMarker);
  return { address, steeringMarker, clause, scope: carrier.scope };
}

function prepare(parts: TrialParts): Prepared {
  const { settings, cell, vars } = parts;
  const configText = readText(`${settings.checkout}/${vars.seedDir}/markdown-harness.config.yaml`);
  const draw = { settings, caseId: vars.caseId, configText, corpus: corpusOf(settings.checkout) };
  const drawn = vars.carriers.map((carrier) => carrierFor(draw, carrier));
  const substitutes = drawn.map((entry, index) => ({
    placeholder: vars.carriers[index]?.placeholder ?? '',
    clause: entry.clause,
  }));
  const derived = deriveArm({ configText, arm: derivationArmFor(cell.arm), substitutes });
  const carriers = drawn.map((entry, index) => ({ ...entry, occurrences: derived.occurrences[index] ?? 0 }));
  return { carriers, clause: drawn.map((entry) => entry.clause).join(' '), derived };
}

function hostFor(parts: TrialParts): Parameters<typeof runTrial>[0]['host'] {
  const { host } = parts.settings;
  return {
    command: host.command,
    model: parts.cell.model,
    maxTurns: host.maxTurns,
    wallClockMs: host.wallClockMs,
    tools: host.tools,
  };
}

function steeringMarkersFor(parts: TrialParts, prepared: Prepared): Parameters<typeof runTrial>[0]['steeringMarkers'] {
  const steered = parts.cell.arm === 'steered';
  return prepared.carriers.map((carrier) => ({
    steeringMarker: carrier.steeringMarker,
    sweepExpectation: steered
      ? ({ kind: 'exactly', occurrences: carrier.occurrences } as const)
      : ({ kind: 'none' } as const),
  }));
}

function requestFor(parts: TrialParts, prepared: Prepared): Parameters<typeof runTrial>[0] {
  const { settings, cell, vars } = parts;
  const task = taskFor({
    arm: cell.arm,
    task: vars.task,
    controlPrefix: vars.controlPrefix,
    clause: prepared.clause,
  });
  return {
    arm: cell.arm,
    surface: surfaceOf(cell),
    pullLine: vars.pullLine,
    sources: sourcesFor({ checkout: settings.checkout, seedRelative: vars.seedDir }),
    heldOut: [`${settings.checkout}/evals/suites/steering/cases`],
    derivedConfig: prepared.derived.configText,
    host: hostFor(parts),
    task,
    steeringMarkers: steeringMarkersFor(parts, prepared),
    targetPath: vars.targetPath,
  };
}

export function setUpAndRun(parts: TrialParts): { prepared: Prepared; outcome: TrialOutcome } {
  const prepared = prepare(parts);
  return { prepared, outcome: runTrial(requestFor(parts, prepared)) };
}
