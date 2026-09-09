/**
 * The envelope every command returns.
 *
 * A discriminated union on `command`, not a generic `Response<T>`: what was
 * asked travels with what was answered, so two runs of the same corpus under
 * different configs stay distinguishable.
 *
 * No shared base interface for the one field all commands have in common —
 * `config: string` written per variant costs two lines and saves every reader a
 * hop, and a base named after what the variants share ends up named after
 * nothing.
 */

import type { AssessResult } from './assess.types.ts';
import type { AuditResult } from './audit.types.ts';
import type { CheckResult } from './check.types.ts';
import type { ConfigErrorResult } from './config-error.types.ts';
import type { QueryResult } from './query.types.ts';

/** The `--check` envelope. */
export interface CheckResponse {
  /** The discriminant, naming what was asked. */
  command: 'check';
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** Every governed file's findings, or the reason the config could not be trusted. */
  result: CheckResult | ConfigErrorResult;
}

/** The `--query` envelope. */
export interface QueryResponse {
  /** The discriminant, naming what was asked. */
  command: 'query';
  /** The path asked about, echoed exactly as the caller wrote it. It need not exist. */
  path: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** The answer, or the reason the config could not be trusted. */
  result: QueryResult | ConfigErrorResult;
}

/** The `--audit` envelope. */
export interface AuditResponse {
  /** The discriminant, naming what was asked. */
  command: 'audit';
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** Every rule's fate, or the reason the config could not be trusted. */
  result: AuditResult | ConfigErrorResult;
}

/**
 * The `--assess` envelope.
 *
 * Carries `now` beside `path`, and both are echoed exactly as the caller wrote
 * them. Echoing the instant is the whole reason this command can read a clock
 * and still be trusted: the answer names what it was compared against, so a
 * reader can repeat the comparison by hand, and a caller can pin the same
 * instant and get the same answer back.
 *
 * The envelope rather than a flat object, and the choice is deliberate: one
 * shape whether the command answers or refuses the config, which is what keeps
 * `isConfigError` meaningful and keeps `result` the one place an answer lives.
 * It costs an agent reading this one hop to `result.agentAction`.
 */
export interface AssessResponse {
  /** The discriminant, naming what was asked. */
  command: 'assess';
  /** The path asked about, echoed exactly as the caller wrote it. It need not exist. */
  path: string;
  /** The Assessment instant, echoed exactly as it was supplied — or as the host clock gave it. */
  now: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** The answer, or the reason the config could not be trusted. */
  result: AssessResult | ConfigErrorResult;
}

/**
 * Everything `mh` can write to stdout.
 *
 * Narrow on `command` first: the four variants answer about different kinds of
 * thing, and only after that is `result` worth reading — with `isConfigError`
 * to separate an answer from a rejection.
 */
export type MarkdownHarnessResponse = CheckResponse | QueryResponse | AuditResponse | AssessResponse;
