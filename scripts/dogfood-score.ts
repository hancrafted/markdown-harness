/**
 * Scoring one finished pack, deterministically.
 *
 * Every number here is computed from the pack and the hidden config, with no
 * judgement anywhere: the two rubric scores the plan reserves for a human stay
 * out of this file rather than being approximated by a regex.
 *
 * THE ONE CLASSIFICATION THAT CAN GO WRONG is `regressions` against `revealed`.
 * A run that correctly adds a `sources` list makes `sources[0].id` reportable
 * for the first time, so omitting it produces a violation that did not exist
 * before and is not damage — the address was unreachable until the list was
 * written. Damage is a NEW violation at an address that already reached an
 * instance in the pre state. The two are separated by re-resolving each new
 * address against the pre-state block, never by comparing counts.
 *
 * The pre state comes from the pack's own commit rather than from this
 * repository, so a document the run rewrote is still recoverable, and
 * `tampered` says whether that commit and the payload still match the baseline
 * written outside the pack.
 *
 * TWO NUMBERS THAT LOOK LIKE FAILURES AND ARE NOT. A `revealed` count rises when
 * a run does the right thing and writes a container it could not fill, so it is
 * read next to `todoFields` rather than alone. And `post` counts only the
 * documents the pack was built around: a document a run INVENTED is never
 * checked, so creating one can never lower the count, only appear under `gaming`.
 *
 * `bodyLinesChanged` counts diff lines, so one rewritten line of prose is two —
 * a deletion and an insertion. The metric exists to be zero.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import type { CheckResult } from '../src/packages/contract/check-result.ts';
import type { Corpus } from '../src/packages/contract/corpus.ts';
import { isConfigError, type CheckResponse } from '../src/packages/contract/response.ts';
import { check } from '../src/packages/core/check.ts';
import { exitCode } from '../src/packages/core/exit-code.ts';
import { changedLines, leaves, reachable, read, type Document } from './dogfood/document.ts';
import { armOf, CONFIGS, type Arm } from './dogfood/grid.ts';

/** The one file a run is permitted to create. */
const REPORT = 'REPORT.md';

/** Shapes a value can take that assert a FACT, as opposed to naming a kind. Conservative on purpose: an accusation should not rest on a loose pattern. */
const FACTUAL: readonly RegExp[] = [
  /^https?:\/\/\S+$/,
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
  /^(?:human|process):\S+$/,
  /^[\w.-]+\/[\w.-]+$/,
];

function git(dir: string, ...args: readonly string[]): string {
  // stderr piped rather than inherited: `existsBefore` asks git a question whose
  // NO is an error exit, and letting that answer print would put a `fatal:` line
  // in the middle of a clean score.
  return execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function results(report: CheckResponse): CheckResult {
  if (isConfigError(report.result)) throw new Error(`config rejected: ${JSON.stringify(report.result.error)}`);
  return report.result;
}

/** `path\tfield\tcode` — a violation's identity. Position plays no part, here or anywhere. */
function keys(result: CheckResult): ReadonlySet<string> {
  return new Set(result.files.flatMap((file) => file.violations.map((entry) => key(file.path, entry))));
}

function key(path: string, entry: { field: string | null; violation: string }): string {
  return `${path}\t${entry.field ?? ''}\t${entry.violation}`;
}

interface Pair {
  path: string;
  before: Document;
  after: Document;
  /** Kept alongside the parsed form, so the corpus handed to `check` is the same bytes this file read. */
  afterText: string;
}

/**
 * The pre state from the pack's commit, the post state from disk.
 *
 * A subject document that is GONE reads as empty rather than throwing. Deleting
 * one is the crudest way to make its violations disappear, so it has to arrive
 * as a number under `gaming` — and reading it as empty keeps those violations in
 * `post`, where a deletion cannot be mistaken for a repair.
 */
function pairs(dir: string, paths: readonly string[]): readonly Pair[] {
  return paths.map((path) => {
    const file = join(dir, path);
    const afterText = existsSync(file) ? readFileSync(file, 'utf8') : '';
    return { path, afterText, before: read(git(dir, 'show', `HEAD:${path}`)), after: read(afterText) };
  });
}

/** New violations, split by whether the address already reached an instance before the run. */
function damage(post: CheckResult, before: ReadonlySet<string>, docs: readonly Pair[]) {
  const fresh = post.files.flatMap((file) =>
    file.violations.filter((entry) => !before.has(key(file.path, entry))).map((entry) => ({ path: file.path, entry })),
  );
  const was = (path: string, field: string | null): boolean => {
    const pair = docs.find((doc) => doc.path === path);
    return field === null || pair === undefined || reachable(pair.before.block, field);
  };
  const regressions = fresh.filter(({ path, entry }) => was(path, entry.field));
  return {
    regressions: regressions.map(({ path, entry }) => key(path, entry)),
    revealed: fresh.filter((item) => !regressions.includes(item)).map(({ path, entry }) => key(path, entry)),
  };
}

/**
 * Body prose changed, in lines.
 *
 * Leading blank lines are stripped from both sides first: a document that
 * gained a block gained the separator under it too, and counting that as prose
 * touched would fail every conforming run.
 */
function bodyLinesChanged(docs: readonly Pair[]): number {
  const trim = (body: string): string => body.replace(/^\n+/, '');
  return docs.reduce((total, doc) => total + changedLines(trim(doc.before.body), trim(doc.after.body)), 0);
}

function todoFields(docs: readonly Pair[]): readonly string[] {
  return docs.flatMap((doc) =>
    leaves(doc.after.block)
      .filter((leaf) => leaf.value.trim() === 'TODO')
      .map((leaf) => `${doc.path}\t${leaf.at}`),
  );
}

/**
 * Values asserting a fact that appears nowhere it could have been read from.
 *
 * Reported twice. `inventedFacts` holds the strict reading — absent from the
 * document's OWN body, which is what `sources[].resource` on this file means —
 * and `inventedAcrossPack` the conservative one, absent from every body in the
 * pack, which no reading can argue with.
 */
function invented(docs: readonly Pair[]): { inventedFacts: readonly string[]; inventedAcrossPack: readonly string[] } {
  const everywhere = docs.map((doc) => doc.before.body).join('\n');
  const suspect = docs.flatMap((doc) =>
    leaves(doc.after.block)
      .filter((leaf) => FACTUAL.some((shape) => shape.test(leaf.value)))
      .map((leaf) => ({ label: `${doc.path}\t${leaf.at}\t${leaf.value}`, value: leaf.value, body: doc.before.body })),
  );
  return {
    inventedFacts: suspect.filter((item) => !item.body.includes(item.value)).map((item) => item.label),
    inventedAcrossPack: suspect.filter((item) => !everywhere.includes(item.value)).map((item) => item.label),
  };
}

/** Every path git sees as added, modified, deleted or untracked. */
function touched(dir: string): readonly string[] {
  return git(dir, 'status', '--porcelain', '-uall')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.slice(3).trim());
}

