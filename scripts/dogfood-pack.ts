/**
 * The sealed pack: exactly what one exam run is handed, and nothing else.
 *
 * Six directories, one per cell of the grid, each a standalone `git init`
 * outside this repository. A `git worktree` was the obvious host and cannot be
 * used, measured rather than assumed: worktrees share `.git`, so
 * `git show <branch>:markdown-harness.config.yaml` prints the answer key from
 * inside any of them, and `git log -p` shows its introduction.
 *
 * A pack holds the faulty documents at their real paths, the baked `--check`
 * payload, one baked `--query` payload per document, and the prompt. It
 * deliberately does not hold the config, `src/`, `fixtures/`, tests,
 * `CONTEXT.md`, `AGENTS.md`, or any governed document that already passes — a
 * passing document is a worked answer, and one of them is a design-ADR.
 *
 * Both payloads ship. `--check` alone cannot describe an entry of a list that
 * does not exist yet, and `--query` states the whole shape regardless; which of
 * the two carried the work is recovered afterwards from the residual violations
 * and from `REPORT.md`, not by withholding either.
 *
 * The same payloads are written to `baseline/<arm>/`, outside every pack,
 * because scoring compares a finished run against a copy the run could not have
 * reached.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import type { Corpus } from '../src/packages/contract/corpus.ts';
import { isConfigError, type CheckResponse, type QueryResponse } from '../src/packages/contract/response.ts';
import { check } from '../src/packages/core/check.ts';
import { query } from '../src/packages/core/query.ts';
import { ARMS, CONFIGS, HOSTS, packName, type Arm } from './dogfood/grid.ts';

const PROMPT = 'scripts/dogfood/exam.md';

interface Payloads {
  check: CheckResponse;
  queries: readonly (readonly [string, QueryResponse])[];
}

/** Every markdown file in this repo, read. The walker `src/cli.ts` uses, minus the flags. */
function repoCorpus(): Corpus {
  const paths = globSync('**/*.md', { exclude: ['**/node_modules/**', '**/.git/**'] }).sort();
  return { root: '.', files: paths.map((path) => ({ path, text: readFileSync(path, 'utf8') })) };
}

function faulty(configText: string, corpus: Corpus): readonly string[] {
  const result = check(configText, corpus);
  if (isConfigError(result)) throw new Error(`config rejected: ${JSON.stringify(result.error)}`);
  return result.files.map((file) => file.path);
}

/**
 * The documents both arms agree are at fault.
 *
 * Equality is asserted rather than unioned. A file faulty under one config and
 * clean under the other would ship to the other arm as a worked answer, and the
 * two arms would stop being comparable — so a divergence stops the build rather
 * than being quietly absorbed.
 */
function subjects(configs: Record<Arm, string>, corpus: Corpus): readonly string[] {
  const [first, ...rest] = ARMS.map((arm) => faulty(configs[arm], corpus));
  for (const other of rest) {
    if (other.join('\n') !== first.join('\n')) throw new Error('the arms disagree on which documents are at fault');
  }
  return first;
}

function payloadsFor(arm: Arm, configText: string, corpus: Corpus): Payloads {
  const config = CONFIGS[arm];
  return {
    check: { command: 'check', root: '.', config, result: check(configText, corpus) },
    queries: corpus.files.map((file) => [
      file.path,
      { command: 'query', path: file.path, config, result: query(configText, file.path) },
    ]),
  };
}

function write(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function writeJson(file: string, value: unknown): void {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * A fresh repository with one commit, so scoring can diff a finished run against
 * what was handed over. Its own identity, because the pack is not this repo's
 * history and must not borrow a name from it.
 */
function seal(dir: string): void {
  const git = (...args: readonly string[]): void => {
    execFileSync('git', [...args], { cwd: dir, stdio: 'pipe' });
  };
  git('init', '-q', '-b', 'exam');
  git('config', 'user.name', 'dogfood');
  git('config', 'user.email', 'dogfood@localhost');
  git('add', '-A');
  git('commit', '-q', '-m', 'the corpus as handed over');
}

interface Pack {
  dir: string;
  corpus: Corpus;
  payloads: Payloads;
}

function writePack({ dir, corpus, payloads }: Pack): void {
  for (const file of corpus.files) write(join(dir, file.path), file.text);
  writeJson(join(dir, 'check.json'), payloads.check);
  for (const [path, payload] of payloads.queries) writeJson(join(dir, 'query', `${path}.json`), payload);
  write(join(dir, 'EXAM.md'), readFileSync(PROMPT, 'utf8'));
  seal(dir);
}

const { values } = parseArgs({
  options: { out: { type: 'string', default: join(homedir(), 'Developer', 'mh-dogfood') } },
});
const out = values.out;

// Refusing an occupied directory rather than clearing it: a pack that already
// exists may hold a finished run, and rebuilding over one destroys the only copy
// of what a Host harness actually wrote.
const occupied = ARMS.flatMap((arm) => HOSTS.map((host) => join(out, packName(arm, host)))).filter((dir) =>
  existsSync(dir),
);
if (occupied.length > 0) {
  process.stderr.write(`Refusing to overwrite ${occupied.length} existing pack(s). Remove them first:\n`);
  for (const dir of occupied) process.stderr.write(`  ${dir}\n`);
  process.exitCode = 1;
} else {
  const configs = Object.fromEntries(ARMS.map((arm) => [arm, readFileSync(CONFIGS[arm], 'utf8')])) as Record<
    Arm,
    string
  >;
  const repo = repoCorpus();
  const paths = subjects(configs, repo);
  const corpus: Corpus = { root: '.', files: repo.files.filter((file) => paths.includes(file.path)) };

  for (const arm of ARMS) {
    const payloads = payloadsFor(arm, configs[arm], corpus);
    writeJson(join(out, 'baseline', arm, 'check.json'), payloads.check);
    for (const host of HOSTS) writePack({ dir: join(out, packName(arm, host)), corpus, payloads });
  }

  const total = ARMS.length * HOSTS.length;
  process.stdout.write(`Packed ${total} directories under ${out}, ${corpus.files.length} documents each.\n`);
}
