/**
 * Rendering a check report. See `./violation.ts` for the rendering rules that
 * are specification.
 */

import type { CheckReport, FileReport, RuleCoverage } from '../../../contract/check-report.ts';
import type { RuleRef } from '../../../contract/values.ts';
import type { Violation } from '../../../contract/violation.ts';
import { stanza } from './violation.ts';

function selectorOf(rule: RuleRef): string {
  return rule.selector.fileName === undefined
    ? `path: ${(rule.selector.path ?? []).join(', ')}`
    : `fileName: ${rule.selector.fileName}`;
}

/**
 * The rule, named by `ruleId` and never by position, with its `intent` printed
 * once here rather than repeated under every violation in the file.
 */
function header(file: FileReport): readonly string[] {
  return [
    file.path,
    `  governed by ${file.rule.ruleId}   ${selectorOf(file.rule)}`,
    `  because: ${file.rule.intent}`,
    '',
  ];
}

/**
 * Violations are keyed by Module, and the Module is named on the page only when
 * more than one reported.
 *
 * Conditional on the DATA rather than on a hardcoded module count, so it is
 * correct once a second Module exists and quiet while there is only one. A
 * `[frontmatter]` line above every stanza in a single-Module world is noise.
 */
function block(file: FileReport): readonly string[] {
  const modules = Object.entries(file.violations) as [string, readonly Violation[]][];
  return [
    ...header(file),
    ...modules.flatMap(([module, violations]) => [
      ...(modules.length > 1 ? [`  [${module}]`, ''] : []),
      ...violations.flatMap((violation) => [...stanza(violation), '']),
    ]),
  ];
}

/**
 * The counts a reader wants, computed rather than stored.
 *
 * `conforming` is `governed - files.length` and the violation count is the sum
 * over `files`; only `governed` is not recoverable from the report, so only
 * `governed` is in it.
 */
function summary(report: CheckReport): string {
  const violations = report.files.reduce((total, file) => total + file.violations.frontmatter.length, 0);
  const conforming = report.totals.governed - report.files.length;
  if (violations === 0) return `No violations. ${report.totals.governed} files governed.`;
  return (
    `${violations} violations in ${report.files.length} files. ` +
    `${report.totals.governed} files governed, ${conforming} conforming.`
  );
}

/**
 * How a rule that governed nothing lost the files it selected.
 *
 * Both numbers print even when they are zero, and that is the point: two zeros
 * say nothing above took the files and nothing was excluded, which leaves only
 * one explanation — the selector matched no file at all. Omitting the zeros
 * would leave the Operator to infer that.
 */
function lost(entry: RuleCoverage): readonly string[] {
  const by = entry.shadowedBy.length === 0 ? '' : `, by ${entry.shadowedBy.join(' and ')}`;
  return [
    `  ${entry.rule.ruleId}   ${selectorOf(entry.rule)}`,
    `    because:   ${entry.rule.intent}`,
    `    shadowed:  ${entry.shadowed}${by}`,
    `    excluded:  ${entry.excluded}`,
    '',
  ];
}

/**
 * The rules that never applied — printed LAST, and only when there are any.
 *
 * The report above this is about the corpus; this is about the config, and it
 * is the one fault a clean run can be hiding. Conditional on the DATA, like the
 * Module name, so a config with no ordering mistake gets no section about
 * ordering mistakes.
 */
function inert(report: CheckReport): readonly string[] {
  const never = report.coverage.filter((entry) => entry.won === 0);
  if (never.length === 0) return [];
  return ['', 'Rules that governed no files:', '', ...never.flatMap(lost)];
}

export function renderCheck(report: CheckReport): string {
  return [...report.files.flatMap(block), summary(report), ...inert(report), ''].join('\n');
}