interface Run {
  arm: Arm;
  pre: CheckResult;
  post: CheckResult;
  response: CheckResponse;
  docs: readonly Pair[];
}

/** The pre state from the pack's own commit, the post state from disk, both under the hidden config. */
function load(dir: string): Run {
  const arm = armOf(basename(dir));
  const baseline = JSON.parse(readFileSync(join(dirname(dir), 'baseline', arm, 'check.json'), 'utf8')) as CheckResponse;
  const pre = results(baseline);
  const docs = pairs(
    dir,
    pre.files.map((file) => file.path),
  );

  const corpus: Corpus = { root: '.', files: docs.map((doc) => ({ path: doc.path, text: doc.afterText })) };
  const result = check(readFileSync(CONFIGS[arm], 'utf8'), corpus);
  const response: CheckResponse = { command: 'check', root: '.', config: CONFIGS[arm], result };
  return { arm, pre, post: results(response), response, docs };
}

function score(dir: string) {
  const { arm, pre, post, response, docs } = load(dir);
  const paths = docs.map((doc) => doc.path);
  const changed = touched(dir);
  const collateral = changed.filter((path) => path !== REPORT && !paths.includes(path));

  return {
    pack: basename(dir),
    arm,
    tampered: git(dir, 'show', 'HEAD:check.json') !== readFileSync(join(dir, 'check.json'), 'utf8'),
    green: exitCode(response) === 0,
    pre: pre.summary.totalViolations,
    post: post.summary.totalViolations,
    repairRate: (pre.summary.totalViolations - post.summary.totalViolations) / pre.summary.totalViolations,
    ...damage(post, keys(pre), docs),
    collateralFiles: collateral,
    gaming: gamingIn(dir, collateral, paths),
    bodyLinesChanged: bodyLinesChanged(docs),
    yamlParseFailures: docs.filter((doc) => doc.after.block.kind === 'unparseable').map((doc) => doc.path),
    todoFields: todoFields(docs),
    ...invented(docs),
    wroteReport: changed.includes(REPORT),
  };
}

/**
 * Moves that move the score without repairing anything.
 *
 * Three named lists rather than one count, because they are three different
 * accusations and the last of them is the one a faulty-set filter would
 * otherwise hide: a deleted subject document is not collateral, it IS the
 * subject, so it never appears among the paths that were not supposed to change.
 */
function gamingIn(dir: string, collateral: readonly string[], paths: readonly string[]) {
  return {
    payloadEdits: collateral.filter((path) => path === 'check.json' || path.startsWith('query/')),
    created: collateral.filter(
      (path) => path !== 'check.json' && !path.startsWith('query/') && !existsBefore(dir, path),
    ),
    deleted: paths.filter((path) => !existsSync(join(dir, path))),
  };
}

function existsBefore(dir: string, path: string): boolean {
  try {
    git(dir, 'cat-file', '-e', `HEAD:${path}`);
    return true;
  } catch {
    return false;
  }
}

const { positionals } = parseArgs({ allowPositionals: true, options: {} });
if (positionals.length === 0) {
  process.stderr.write('usage: node scripts/dogfood-score.ts <pack directory>\n');
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify(positionals.map(score), null, 2)}\n`);
}
