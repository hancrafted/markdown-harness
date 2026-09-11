// The prototype's runner. NOT the product's CLI, and deliberately not shaped
// like one.
//
// `mh indexes generate` is the direction issue #108 is heading, and that issue
// is OPEN: the verb, its flags, what it prints and what it exits with are all
// undecided. Wiring this into `parse-argv.pure.ts` would pre-decide the first
// of those by making the flag parser grow a positional subcommand grammar —
// which is also the change issue #115 holds for the four shipped verbs. So this
// runner stays beside the prototype it runs, reachable through `npm run
// indexes:plan`, and the real CLI is untouched.
//
// It exists because a prototype has to be trivial to run. One command, no
// arguments required, and the default corpus is the Conformance suite — so the
// thing the tests assert on is the thing a human sees.

import { loadConfig } from '../config-loader/load-config.ts';
import { listMarkdownFiles } from '../markdown-file-tree/list-markdown-files.ts';
import type { PlannedIndex } from './lib/plan/plan.types.ts';
import { planIndexes } from './plan-indexes.ts';

/** The Conformance corpus, so `npm run indexes:plan` needs no arguments. */
const DEFAULT_ROOT = 'fixtures/indexes-conformance';
const DEFAULT_CONFIG = 'fixtures/indexes-conformance/indexes-test-config.yaml';

/** Ran and reported. */
const NOTHING_WRONG = 0;
/** Could not report at all: an unreadable corpus, or a config that cannot be trusted. */
const CANNOT_REPORT = 2;

/** Read one `--flag value` pair out of argv, or fall back. */
function flag(argv: readonly string[], name: string, fallback: string): string {
  const at = argv.indexOf(name);
  return at === -1 ? fallback : (argv[at + 1] ?? fallback);
}

/** One directory's fate, as one line a human can scan. */
function line(planned: PlannedIndex): string {
  const verdict = planned.refusal ?? planned.outcome ?? 'unknown';
  const at = planned.refusedAt === undefined ? '' : ` at ${planned.refusedAt}`;
  const traces = planned.warnings.length === 0 ? '' : ` [${planned.warnings.join(', ')}]`;
  const moved = planned.refusal === undefined && !planned.changed ? ' (no change)' : '';
  return `  ${verdict.padEnd(26)} ${planned.index}${at}${traces}${moved}`;
}

/**
 * Print what a run would write, and write it only when asked twice over.
 *
 * `--write` is required to mutate anything, and the corpus it defaults to is
 * the Conformance suite — so the safe thing is the thing that happens when a
 * reader pastes the command without reading it first. *Nothing writes to a tree
 * unasked.*
 */
function main(argv: readonly string[]): number {
  const root = flag(argv, '--root', DEFAULT_ROOT);
  const config = flag(argv, '--config', DEFAULT_CONFIG);
  const showing = argv.includes('--show');

  const files = listMarkdownFiles(root);
  if (files === undefined) {
    process.stderr.write(`cannot read a corpus at ${root}\n`);
    return CANNOT_REPORT;
  }

  const loaded = loadConfig(config);
  if (loaded.config === undefined) {
    process.stderr.write(`${JSON.stringify({ error: 'CONFIG_REJECTED', faults: loaded.faults }, null, 2)}\n`);
    return CANNOT_REPORT;
  }

  const plan = planIndexes(root, files, loaded.config);
  process.stdout.write(`planned ${plan.indexes.length} indexes under ${root}\n`);
  for (const planned of plan.indexes) process.stdout.write(`${line(planned)}\n`);

  if (showing)
    for (const planned of plan.indexes.filter((one) => one.text !== undefined))
      process.stdout.write(`\n----- ${planned.index} -----\n${planned.text}`);

  return NOTHING_WRONG;
}

process.exitCode = main(process.argv.slice(2));
