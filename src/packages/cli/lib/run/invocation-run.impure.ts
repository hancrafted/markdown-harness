/**
 * Compose one invocation into everything the process should emit.
 *
 * This file decides what to say and returns it; nothing here writes. Keeping
 * the writes in the entry point leaves one place where output happens, so the
 * two channels cannot drift apart — §2's contract is that a usage error puts
 * text on stderr and NOTHING on stdout, and that is only checkable if one
 * function decides both. The runtime floor is decided here for the same reason
 * and no other: it is the file's one ambient read.
 */

import { loadConfig } from '../../../config-loader/load-config.ts';
import { assessPath } from '../../../frontmatter-harness/assess.ts';
import { auditRules } from '../../../frontmatter-harness/audit.ts';
import { checkCorpus } from '../../../frontmatter-harness/check.ts';
import { queryPath } from '../../../frontmatter-harness/query.ts';
import { listMarkdownFiles } from '../../../markdown-file-tree/list-markdown-files.ts';
import type {
  AssessResponse,
  AuditResponse,
  CheckResponse,
  ConfigFault,
  QueryResponse,
} from '../../../response-contract/index.ts';
import type { Invocation } from '../argv/argv.types.ts';
import { parseArgv } from '../argv/parse-argv.pure.ts';
import { HELP, USAGE } from '../argv/usage.pure.ts';
import { unsupportedRuntime } from '../runtime/node-support.pure.ts';
import { hostInstant } from './host-instant.impure.ts';
import { unreadableGovernedFile } from './unreadable-file.pure.ts';

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

/** Could not report at all: a usage error, or a config that cannot be trusted. */
const CANNOT_REPORT = 2;

/** Ran, nothing wrong. Every command but `--check` exits this whenever it reported. */
const NOTHING_WRONG = 0;

/**
 * The corpus is wrong. `--check` alone can exit this, and exactly when
 * `invalidFiles > 0` — never for a config it could not read, which is a
 * statement about the invocation and not about the documents.
 */
const CORPUS_IS_WRONG = 1;

/** Usage text on stderr, nothing on stdout, exit 2. */
const USAGE_ERROR: Termination = { stdout: '', stderr: USAGE, code: 2 };

/**
 * Help text on stdout, nothing on stderr, exit 0.
 *
 * The mirror image of `USAGE_ERROR`, and deliberately so: the same synopsis
 * reaches the caller on the success channel when it was asked for, and on the
 * failure channel when it was not.
 */
const HELP_ANSWER: Termination = { stdout: HELP, stderr: '', code: NOTHING_WRONG };

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
function emit(response: CheckResponse | QueryResponse | AuditResponse | AssessResponse, code: number): Termination {
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
 * What one file is worth believing, at one instant.
 *
 * The instant is resolved HERE and nowhere deeper, which is the whole of this
 * command's determinism story: `--now` is used as given, and only its absence
 * reaches the clock. Whatever this settles on is echoed in the response, so a
 * defaulted run can be replayed exactly by copying the instant back onto the
 * command line.
 *
 * Never exits 1. This answer reaches an agent mid-task, and a command that can
 * fail a build is one an Operator eventually stops running for information.
 */
function assessRun({ path, config, now, root }: Invocation): Termination {
  const instant = now === '' ? hostInstant() : now;
  const load = loadConfig(config);

  if (load.config === undefined) {
    return emit({ command: 'assess', path, now: instant, config, result: rejection(load.faults) }, CANNOT_REPORT);
  }

  // `root` is always the default here: `--root` beside `--assess` is refused as
  // conflicting input, so this is the current directory by construction. The
  // seam exists because the config's globs are anchored somewhere, and the
  // Conformance suite anchors them at its own synthetic root.
  const result = assessPath({ root, path }, load.config, instant);
  return emit({ command: 'assess', path, now: instant, config, result }, NOTHING_WRONG);
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
 * Every governed file's violations, across one corpus.
 *
 * Enumerated before the config is read, for the same reason `--audit` is: a
 * `--root` that cannot be read is part of the invocation and must put nothing
 * at all on stdout.
 *
 * THE ONE COMMAND THAT CAN EXIT 1, and only on `invalidFiles`. A corpus it
 * could not finish reading exits 2 instead — "could not report at all" — because
 * a governed file silently missing from the report would make an incomplete
 * verdict look like a clean one.
 *
 * That refusal is NOT a usage error, though it answered as one until #43. The
 * invocation was well formed and the walker accepted the root; a file went
 * unreadable after enumeration, which §2 rule 3's two flavours do not cover.
 * Answering with the synopsis sent an Operator to check flags that were already
 * right, and dropped the one fact worth having. It joins the runtime floor as a
 * refusal that states its own cause on stderr.
 */
function checkRun({ root, config }: Invocation): Termination {
  const files = listMarkdownFiles(root);
  if (files === undefined) return USAGE_ERROR;

  const load = loadConfig(config);

  if (load.config === undefined) {
    return emit({ command: 'check', root, config, result: rejection(load.faults) }, CANNOT_REPORT);
  }

  const checked = checkCorpus(root, files, load.config);
  if (checked.kind === 'unreadable') {
    return { stdout: '', stderr: unreadableGovernedFile(checked.path), code: CANNOT_REPORT };
  }

  const result = checked.result;
  const wrong = result.summary.invalidFiles > 0;
  return emit({ command: 'check', root, config, result }, wrong ? CORPUS_IS_WRONG : NOTHING_WRONG);
}

/**
 * Run one invocation.
 *
 * The runtime is checked BEFORE the argv, and the order is contract. Every
 * command's answer depends on path matching, so a Node the floor rejects makes
 * all three answers untrustworthy at once — reporting a usage error first would
 * hand back a refusal about the wrong thing, and reporting a corpus verdict
 * first would hand back the answer the floor exists to withhold.
 *
 * `--help` sits behind that floor too, which is a choice rather than an
 * oversight. Many tools answer help on any runtime, and the argument for doing
 * so is real; the argument against it is that a caller on an unsupported Node
 * is one command away from a report they must not trust, and the refusal names
 * the supported range while the help text does not. So the more useful answer
 * to `mh --help` on a rejected Node is the floor's, and it keeps the ordering
 * above a single rule instead of one with an exception.
 *
 * @param argv The arguments after the executable and script.
 */
export function run(argv: readonly string[]): Termination {
  const refusal = unsupportedRuntime(process.versions.node);
  if (refusal !== undefined) return { stdout: '', stderr: refusal, code: CANNOT_REPORT };

  const invocation = parseArgv(argv);
  if (invocation === undefined) return USAGE_ERROR;

  // Answered before any of the three reporting commands, because it is the one
  // command that reads nothing: no corpus is walked and no config is opened, so
  // `--help` works in a directory that holds neither.
  if (invocation.command === 'help') return HELP_ANSWER;

  if (invocation.command === 'check') return checkRun(invocation);
  if (invocation.command === 'audit') return auditRun(invocation);
  if (invocation.command === 'assess') return assessRun(invocation);
  return queryRun(invocation);
}
