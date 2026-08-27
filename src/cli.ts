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
 * It therefore decides nothing. It maps argv to a call, a report to a stream,
 * and a report to `exitCode`.
 */

import { globSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { CheckReport } from './packages/contract/check-report.ts';
import type { ConfigRejected } from './packages/contract/config-rejected.ts';
import type { Corpus } from './packages/contract/corpus.ts';
import type { SteeringAnswer } from './packages/contract/steering-answer.ts';
import { check } from './packages/core/check.ts';
import { exitCode } from './packages/core/exit-code.ts';
import { query } from './packages/core/query.ts';
import { render } from './packages/core/render.ts';

type Report = CheckReport | ConfigRejected | SteeringAnswer;

const { values } = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    query: { type: 'string' },
    root: { type: 'string', default: '.' },
    config: { type: 'string', default: 'markdown-harness.config.yaml' },
    json: { type: 'boolean', default: false },
  },
});

/** `root` travels as the caller wrote it, never resolved, so a report compares equal on another machine. */
function corpus(root: string): Corpus {
  const paths = globSync('**/*.md', { cwd: root }).sort();
  return { root, files: paths.map((path) => ({ path, text: readFileSync(`${root}/${path}`, 'utf8') })) };
}

/**
 * The steering payload has a JSON channel and no text one, and that is a
 * decision rather than a gap.
 *
 * `--check` speaks to the Operator, who has a terminal, so it renders. A
 * steering answer's reader is the Contributor's agent: `product.md` says the
 * Contributor is steered "through their own host harness, in their own words",
 * and the boundaries table refuses a TUI on the grounds that the Host harness
 * IS the interface. So the prose for that reader is the Host harness's job.
 *
 * KNOWN CHANGE WITH AN EXPIRY: if the dogfood loop says a text channel is
 * wanted, bare `--query` starts printing prose and `--json` gains meaning for
 * it. Recorded here because nothing has adopted this surface yet, which is what
 * makes the change free today.
 */
function stream(report: Report): string {
  if (values.json || report.report === 'steering') return `${JSON.stringify(report, null, 2)}\n`;
  return render(report);
}

/**
 * A usage error is not a report, so it is the one thing that does not go through
 * `exitCode` — there is no report to hand it. It is still the same 2: argv is
 * input, and 2 says the harness could not report on the corpus because its own
 * input was wrong. Nothing goes to stdout, because stdout carries the artifact.
 */
const USAGE = [
  'usage: mh --check [--root <dir>] [--config <file>] [--json]',
  '       mh --query <path> [--config <file>]',
  '',
].join('\n');

if (!values.check && values.query === undefined) {
  process.stderr.write(USAGE);
  process.exitCode = 2;
} else {
  const configText = readFileSync(values.config, 'utf8');
  const report = values.query === undefined ? check(configText, corpus(values.root)) : query(configText, values.query);

  process.stdout.write(stream(report));
  process.exitCode = exitCode(report);
}
