// What one run of the compiled `mh` answered, read off its stdout and exit code.
//
// Shared by every runner that spawns the tool, so two tiers cannot disagree
// about what counts as a refusal. The spawn itself stays in each runner: only a
// test file may import a platform builtin outside `foundation` (ARCH-008 §2.1).

import type { ToolEnvelope, ToolRefusal, ToolRun } from './tool-answer.types.ts';

/** The error a refusal names when stdout carried no envelope to read one from. */
export const NO_RESPONSE = 'NO_RESPONSE';

/** How much of stderr a no-response refusal keeps: enough to name a crash. */
const STDERR_HEAD = 200;

/** Stdout parsed, or an empty envelope when there is nothing to parse. */
export function envelopeOf(run: ToolRun): ToolEnvelope {
  try {
    return JSON.parse(run.stdout) as ToolEnvelope;
  } catch {
    return {};
  }
}

/**
 * Why `run` carries no answer — or `undefined` when it carries one.
 *
 * A config-error envelope is a refusal, and so is a run that printed no
 * envelope at all: a crash, a missing entry, a thrown error. Both keep the exit
 * code, so a pinned refusal cannot be matched by a different failure.
 */
export function refusalOf(run: ToolRun): ToolRefusal | undefined {
  const result = envelopeOf(run).result;
  if (result?.error !== undefined) return { exit: run.code, error: result.error, faults: result.faults ?? [] };
  if (result !== undefined) return undefined;
  return { exit: run.code, error: NO_RESPONSE, faults: [], stderr: run.stderr.trim().slice(0, STDERR_HEAD) };
}
