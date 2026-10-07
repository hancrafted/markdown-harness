// The rung 1 and rung 2 preconditions. Rung 1 (never emitted): the built `mh query`
// for the target path must answer `governed` and hold the steering marker exactly once in
// the steered arm, zero times in the intent-neutralised arm. Rung 2 (lost in
// rendering): the hook script, fed a hand-built payload, must render the steering marker.
//
// Each returns a problem string naming the rung, or undefined. A problem is an
// instrument failure: the fixture is wrong, and no model was spent finding out.

import type { FailureKind } from '../failure/failure-classifier.types.ts';
import type { ArmKind } from '../observe/session-observation.types.ts';
import type { Encoding } from '../surface/delivery-surface.types.ts';

function occurrences(text: string, steeringMarker: string): number {
  return text.split(steeringMarker).length - 1;
}

/** One sentence per steering marker whose count in the text is not the wanted one, or an empty list. */
function countProblems(text: string, steeringMarkers: readonly string[], wanted: number): string[] {
  return steeringMarkers
    .map((steeringMarker) => occurrences(text, steeringMarker))
    .flatMap((found) => (found === wanted ? [] : [`${found} times, expected ${wanted}`]));
}

function governance(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { result?: { governance?: string } };
    return parsed.result?.governance;
  } catch {
    return undefined;
  }
}

export function checkRung1(stdout: string, steeringMarkers: readonly string[], arm: ArmKind): string | undefined {
  const state = governance(stdout);
  if (state !== 'governed') return `rung 1: the query answered ${state ?? 'nothing parseable'}, not governed`;
  if (arm === 'control') return undefined;
  const problems = countProblems(stdout, steeringMarkers, arm === 'steered' ? 1 : 0);
  return problems.length === 0 ? undefined : `rung 1: the answer holds a steering marker ${problems[0]}`;
}

/**
 * What the pull command printed, in its encoding: the steering markers must be in it exactly as the arm needs
 * them, and it must say something. A raw JSON answer failing is the answer itself failing (rung 1); a rendered
 * encoding failing is lost in rendering (rung 2).
 */
export function checkPullAnswer(output: string, steeringMarkers: readonly string[], arm: ArmKind): string | undefined {
  if (output.trim() === '') return 'the pull command printed nothing';
  const problems = countProblems(output, steeringMarkers, arm === 'steered' ? 1 : 0);
  return problems.length === 0 ? undefined : `the pull command's answer holds a steering marker ${problems[0]}`;
}

export function checkRung2(hookOutput: string, steeringMarkers: readonly string[]): string | undefined {
  if (hookOutput.trim() === '') return 'rung 2: the hook script rendered nothing';
  let text: string | undefined;
  try {
    text = (JSON.parse(hookOutput) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput
      ?.additionalContext;
  } catch {
    text = undefined;
  }
  if (text === undefined) return 'rung 2: the hook output is not the PreToolUse envelope';
  return steeringMarkers.every((steeringMarker) => text.includes(steeringMarker))
    ? undefined
    : 'rung 2: the rendered notice lost a steering marker';
}

/**
 * The instrument failure a failing pull answer is named. Raw JSON is the answer itself (rung 1); the prose
 * rendering goes through the hook, so it is lost in rendering (rung 2). The intents-only encoding has no
 * rendering step, so rung 2 is not applicable to it (a deviation from the spec text, recorded where rung 2 is
 * observed): its failure is the pull command's own answer failing, which is an instrument failure and is
 * named that, never rung 2.
 */
export function pullFailureKind(encoding: Encoding): FailureKind {
  if (encoding === 'json') return 'rung-1-failed';
  return encoding === 'prose' ? 'rung-2-failed' : 'pull-answer-failed';
}
