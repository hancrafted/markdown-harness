// One graded session, from the eval tool's call to the provider's return value.
// An instrument failure comes back in the `error` field, never as a low score.

import type { RawSession } from '../../../session/classify-session.ts';
import { classifySession } from '../../../session/classify-session.ts';
import type { TrialOutcome } from '../../../session/run-trial.ts';
import { readCaseVars, readCellConfig, readRunSettings } from './provider-config.pure.ts';
import { reportFailure } from './session-failure.impure.ts';
import { gradeSession } from './session-grading.impure.ts';
import type { SessionCall, SessionReturn, TrialParts } from './session-record.types.ts';
import { setUpAndRun } from './trial-setup.impure.ts';

const EXPECTATION = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
const NO_STREAM = { events: [], init: undefined, result: undefined, unparsedLines: 0, missingKeys: [] };

type Inputs = TrialParts | { readonly missing: string[] };

function inputsOf(call: SessionCall): Inputs {
  const settings = readRunSettings(call.env);
  const cell = readCellConfig(call.config);
  const vars = readCaseVars(call.vars);
  if (Array.isArray(settings)) return { missing: settings };
  const missing = [...(Array.isArray(cell) ? cell : []), ...(Array.isArray(vars) ? vars : [])];
  return missing.length > 0 || Array.isArray(cell) || Array.isArray(vars) ? { missing } : { settings, cell, vars };
}

const NO_SESSION = { spawnError: undefined, timedOut: false, stderr: '', parsed: NO_STREAM };

function streamOf(outcome: TrialOutcome): RawSession {
  return { ...(outcome.raw ?? NO_SESSION), declared: outcome.declared?.kind };
}

function runInputs(call: SessionCall, parts: TrialParts): SessionReturn {
  const { prepared, outcome } = setUpAndRun(parts);
  const verdict = classifySession(streamOf(outcome), EXPECTATION);
  if (verdict.outcome === 'graded' && outcome.raw !== undefined)
    return gradeSession({ ...parts, call, prepared, outcome, parsed: outcome.raw.parsed });
  const kind = verdict.outcome === 'instrument-failure' ? verdict.kind : 'no-parseable-stream';
  const detail =
    outcome.declared?.detail ??
    (verdict.outcome === 'instrument-failure' ? verdict.detail : 'the session left no record');
  return reportFailure({ settings: parts.settings, call, arm: parts.cell.arm, kind, detail });
}

export function runSteeringSession(call: SessionCall): SessionReturn {
  const inputs = inputsOf(call);
  if ('missing' in inputs)
    return { error: `instrument failure: cohort-field-missing: ${inputs.missing.join(', ')}`, metadata: {} };
  return runInputs(call, inputs);
}
