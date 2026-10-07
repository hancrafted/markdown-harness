/**
 * The decisions a spec-folder comparison makes, away from the runs that feed it.
 *
 * A spec folder is one synthetic repo root: a config whose first line states the
 * spec, the cases, and the frozen output `mh` must print there. The impure half
 * reads the folder and runs the tool; this half reads the spec sentence, holds
 * each marker against the failing-file list, diffs a frozen file against fresh
 * output, and renders what a human reads.
 */

import type { CaseLine, FrozenComparison, SpecFolderReport } from './spec-folder.types.ts';

const SPEC_LINE = /^# Spec: (\S.*)$/u;

/**
 * The sentence a spec folder's config states on its first line.
 *
 * @param configText The config's whole text.
 * @returns The sentence, or `undefined` when line 1 is not `# Spec: <sentence>`.
 */
export function specSentenceOf(configText: string): string | undefined {
  const firstLine = configText.split('\n', 1)[0].replace(/\r$/u, '');
  return SPEC_LINE.exec(firstLine)?.[1];
}

/**
 * Each case's marker held against one `check` run's failing files.
 *
 * `check` lists failing files only, so it tells FAILS from the other two and
 * never PASSES from UNGOVERNED; the governed count is held separately.
 *
 * @param stated Each case path and the verdict it states.
 * @param failing The paths `check` listed, relative to the same root.
 */
export function caseLinesOf(
  stated: readonly { readonly path: string; readonly verdict: string }[],
  failing: readonly string[],
): readonly CaseLine[] {
  return stated.map(({ path, verdict }) => {
    const listed = failing.includes(path);
    return { path, stated: verdict, listed, agrees: listed === (verdict === 'FAILS') };
  });
}

/**
 * Compare a frozen text with what a run printed, byte for byte.
 *
 * @param label The frozen file's name, as the report shows it.
 * @param expected The frozen text.
 * @param actual What the run printed.
 */
export function frozenComparison(label: string, expected: string, actual: string): FrozenComparison {
  if (expected === actual) return { label, agrees: true, diff: [] };
  return { label, agrees: false, diff: lineDiff(expected, actual) };
}

/**
 * A line diff, `-` for an expected line the actual text lacks and `+` for an
 * actual line the expected text lacks, unchanged lines left out.
 *
 * Longest common subsequence over lines: a frozen file is a few thousand lines
 * at most, so the quadratic table costs nothing worth a cleverer algorithm.
 *
 * @param expected The frozen text.
 * @param actual The fresh text.
 */
export function lineDiff(expected: string, actual: string): readonly string[] {
  const walk = { a: expected.split('\n'), b: actual.split('\n'), i: 0, j: 0 };
  const common = commonSuffixLengths(walk.a, walk.b);
  const lines: string[] = [];
  while (walk.i < walk.a.length || walk.j < walk.b.length) {
    const step = nextStep(walk, common);
    if (step === 'same') {
      walk.i++;
      walk.j++;
    } else if (step === 'removed') {
      lines.push(`-${walk.a[walk.i++]}`);
    } else {
      lines.push(`+${walk.b[walk.j++]}`);
    }
  }
  return lines;
}

/** `common(i, j)`: the longest common subsequence of `a` from `i` and `b` from `j`. */
function commonSuffixLengths(a: readonly string[], b: readonly string[]): (i: number, j: number) => number {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  return (i, j) => table[i * width + j];
}

/** Where a diff walk stands: both line lists and the next unread line of each. */
interface Walk {
  readonly a: readonly string[];
  readonly b: readonly string[];
  readonly i: number;
  readonly j: number;
}

/** Which way the walk steps next; a removal goes before the addition that replaces it. */
function nextStep({ a, b, i, j }: Walk, common: (i: number, j: number) => number): 'same' | 'removed' | 'added' {
  if (i < a.length && j < b.length && a[i] === b[j]) return 'same';
  if (j === b.length) return 'removed';
  if (i === a.length) return 'added';
  return common(i + 1, j) >= common(i, j + 1) ? 'removed' : 'added';
}

/**
 * Whether a report agrees end to end: a spec sentence, every marker, the
 * governed count and every frozen file.
 *
 * @param report Everything but the verdict.
 */
export function reportAgrees(report: Omit<SpecFolderReport, 'agrees'>): boolean {
  return (
    report.spec !== undefined &&
    report.cases.every((line) => line.agrees) &&
    report.governed.stated === report.governed.reported &&
    report.frozen.every((comparison) => comparison.agrees)
  );
}

/**
 * The report as a human reads it: the spec, one line per case, the governed
 * count, and each frozen file with its diff when it disagrees.
 *
 * @param report One compared spec folder.
 */
export function renderReport(report: SpecFolderReport): string {
  const width = Math.max(0, ...report.cases.map((line) => line.path.length));
  const mark = (agrees: boolean): string => (agrees ? 'ok' : 'MISMATCH');
  const lines = [
    `spec  ${report.folder}`,
    report.spec === undefined
      ? '  # Spec: MISSING — the config must open with `# Spec: <sentence>`'
      : `  # Spec: ${report.spec}`,
    ...report.cases.map(
      (line) =>
        `  ${line.path.padEnd(width)}  ${line.stated.padEnd(10)}  ${mark(line.agrees)}${line.agrees ? '' : line.listed ? '  (reported failing)' : '  (not reported failing)'}`,
    ),
    `  governed: ${report.governed.stated} stated, ${report.governed.reported ?? 'none'} reported  ${mark(report.governed.stated === report.governed.reported)}`,
    ...report.frozen.flatMap((comparison) => [
      `  ${comparison.label}  ${comparison.agrees ? 'identical' : 'DIFFERS'}`,
      ...comparison.diff.map((line) => `    ${line}`),
    ]),
    report.agrees ? 'agrees' : 'DISAGREES',
  ];
  return `${lines.join('\n')}\n`;
}
