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
import { auditRules } from '../../../frontmatter-harness/audit.ts';
import { queryPath } from '../../../frontmatter-harness/query.ts';
import { listMarkdownFiles } from '../../../markdown-file-tree/list-markdown-files.ts';
import type { AuditResponse, ConfigFault, QueryResponse } from '../../../response-contract/index.ts';
import type { Command, Invocation } from '../argv/argv.types.ts';
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
 * `--check` arrives with the phase that implements it. The set is named here
 * rather than tested as a literal inside the guard, so which commands exist is
 * a fact stated once and the next phase edits this line and nothing else.
 */
const IMPLEMENTED: readonly Command[] = ['query', 'audit'];

/** Could not report at all: a usage error, or a config that cannot be trusted. */
const CANNOT_REPORT = 2;

/** Ran, nothing wrong. Every `--audit` that reported at all exits this. */
const NOTHING_WRONG = 0;

/** Usage text on stderr, nothing on stdout, exit 2. */
const USAGE_ERROR: Termination = { stdout: '', stderr: USAGE, code: 2 };

/**
 * A config that could not be trusted, in the one shape every command reports it.
 *
 * Only the failure PAYLOAD is shared. The envelope around it stays written out
 * per command, because §4.1 chose three sibling response types over one generic
 * shape: what was asked travels with what was answered, and `root` and `path`
 * are not the same kind of thing. So this extracts the part that would
 * otherwise be spelled once per command and drift, and nothing more.
 */
function rejection(faults: readonly ConfigFault[]) {
  return { error: 'CONFIG_REJECTED', faults } as const;
}

/** JSON on stdout: 2-space indentation, trailing newline. */
function emit(response: QueryResponse | AuditResponse, code: number): Termination {
  return { stdout: `${JSON.stringify(response, null, 2)}\n`, stderr: '', code };
}

/** What the config asks of one path, before anything exists there. */
function queryRun({ path, config }: Invocation): Termination {
  const load = loadConfig(config);

  if (load.config === undefined) {
    return emit({ command: 'query', path, config, result: rejection(load.faults) }, CANNOT_REPORT);
  }

  return emit({ command: 'query', path, config, result: queryPath(path, load.config) }, NOTHING_WRONG);
}

/**
 * How every rule fared across the corpus.
 *
 * The corpus is enumerated BEFORE the config is read, and the order is the
 * contract rather than a preference. A `--root` that cannot be read is part of
 * the invocation, so it fails as a usage error — which must put nothing at all
 * on stdout. Reading the config first would answer a rejected-config response
 * on stdout for an invocation that was never valid, and a caller reading only
 * the exit code could not tell the two apart afterwards.
 *
 * Never exits 1: whether an inert rule breaks the build is the Operator's
 * policy, and a diagnostic that fails the build cannot be run for information.
 */
function auditRun({ root, config }: Invocation): Termination {
  const files = listMarkdownFiles(root);
  if (files === undefined) return USAGE_ERROR;

  const load = loadConfig(config);

  if (load.config === undefined) {
    return emit({ command: 'audit', root, config, result: rejection(load.faults) }, CANNOT_REPORT);
  }

  return emit({ command: 'audit', root, config, result: auditRules(files, load.config) }, NOTHING_WRONG);
}

/**
 * Run one invocation.
 *
 * `--check` — and the bare invocation that defaults to it — is refused as a
 * usage error for now, which keeps stderr's single job intact rather than
 * inventing a code or a stdout shape the specification does not define.
 *
 * @param argv The arguments after the executable and script.
 */
export function run(argv: readonly string[]): Termination {
  const invocation = parseArgv(argv);
  if (invocation === undefined) return USAGE_ERROR;

  const implemented = IMPLEMENTED.includes(invocation.command);
  if (!implemented) return USAGE_ERROR;

  if (invocation.command === 'audit') return auditRun(invocation);
  return queryRun(invocation);
}
