/**
 * Compose one invocation into everything the process should emit.
 *
 * This file decides what to say and returns it; nothing here writes. Keeping
 * the writes in the entry point leaves one place where output happens, so the
 * two channels cannot drift apart — §2's contract is that a usage error puts
 * text on stderr and NOTHING on stdout, and that is only checkable if one
 * function decides both.
 */

import { loadConfig } from '../../../config-loader/load-config.ts';
import { queryPath } from '../../../frontmatter-harness/query.ts';
import type { QueryResponse } from '../../../response-contract/index.ts';
import type { Command } from '../argv/argv.types.ts';
import { parseArgv } from '../argv/parse-argv.pure.ts';
import { USAGE } from '../argv/usage.pure.ts';

/**
 * What the process should emit and exit with.
 *
 * A private local type beside its only consumer: moving it to a `types` file
 * would widen a decision this Package makes about itself into a shape other
 * Packages could reach.
 */
interface Termination {
  /** Written to stdout verbatim. Empty means write nothing. */
  stdout: string;
  /** Written to stderr verbatim. Empty means write nothing. */
  stderr: string;
  /** The process exit code. */
  code: number;
}

/**
 * The commands this build can answer.
 *
 * `--check` and `--audit` arrive with the phases that implement them. The set is
 * named here rather than tested as a literal inside the guard, so which commands
 * exist is a fact stated once and the next phase edits this line and nothing
 * else.
 */
const IMPLEMENTED: readonly Command[] = ['query'];

/** Usage text on stderr, nothing on stdout, exit 2. */
const USAGE_ERROR: Termination = { stdout: '', stderr: USAGE, code: 2 };

/** JSON on stdout: 2-space indentation, trailing newline. */
function emit(response: QueryResponse, code: number): Termination {
  return { stdout: `${JSON.stringify(response, null, 2)}\n`, stderr: '', code };
}

/**
 * Run one invocation.
 *
 * Only `--query` is built in this phase. `--check` and `--audit` — and the bare
 * invocation that defaults to `--check` — are refused as usage errors for now,
 * which keeps stderr's single job intact rather than inventing a code or a
 * stdout shape the specification does not define.
 *
 * @param argv The arguments after the executable and script.
 */
export function run(argv: readonly string[]): Termination {
  const invocation = parseArgv(argv);
  if (invocation === undefined) return USAGE_ERROR;

  const implemented = IMPLEMENTED.includes(invocation.command);
  if (!implemented) return USAGE_ERROR;

  const { path, config } = invocation;
  const load = loadConfig(config);

  if (load.config === undefined) {
    return emit({ command: 'query', path, config, result: { error: 'CONFIG_REJECTED', faults: load.faults } }, 2);
  }

  return emit({ command: 'query', path, config, result: queryPath(path, load.config) }, 0);
}
