// What a finished screen reports and exits with. A refused candidate is a result and exits
// zero; a session that failed, or an answer count short of the expectation, exits one.

import { MIN_SAMPLES, admissionVerdicts, reportLines, tallyHits } from './prescreen.pure.ts';
import type { ScreenOutcome, ScreenResult } from './prescreen.types.ts';

const FAILURES_SHOWN = 5;

export function screenOutcome(result: ScreenResult): ScreenOutcome {
  const verdicts = admissionVerdicts(tallyHits(result.samples, result.candidates), MIN_SAMPLES);
  const shortCount =
    result.samples.length === result.expected
      ? []
      : [`${result.samples.length} answers read, expected ${result.expected}`];
  const problems = [...shortCount, ...result.failures.slice(0, FAILURES_SHOWN)];
  const lines = [
    ...reportLines(verdicts, result.samples.length),
    ...problems.map((reason) => `instrument failure: ${reason}`),
    `seed ${result.seed}, recorded in ${result.runDir}`,
  ];
  return {
    code: problems.length === 0 ? 0 : 1,
    report: `${lines.join('\n')}\n`,
    record: `${JSON.stringify({ seed: result.seed, verdicts, failures: result.failures }, null, 2)}\n`,
  };
}
