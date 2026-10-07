// The rung 1 and rung 2 preconditions. Rung 1 (never emitted): the built `mh query`
// for the target path must answer `governed` and hold the steering marker exactly once in
// the steered arm, zero times in the intent-neutralised arm. Rung 2 (lost in
// rendering): the hook script, fed a hand-built payload, must render the steering marker.
//
// Each returns a problem string naming the rung, or undefined. A problem is an
// instrument failure: the fixture is wrong, and no model was spent finding out.

import type { ArmKind } from '../observe/session-observation.types.ts';

function occurrences(text: string, steeringMarker: string): number {
  return text.split(steeringMarker).length - 1;
}

function governance(stdout: string): string | undefined {
  try {
    const parsed = JSON.parse(stdout) as { result?: { governance?: string } };
    return parsed.result?.governance;
  } catch {
    return undefined;
  }
}

export function checkRung1(stdout: string, steeringMarker: string, arm: ArmKind): string | undefined {
  const state = governance(stdout);
  if (state !== 'governed') return `rung 1: the query answered ${state ?? 'nothing parseable'}, not governed`;
  if (arm === 'control') return undefined;
  const wanted = arm === 'steered' ? 1 : 0;
  const found = occurrences(stdout, steeringMarker);
  return found === wanted
    ? undefined
    : `rung 1: the answer holds the steering marker ${found} times, expected ${wanted}`;
}

export function checkRung2(hookOutput: string, steeringMarker: string): string | undefined {
  if (hookOutput.trim() === '') return 'rung 2: the hook script rendered nothing';
  let text: string | undefined;
  try {
    text = (JSON.parse(hookOutput) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput
      ?.additionalContext;
  } catch {
    text = undefined;
  }
  if (text === undefined) return 'rung 2: the hook output is not the PreToolUse envelope';
  return text.includes(steeringMarker) ? undefined : 'rung 2: the rendered notice lost the steering marker';
}
