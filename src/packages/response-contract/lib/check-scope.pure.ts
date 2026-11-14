import type { CheckPath, CheckResult } from './check.types.ts';

/** Whether the operand selects a corpus spelling, on segment boundaries. */
function reaches(operand: CheckPath, file: string): boolean {
  if (file === operand.relative) return true;
  return operand.directory && (operand.relative === '' || file.startsWith(`${operand.relative}/`));
}

/** Filter the full verdict without changing any file's findings or any Rule's evaluation. */
export function scopedCheck<TViolation>(
  result: CheckResult<TViolation>,
  governed: readonly string[],
  paths: readonly CheckPath[] | undefined,
): CheckResult<TViolation> {
  if (paths === undefined) return result;
  const selected = new Set(governed.filter((file) => paths.some((operand) => reaches(operand, file))));
  const files = result.files.filter((file) => selected.has(file.path));
  return {
    summary: {
      governedFiles: selected.size,
      invalidFiles: files.length,
      totalViolations: files.reduce(
        (total, file) => total + file.modules.reduce((count, module) => count + module.violations.length, 0),
        0,
      ),
    },
    files,
    ungovernedPaths: paths
      .filter((operand) => !governed.some((file) => reaches(operand, file)))
      .map((operand) => operand.path),
  };
}
