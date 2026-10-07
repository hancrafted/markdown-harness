// The exit derivation. Zero: every expected session ran and was graded, however
// badly. One: the instrument could not run, in whole or in part. Two: misuse,
// a distinct code so a mistyped argument is never read as a score or a crash.
//
// The eval tool's own exit code is deliberately not an input.

import type { ExitInput, ExitVerdict } from './exit-contract.types.ts';

export const MISUSE = 2;

export function expectedSessions(matrix: { cells: number; trials: number; cases: number }): number {
  return matrix.cells * matrix.trials * matrix.cases;
}

function countReasons(input: ExitInput, rows: NonNullable<ExitInput['rows']>): string[] {
  const reasons: string[] = [];
  if (rows.length !== input.expected) reasons.push(`results hold ${rows.length} rows, expected ${input.expected}`);
  if (input.toolCount !== undefined && input.toolCount !== rows.length) {
    reasons.push(`the eval tool counted ${input.toolCount} sessions, the file holds ${rows.length}`);
  }
  return reasons;
}

function reasonsFor(input: ExitInput): string[] {
  const named = input.wrapperFailure === undefined ? [] : [input.wrapperFailure];
  if (input.rows === undefined) return [...named, 'no results file was written'];
  const failures = input.rows
    .filter((row) => !row.graded)
    .map((row) => `instrument failure: ${row.failureKind ?? 'unnamed'}`);
  return [...named, ...countReasons(input, input.rows), ...failures];
}

export function deriveExit(input: ExitInput): ExitVerdict {
  const reasons = reasonsFor(input);
  return reasons.length === 0 ? { code: 0, reasons } : { code: 1, reasons };
}
