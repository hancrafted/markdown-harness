/**
 * The exit-code table: 0 clean, 1 violations, 2 config rejected.
 *
 * It lives in `core` rather than in `src/cli.ts` for one reason, and the reason
 * is tenet 4. Exit codes are public API exactly as `--json` is — a shell script
 * branches on them — so they are part of what a reimplementation has to match.
 * `src/cli.ts` is the one file in the repo a port cannot reuse, because it is
 * the one file that touches disk. Every fact that sits there has to be
 * reverse-engineered by the port; every fact that sits here is verified against
 * the same values the corpus tests use.
 *
 * So the CLI keeps as little as it can: it maps argv to a call, a report to a
 * stream, and a report to this function. What it still decides is named in its
 * own doc comment rather than claimed away.
 *
 * The three codes read as one rule rather than three cases. 0 says
 * `markdown-harness` ran and found nothing wrong; 1 says it ran and the CORPUS
 * is wrong; 2 says it could not report on the corpus at all, because its own
 * input is wrong.
 *
 * A steering answer has no failing state, so it is always 0.
 */

import type { CheckReport } from '../contract/check-report.ts';
import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { SteeringAnswer } from '../contract/steering-answer.ts';

export function exitCode(report: CheckReport | ConfigRejected | SteeringAnswer): 0 | 1 | 2 {
  if (report.report === 'config-rejected') return 2;
  // A steering answer is never a failure: the question was asked and answered.
  //
  // `governs: null` is 0 too, and deliberately. Under tenet 6 invisibility is
  // the CORRECT answer rather than an error, so a non-zero code would fail a CI
  // step with nothing wrong in it — and the Operator's diagnostic for "my rule
  // governs nothing" is `coverage` in a check report, not this exit code.
  if (report.report === 'steering') return 0;
  // `files` holds one entry per governed file WITH A FAULT, so an empty list is
  // a clean run — not an empty corpus. A conforming file is absent from it, and
  // an ungoverned file is absent under tenet 6.
  return report.files.length === 0 ? 0 : 1;
}
