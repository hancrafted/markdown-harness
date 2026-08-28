#!/usr/bin/env node
/**
 * The CLI — root code, outside every package, and the ONLY file in the repo
 * that touches disk.
 *
 * That is tenet 3 made structural and it is the cash value of tenet 4: a port
 * is verified by feeding it the same JSON values, with no filesystem semantics
 * to reverse-engineer. An ESLint block bans `node:fs`, `node:process` and the
 * network builtins from `src/packages/**`, so this file is the only place they
 * can appear.
 *
 * It maps argv to a call, a report to a stream, and a report to `exitCode`. It
 * is not free of decisions, and pretending otherwise would hide the ones a port
 * has to match: the DEFAULT CONFIG FILENAME (which `architecture.md` lists as
 * still open), the corpus glob `**\/*.md`, what it never walks, its sort, which
 * channel a report leaves by, and which command wins when both are given.
 *
 * KNOWN GAP: a config file that cannot be READ still exits 1 with a Node stack
 * trace — the code reserved for "the corpus is wrong", for a fault that is
 * entirely in the input. Closing it properly needs a second `ConfigFault` code
 * and its fixture, which is a contract change.
 */

import { globSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { Corpus } from './packages/contract/corpus.ts';
import type { MarkdownHarnessResponse } from './packages/contract/response.ts';
import { check } from './packages/core/check.ts';
import { coverage } from './packages/core/coverage.ts';
import { exitCode } from './packages/core/exit-code.ts';
import { query } from './packages/core/query.ts';

const OPTIONS = {
  check: { type: 'boolean', default: false },
  coverage: { type: 'boolean', default: false },
  query: { type: 'string' },
  root: { type: 'string', default: '.' },
  config: { type: 'string', default: 'markdown-harness.config.yaml' },
} as const;

/**
 * `parseArgs` throws on a flag it does not know, and an uncaught throw would
 * exit 1 with a Node stack trace — the code reserved for "the CORPUS is wrong",
 * for a fault that is entirely in the invocation. `null` means argv did not
 * parse, and joins the usage path below.
 */
function argv() {
  try {
    return parseArgs({ options: OPTIONS }).values;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return null;
  }
}

/**
 * Directories the walker refuses UNCONDITIONALLY, whatever the config says.
 *
 * Neither is a governance decision, which is why neither is configurable: one
 * holds somebody else's code and the other is a database. A config cannot opt
 * back in, because there is nothing here an adopter could want.
 *
 * Written `**\/x/**` rather than `x/**`, and that spelling is measured rather
 * than stylistic. The anchored form matches `node_modules/a.md` and misses
 * `packages/x/node_modules/a.md`, which is the shape every workspace repo has;
 * the `**\/` form matches everywhere the anchored one does, plus the nested
 * copy, and still leaves `node_modules_keep/a.md` alone. It strictly dominates.
 *
 * `.git/**` is currently redundant and is kept anyway. Measured: `*` does not
 * match a leading dot, so no dot directory is reachable by `**\/*.md` at all
 * and this repo's `.agents/` — 62 markdown files — is already invisible for the
 * same reason. The exclusion is written because it has to hold when the
 * enumeration glob changes, and because a port whose glob matches dotfiles must
 * not have to rediscover it.
 */
const NEVER_WALKED = ['**/node_modules/**', '**/.git/**'] as const;

function enumerate(root: string): readonly string[] {
  return globSync('**/*.md', { cwd: root, exclude: [...NEVER_WALKED] }).sort();
}

/** `root` travels as the caller wrote it, never resolved, so a response compares equal on another machine. */
function corpus(root: string): Corpus {
  return { root, files: enumerate(root).map((path) => ({ path, text: readFileSync(`${root}/${path}`, 'utf8') })) };
}

/**
 * The paths, with no file read at all.
 *
 * `coverage` resolves rules against PATHS and never opens a file, and `Corpus`
 * explicitly permits a caller to load `text` only for the files it needs. So
 * reading a few hundred documents to produce a table that cannot depend on their
 * contents is waste this exploits rather than pays.
 */
function pathsOnly(root: string): Corpus {
  return { root, files: enumerate(root).map((path) => ({ path, text: '' })) };
}

/**
 * Every response leaves as JSON. There is one channel and no flag to choose it.
 *
 * `product.md` puts the Host harness at the interface and refuses a TUI, and
 * `CONTEXT.md` says the Contributor never opens a terminal — so both readers of
 * this output are reached through an agent, and an agent is better served by the
 * artifact than by a paragraph about it. The prose for a human is whatever their
 * Host harness writes from this.
 *
 * A second serialisation — YAML, or a rendered summary — is an addition to this
 * function and nothing else, because no wording is stored anywhere in the data.
 */
function stream(response: MarkdownHarnessResponse): string {
  return `${JSON.stringify(response, null, 2)}\n`;
}

/**
 * Which command wins when more than one is given: `--query`, then `--coverage`,
 * then `--check`.
 *
 * A PRECEDENCE rather than a rejection, which is the pre-existing sloppiness
 * this flag makes one case wider rather than something it introduces:
 * `mh --check --query x` has always answered the query and ignored the check,
 * silently, and `--root` is accepted and ignored on a query the same way.
 * Refusing a contradictory invocation is a real improvement and it is a decision
 * about the command surface rather than a tidy-up, so it stays named here rather
 * than settled quietly.
 */
function respond(values: Options, configText: string): MarkdownHarnessResponse {
  const { config, root } = values;

  if (values.query !== undefined) {
    return { command: 'query', path: values.query, config, result: query(configText, values.query) };
  }
  if (values.coverage) {
    return { command: 'coverage', root, config, result: coverage(configText, pathsOnly(root)) };
  }
  return { command: 'check', root, config, result: check(configText, corpus(root)) };
}

type Options = NonNullable<ReturnType<typeof argv>>;

/**
 * A usage error is not a report, so it is the one thing that does not go through
 * `exitCode` — there is no report to hand it. It is still the same 2: argv is
 * input, and 2 says `markdown-harness` could not report on the corpus because
 * its own input was wrong. Nothing goes to stdout, because stdout carries the artifact.
 */
const USAGE = [
  'usage: mh --check    [--root <dir>] [--config <file>]',
  '       mh --query    <path>         [--config <file>]',
  '       mh --coverage [--root <dir>] [--config <file>]',
  '',
  'Every response is written to stdout as JSON.',
  '',
  '  --check     every governed file with a fault, and the counts. Exits 1 when the corpus is wrong.',
  '  --query     what the config asks of one path, before it is written. Always exits 0.',
  '  --coverage  how every rule fared, so a rule that governs nothing is visible. Always exits 0.',
  '',
].join('\n');

const values = argv();

if (values === null || (!values.check && !values.coverage && values.query === undefined)) {
  process.stderr.write(USAGE);
  process.exitCode = 2;
} else {
  const response = respond(values, readFileSync(values.config, 'utf8'));

  process.stdout.write(stream(response));
  process.exitCode = exitCode(response);
}
