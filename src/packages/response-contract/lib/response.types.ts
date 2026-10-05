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
 *
 * Generic in the two things a Module owns that reach the wire: what a claim
 * requires (`TRequirements`) and what a finding is (`TViolation`). `cli`
 * instantiates both from the declared Module set, so this Package describes the
 * envelope without naming a Module.
 */

import type { AssessResult } from './assess.types.ts';
import type { AuditResult } from './audit.types.ts';
import type { CheckResult } from './check.types.ts';
import type { ConfigErrorResult } from './config-error.types.ts';
import type { QueryResult } from './query.types.ts';

/** The `check` envelope. */
export interface CheckResponse<TViolation = unknown> {
  /** The discriminant, naming what was asked. */
  command: 'check';
  /**
   * The keys of the Modules that ran, in declared Module order: the one Module
   * a scoped run named, or every Module implementing the command. Echoed on a
   * config rejection too, naming the scope that was asked.
   */
  modules: readonly string[];
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** Every governed file's findings, or the reason the config could not be trusted. */
  result: CheckResult<TViolation> | ConfigErrorResult;
}

/** The `query` envelope. */
export interface QueryResponse<TRequirements = unknown> {
  /** The discriminant, naming what was asked. */
  command: 'query';
  /**
   * The keys of the Modules that ran, in declared Module order: the one Module
   * a scoped run named, or every Module implementing the command. Echoed on a
   * config rejection too, naming the scope that was asked.
   */
  modules: readonly string[];
  /** The path asked about, echoed exactly as the caller wrote it. It need not exist. */
  path: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** The answer, or the reason the config could not be trusted. */
  result: QueryResult<TRequirements> | ConfigErrorResult;
}

/** The `audit` envelope. */
export interface AuditResponse {
  /** The discriminant, naming what was asked. */
  command: 'audit';
  /**
   * The keys of the Modules that ran, in declared Module order: the one Module
   * a scoped run named, or every Module implementing the command. Echoed on a
   * config rejection too, naming the scope that was asked.
   */
  modules: readonly string[];
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** Every Module's rule tallies, or the reason the config could not be trusted. */
  result: AuditResult | ConfigErrorResult;
}

/**
 * The `assess` envelope.
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
 * A governed answer costs an agent two hops to `result.modules[n].agentAction`,
 * preserving each Module's instruction without inventing precedence between
 * them. An ungoverned answer remains the whole-config `result.agentAction`.
 */
export interface AssessResponse {
  /** The discriminant, naming what was asked. */
  command: 'assess';
  /**
   * The keys of the Modules that ran, in declared Module order: the one Module
   * a scoped run named, or every Module implementing the command. Echoed on a
   * config rejection too, naming the scope that was asked.
   */
  modules: readonly string[];
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
export type MarkdownHarnessResponse<TRequirements = unknown, TViolation = unknown> =
  CheckResponse<TViolation> | QueryResponse<TRequirements> | AuditResponse | AssessResponse;
