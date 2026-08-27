/**
 * Rendering a check report. The soft layer — see `./violation.ts` for the
 * message corpus and the rendering rules that are specification.
 */

import type { CheckReport, FileReport } from '../../../contract/check-report.ts';
import type { RuleRef } from '../../../contract/values.ts';
import { stanza } from './violation.ts';

/**
 * `frontmatter.rules[5]` is DERIVED here, from the index, rather than stored on
 * every rule reference. Arithmetic on a report is the renderer's job, for the
 * same reason no `message` field exists in the data.
 */
function selectorOf(rule: RuleRef): string {
  return 'fileName' in rule.selector && rule.selector.fileName !== undefined
    ? `fileName: ${rule.selector.fileName}`
    : `path: ${(rule.selector.path ?? []).join(', ')}`;
}

function header(file: FileReport): readonly string[] {
  return [file.path, `  governed by frontmatter.rules[${file.rule.index}]   ${selectorOf(file.rule)}`, ''];
}

function block(file: FileReport): readonly string[] {
  return [...header(file), ...file.violations.flatMap((violation) => [...stanza(violation), ''])];
}

/**
 * The counts a reader wants, computed rather than stored.
 *
 * `conforming` is `governed - files.length` and the violation count is the sum
 * over `files`; only `governed` is not recoverable from the report, so only
 * `governed` is in it.
 */
function summary(report: CheckReport): string {
  const violations = report.files.reduce((total, file) => total + file.violations.length, 0);
  const conforming = report.totals.governed - report.files.length;
  if (violations === 0) return `No violations. ${report.totals.governed} files governed.`;
  return (
    `${violations} violations in ${report.files.length} files. ` +
    `${report.totals.governed} files governed, ${conforming} conforming.`
  );
}

export function renderCheck(report: CheckReport): string {
  return [...report.files.flatMap(block), summary(report), ''].join('\n');
}
