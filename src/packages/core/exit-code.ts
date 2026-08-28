/**
 * The exit-code table: 0 clean, 1 violations, 2 could not report.
 *
 * It lives in `core` rather than in `src/cli.ts` for one reason, and the reason
 * is tenet 4. Exit codes are public API exactly as the JSON is — a shell script
 * branches on them — so they are part of what a reimplementation has to match.
 * `src/cli.ts` is the one file in the repo a port cannot reuse, because it is
 * the one file that touches disk. Every fact that sits there has to be
 * reverse-engineered by the port; every fact that sits here is verified against
 * the same values the corpus tests use.
 *
 * The three codes read as one rule rather than three cases. 0 says
 * `markdown-harness` ran and found nothing wrong; 1 says it ran and the CORPUS
 * is wrong; 2 says it could not report on the corpus at all, because its own
 * input is wrong.
 *
 * Only `--check` can return 1. A steering answer has no failing state — the
 * question was asked and answered — and `governance: 'invisible'` is 0 too,
 * deliberately: under tenet 6 invisibility is the CORRECT answer rather than an
 * error, so a non-zero code would fail a CI step with nothing wrong in it.
 *
 * `--coverage` is 0 whatever it finds, including a rule that won nothing. That
 * is a real decision rather than an oversight: an inert rule is almost always a
 * mistake, but whether it is a BUILD-BREAKING one is the Operator's policy, and
 * a diagnostic that fails the build cannot be run for information.
 */

import type { MarkdownHarnessResponse } from '../contract/response.ts';
import { isConfigError } from '../contract/response.ts';

export function exitCode(response: MarkdownHarnessResponse): 0 | 1 | 2 {
  if (isConfigError(response.result)) return 2;
  if (response.command !== 'check') return 0;

  // `faultyFiles` counts governed files WITH A FAULT, so zero is a clean run and
  // not an empty corpus. A conforming file is not counted here, and an
  // ungoverned file is not counted anywhere (tenet 6).
  return response.result.summary.faultyFiles === 0 ? 0 : 1;
}
