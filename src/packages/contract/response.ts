/**
 * The envelope every command writes to stdout.
 *
 * One shape for all three commands, discriminated on `command`.
 *
 * WHAT WAS ASKED travels with WHAT WAS ANSWERED, and that is the gap this
 * envelope closes: a report used to carry no record of which config produced it,
 * so two runs of the same corpus under different configs were indistinguishable
 * afterwards. The config path is the one input that was previously invisible in
 * the output, and it is the one most likely to differ between two runs somebody
 * is comparing.
 *
 * `root` and `path` keep their own names rather than collapsing into a single
 * `target`. A merged field's meaning would depend on a sibling — the reader has
 * to check `command` before it knows what it is holding — and the two are not
 * the same kind of thing: one is a directory to walk, the other a path that need
 * not exist.
 *
 * `command` appears once. The proposal that shaped this had both a `request`
 * field and a `callerArguments.command`, which is one fact in two places, and
 * this repo has already deleted a field for that reason.
 *
 * A discriminated union rather than a generic `Response<TResult>`. A default
 * type argument of the whole result union makes the parameter decorative for
 * every consumer that does not pass one, and it leaves the envelope itself
 * unnarrowable — which is precisely the job.
 */

import type { CheckResult } from './check-result.ts';
import type { ConfigErrorResult } from './config-error.ts';
import type { CoverageResult } from './coverage-result.ts';
import type { QueryResult } from './query-result.ts';

/** The config path, echoed as the caller gave it. Never resolved, so a response compares equal on another machine. */
interface Invocation {
  config: string;
}

export interface CheckResponse extends Invocation {
  command: 'check';
  /** Echoed as the caller passed it — never resolved to an absolute path, so a stored response travels. */
  root: string;
  result: CheckResult | ConfigErrorResult;
}

export interface QueryResponse extends Invocation {
  command: 'query';
  path: string;
  result: QueryResult | ConfigErrorResult;
}

export interface CoverageResponse extends Invocation {
  command: 'coverage';
  root: string;
  result: CoverageResult | ConfigErrorResult;
}

export type MarkdownHarnessResponse = CheckResponse | QueryResponse | CoverageResponse;

/**
 * Whether a result is the config-rejected arm.
 *
 * A type guard rather than a `status` field on every result: the outcome of a
 * check is its contents, and only the failure arm needs to announce itself.
 */
export function isConfigError(result: object): result is ConfigErrorResult {
  return 'error' in result;
}
