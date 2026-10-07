// Setting a trial up: the tested carrier, the steering marker drawn for it, the
// derived arm, and the trial run itself.

import { deriveArm, testedCarrierAddress } from '../../../arms/derive-arms.ts';
import { drawSteeringMarker } from '../../../arms/steering-markers.ts';
import { readText, readTextFiles } from '../../../platform/host-files.ts';
import { sourcesFor } from '../../../session/mint-guards.ts';
import type { TrialOutcome } from '../../../session/run-trial.ts';
import { runTrial } from '../../../session/run-trial.ts';
import { derivationArmFor, fillClause, taskFor } from './provider-config.pure.ts';
import type { Prepared, TrialParts } from './session-record.types.ts';

const CORPUS_SKIP = ['node_modules', 'dist', '.git', '.worktrees', '.claude', '.scratch'];

function corpusOf(checkout: string): string {
  return readTextFiles(checkout, CORPUS_SKIP)
    .map((file) => file.text)
    .join('\n');
}

function prepare(parts: TrialParts): Prepared {
  const { settings, cell, vars } = parts;
  const configText = readText(`${settings.checkout}/${vars.seedDir}/markdown-harness.config.yaml`);
  const address = testedCarrierAddress(configText, vars.placeholder) ?? 'untested';
  const steeringMarker = drawSteeringMarker({
    seed: settings.seed,
    caseId: vars.caseId,
    address,
    corpus: corpusOf(settings.checkout),
  });
  const clause = fillClause(vars.clauseTemplate, steeringMarker);
  const arm = derivationArmFor(cell.arm);
  return { steeringMarker, clause, derived: deriveArm({ configText, arm, placeholder: vars.placeholder, clause }) };
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

function requestFor(parts: TrialParts, prepared: Prepared): Parameters<typeof runTrial>[0] {
  const { settings, cell, vars } = parts;
  const steered = cell.arm === 'steered';
  const task = taskFor({
    arm: cell.arm,
    task: vars.task,
    controlPrefix: vars.controlPrefix,
    clause: prepared.clause,
  });
  return {
    arm: cell.arm,
    sources: sourcesFor(settings.checkout, vars.seedDir),
    heldOut: [`${settings.checkout}/evals/suites/steering/cases`],
    derivedConfig: prepared.derived.configText,
    host: hostFor(parts),
    task,
    steeringMarker: prepared.steeringMarker,
    targetPath: vars.targetPath,
    sweepExpectation: steered ? { kind: 'exactly', occurrences: prepared.derived.substitutions } : { kind: 'none' },
  };
}

export function setUpAndRun(parts: TrialParts): { prepared: Prepared; outcome: TrialOutcome } {
  const prepared = prepare(parts);
  return { prepared, outcome: runTrial(requestFor(parts, prepared)) };
}
