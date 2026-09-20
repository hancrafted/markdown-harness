/**
 * One corpus's verdict, and the arithmetic over it.
 */

import type { CheckResult, FileViolations, ModuleViolations } from '../../../response-contract/index.ts';
import type { GovernedSource } from './check.types.ts';
import { violationsForFile } from './file-verdict.pure.ts';

/** How many findings one file contributed. */
function countIn(file: FileViolations): number {
  return file.modules.reduce((sum, m) => sum + m.violations.length, 0);
}

/**
 * Judge every governed file that has been read.
 *
 * Groups findings by Module according to Decision 14.
 *
 * @param sources Every governed file with its bytes, in walker order.
 */
export function checkResultFor(sources: readonly GovernedSource[]): CheckResult {
  const files: FileViolations[] = [];

  for (const source of sources) {
    const violations = violationsForFile(source.text, source.rule);
    if (violations.length > 0) {
      const moduleViolations: ModuleViolations = {
        module: 'frontmatter',
        ruleId: source.rule.ruleId,
        ruleIntent: source.rule.intent,
        violations,
      };
      files.push({
        path: source.path,
        modules: [moduleViolations],
      });
    }
  }

  return {
    summary: {
      governedFiles: sources.length,
      invalidFiles: files.length,
      totalViolations: files.reduce((total, file) => total + countIn(file), 0),
    },
    files,
  };
}
