/**
 * One corpus's verdict, and the arithmetic over it.
 *
 * The three counts are computed AT THE POINT OF RETURN, from the same array the
 * response carries, so they cannot disagree with it. They are stored rather
 * than left to the consumer because the consumer is an agent, and asking a
 * language model to sum an array to find out whether anything is wrong is
 * asking the one thing it is least reliable at.
 *
 * There is deliberately no `invisible` count. A field holding one would be the
 * report noticing files it promised never to notice.
 */

import type { CheckResult, FileViolations } from '../../../response-contract/index.ts';
import type { GovernedSource } from './check.types.ts';
import { violationsForFile } from './file-verdict.pure.ts';

/** How many findings one file contributed. */
function countIn(file: FileViolations): number {
  return file.violations.length;
}

/**
 * Judge every governed file that has been read.
 *
 * `governedFiles` is the length of the input rather than a separate tally: every
 * governed file is read, and only the ones with findings survive into `files`.
 * That makes it the one count not recoverable from `files` alone.
 *
 * @param sources Every governed file with its bytes, in walker order.
 */
export function checkResultFor(sources: readonly GovernedSource[]): CheckResult {
  const files = sources
    .map((source) => ({
      path: source.path,
      ruleId: source.rule.ruleId,
      ruleIntent: source.rule.intent,
      violations: violationsForFile(source.text, source.rule),
    }))
    .filter((file) => countIn(file) > 0);

  return {
    summary: {
      governedFiles: sources.length,
      invalidFiles: files.length,
      totalViolations: files.reduce((total, file) => total + countIn(file), 0),
    },
    files,
  };
}
