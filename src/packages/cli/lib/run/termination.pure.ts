/**
 * Decide what one invocation should emit, from what the impure shell gathered.
 *
 * Extracted per #184: keeps exit codes, stdout/stderr split, JSON formatting,
 * rejection payloads, and deterministic rules pure and assertable without host I/O.
 */

import type { ConfigFault, MarkdownHarnessResponse } from '../../../response-contract/index.ts';
import {
  assessResponse,
  auditResponse,
  checkResponse,
  configError,
  isConfigError,
  queryResponse,
  serializeResponse,
} from '../../../response-contract/index.ts';
import { parseArgv } from '../argv/parse-argv.pure.ts';
import { HELP, USAGE } from '../argv/usage.pure.ts';
import { unsupportedRuntime } from '../runtime/node-support.pure.ts';
import type {
  AssessGathered,
  AuditGathered,
  CheckGathered,
  CommandGathered,
  ConfigOutcome,
  Gathered,
  QueryGathered,
  Route,
} from './termination.types.ts';
import { unreadableGovernedFile } from './unreadable-file.pure.ts';

/**
 * What the process should emit and exit with.
 *
 * A private local type beside its only consumer: never leaves this file.
 */
interface Termination {
  stdout: string;
  stderr: string;
  code: number;
}

/** Could not report at all: a usage error, or a config that cannot be trusted. */
const CANNOT_REPORT = 2;
/** Ran, nothing wrong. Every command but `--check` exits this whenever it reported. */
const NOTHING_WRONG = 0;
/** The corpus is wrong. `--check` alone can exit this, and exactly when `invalidFiles > 0`. */
const CORPUS_IS_WRONG = 1;

/** Usage text on stderr, nothing on stdout, exit 2. */
const USAGE_ERROR: Termination = { stdout: '', stderr: USAGE, code: CANNOT_REPORT };
/** Help text on stdout, nothing on stderr, exit 0. */
const HELP_ANSWER: Termination = { stdout: HELP, stderr: '', code: NOTHING_WRONG };

/** JSON on stdout: 2-space indentation, trailing newline. */
function emit(response: MarkdownHarnessResponse, code: number): Termination {
  return { stdout: serializeResponse(response), stderr: '', code };
}

/** Every response uses the rejection guard to keep failure exit policy central. */
function responseTermination(response: MarkdownHarnessResponse, answeredCode = NOTHING_WRONG): Termination {
  return emit(response, isConfigError(response.result) ? CANNOT_REPORT : answeredCode);
}

/**
 * `--now`, exactly as given — or the clock, when it was not.
 *
 * THE RULE, not the read: empty `--now` falls back to the host clock.
 */
export function resolvedInstant(now: string, clock: string): string {
  return now === '' ? clock : now;
}

/**
 * Decide how far this invocation gets before it names a command.
 *
 * ORDERING CONTRACT 1: The runtime floor is decided BEFORE argv is parsed.
 * Feeding an unsupported Node version beside invalid argv yields runtime refusal.
 *
 * @param nodeVersion `process.versions.node`, read once by the caller.
 * @param argv The arguments after the executable and script.
 */
export function route(nodeVersion: string, argv: readonly string[]): Route {
  const refusal = unsupportedRuntime(nodeVersion);
  if (refusal !== undefined) return { kind: 'runtime-refused', refusal };

  const invocation = parseArgv(argv);
  if (invocation === undefined) return { kind: 'argv-refused' };

  return { kind: 'routed', invocation };
}

/** Compile-time exhaustiveness: reached only if a switch left a case unhandled. */
function assertNever(value: never): never {
  throw new Error(`unreachable gathered kind: ${JSON.stringify(value)}`);
}

/**
 * THE CONFIG GUARD, written once. Every reporting command loads the same
 * config the same way and answers a rejection the same way; only the envelope
 * around the payload differs per command, which is what the two callbacks are
 * for.
 */
function fromConfigOutcome<Result>(
  outcome: ConfigOutcome<Result>,
  onRejected: (faults: readonly ConfigFault[]) => Termination,
  onAnswered: (result: Result) => Termination,
): Termination {
  return outcome.kind === 'rejected' ? onRejected(outcome.faults) : onAnswered(outcome.result);
}

