/**
 * The decisions a rejected-config case comparison makes, away from the run that
 * feeds it.
 *
 * A rejected-config case is one directory: config bytes under the adopter's own
 * config file name and the frozen refusal. Run inside that directory with no
 * flag, `mh` names the config by its bare file name, so a file-level fault's
 * location is spelled exactly as the case-relative expectation spells it and
 * the frozen payload compares with no prefix substituted.
 */

import { frozenComparison } from '../spec-folder/spec-folder.pure.ts';
import type { FrozenComparison } from '../spec-folder/spec-folder.types.ts';
import type { RejectedCaseReport } from './rejected-case.types.ts';

const COMMENT_LINE = /^#\s*(\S.*)$/u;

/**
 * The first line of a case config's opening comment, which says what the case
 * refuses.
 *
 * @param configText The config's whole text, or `undefined` when there is none to read.
 * @returns The comment line without its `#`, or `undefined` when the config does not open with one.
 */
export function faultSentenceOf(configText: string | undefined): string | undefined {
  if (configText === undefined) return undefined;
  const firstLine = configText.split('\n', 1)[0].replace(/\r$/u, '');
  return COMMENT_LINE.exec(firstLine)?.[1];
}

/** JSON text re-rendered in one layout, or the text unchanged when it does not parse. */
function canonicalJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/**
 * The frozen payload held against the `result` of one `check` envelope.
 *
 * Compared as JSON, not as bytes: the frozen file is laid out by hand and the
 * payload sits inside an envelope, so only the value is the contract — fault
 * order included, because arrays compare in order.
 *
 * @param label The frozen file's name, as the report shows it.
 * @param frozenText The frozen expectation's text.
 * @param checkStdout What `mh check` printed inside the case.
 */
export function payloadComparison(label: string, frozenText: string, checkStdout: string): FrozenComparison {
  const result = (() => {
    try {
      return JSON.stringify((JSON.parse(checkStdout) as { result?: unknown }).result, null, 2);
    } catch {
      return checkStdout;
    }
  })();
  return frozenComparison(label, canonicalJson(frozenText), result ?? 'undefined');
}

/**
 * The report as a human reads it: the case, what it refuses, and each frozen
 * file with its diff when it disagrees.
 *
 * @param report One compared case.
 */
export function renderRejectedCase(report: RejectedCaseReport): string {
  const lines = [
    `case  ${report.case}`,
    report.fault === undefined
      ? '  (no config comment to read — the case holds no readable config)'
      : `  # ${report.fault}`,
    ...report.frozen.flatMap((comparison) => [
      `  ${comparison.label}  ${comparison.agrees ? 'identical' : 'DIFFERS'}`,
      ...comparison.diff.map((line) => `    ${line}`),
    ]),
    report.agrees ? 'agrees' : 'DISAGREES',
  ];
  return `${lines.join('\n')}\n`;
}