function queryTermination(gathered: QueryGathered): Termination {
  return fromConfigOutcome(
    gathered.outcome,
    (faults) => responseTermination(queryResponse(gathered.path, gathered.config, configError(faults))),
    (result) => responseTermination(queryResponse(gathered.path, gathered.config, result)),
  );
}

/**
 * THE CORPUS GUARD, written once.
 *
 * ORDERING CONTRACT 2: Evaluated BEFORE the config is read. If corpus files
 * cannot be enumerated, the invocation refuses as a usage error before reading
 * or validating any config. Calling `whenPresent` lazily guarantees that the
 * config loader is never invoked when the corpus root is absent.
 */
export function withCorpusGuard<TCorpus, TResult>(
  corpus: TCorpus | undefined,
  whenPresent: (corpus: TCorpus) => TResult,
): { readonly kind: 'no-root' } | TResult {
  if (corpus === undefined) return { kind: 'no-root' };
  return whenPresent(corpus);
}

/**
 * Map a corpus outcome to a termination: a missing root emits usage error on
 * stderr, nothing on stdout, and exits 2.
 */
function withCorpus<T extends { readonly kind: string }>(
  outcome: { readonly kind: 'no-root' } | T,
  whenPresent: (validOutcome: T) => Termination,
): Termination {
  if (outcome.kind === 'no-root') return USAGE_ERROR;
  return whenPresent(outcome as T);
}

function auditTermination(gathered: AuditGathered): Termination {
  return withCorpus(gathered.outcome, (outcome) =>
    fromConfigOutcome(
      outcome,
      (faults) => responseTermination(auditResponse(gathered.root, gathered.config, configError(faults))),
      (result) => responseTermination(auditResponse(gathered.root, gathered.config, result)),
    ),
  );
}

function assessTermination(gathered: AssessGathered): Termination {
  return fromConfigOutcome(
    gathered.outcome,
    (faults) => responseTermination(assessResponse(gathered, configError(faults))),
    (result) => responseTermination(assessResponse(gathered, result)),
  );
}

function checkTermination(gathered: CheckGathered): Termination {
  return withCorpus(gathered.outcome, (outcome) => {
    if (outcome.kind === 'unreadable') {
      return { stdout: '', stderr: unreadableGovernedFile(outcome.path), code: CANNOT_REPORT };
    }

    return fromConfigOutcome(
      outcome,
      (faults) => responseTermination(checkResponse(gathered.root, gathered.config, configError(faults))),
      (result) => {
        // THE SECOND RULE ENCODED AS A CONDITIONAL RATHER THAN AN EFFECT: whether
        // a corpus is wrong is a fact about `invalidFiles`, and only `--check`
        // ever exits on it.
        const wrong = result.summary.invalidFiles > 0;
        return responseTermination(
          checkResponse(gathered.root, gathered.config, result),
          wrong ? CORPUS_IS_WRONG : NOTHING_WRONG,
        );
      },
    );
  });
}

/**
 * THE VERB DISPATCH for the four reporting commands, once a runtime refusal,
 * an argv refusal and `--help` are already ruled out — split out of
 * `terminationFor` below so neither switch's complexity crosses the budget on
 * its own. Made exhaustive by `assertNever`, which turns an unhandled case
 * into a compiler error instead of a command that routes nowhere.
 */
function terminationForCommand(gathered: CommandGathered): Termination {
  switch (gathered.kind) {
    case 'query':
      return queryTermination(gathered);
    case 'audit':
      return auditTermination(gathered);
    case 'assess':
      return assessTermination(gathered);
    case 'check':
      return checkTermination(gathered);
    default:
      return assertNever(gathered);
  }
}

/**
 * THE ONE DETERMINISTIC COMPOSER. Everything the shell gathered, in; what the
 * process should emit, out. Narrows away a refusal and `--help` itself, then
 * hands the rest to `terminationForCommand` — TypeScript narrows `gathered` to
 * exactly `CommandGathered` by `default`, so a case added to `Gathered` with
 * no branch here fails to compile at that call rather than at runtime.
 */
export function terminationFor(gathered: Gathered): Termination {
  switch (gathered.kind) {
    case 'runtime-refused':
      return { stdout: '', stderr: gathered.refusal, code: CANNOT_REPORT };
    case 'argv-refused':
      return USAGE_ERROR;
    case 'help':
      return HELP_ANSWER;
    default:
      return terminationForCommand(gathered);
  }
}
