/**
 * The shapes `termination.pure.ts` composes from and switches on.
 *
 * An exported type declaration belongs in *.types.ts, so these moved out of
 * the composer that used to declare them inline: `Route`, what `route`
 * decides from the runtime version and the raw argv alone, and `Gathered`,
 * everything the impure shell can have gathered by the time it asks
 * `terminationFor` what to emit.
 */

import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { AssessResult, AuditResult, ConfigFault } from '../../../response-contract/index.ts';
import type { Invocation } from '../argv/argv.types.ts';
import type { DeclaredCheckResult, DeclaredQueryResult } from './declared-module.types.ts';

/** Refused before a command could even be identified. */
export type Refusal =
  | { readonly kind: 'runtime-refused'; readonly refusal: string }
  /** `reason` is empty when the synopsis alone explains the refusal. */
  | { readonly kind: 'argv-refused'; readonly reason: string };

/** Where `route` got to, given only the runtime version and the raw argv. */
export type Route = Refusal | { readonly kind: 'routed'; readonly invocation: Invocation };

/** A config load's outcome, once a command is already known to want one. */
export type ConfigOutcome<Result> =
  | { readonly kind: 'rejected'; readonly faults: readonly ConfigFault<string>[] }
  | { readonly kind: 'answered'; readonly result: Result };

/** What `query` gathered. */
export interface QueryGathered {
  readonly kind: 'query';
  /** The keys of the Modules asked, in declared order — echoed as the response's `modules`. */
  readonly modules: readonly string[];
  readonly path: string;
  readonly config: string;
  readonly outcome: ConfigOutcome<DeclaredQueryResult>;
}

/** What `audit` gathered. */
export interface AuditGathered {
  readonly kind: 'audit';
  /** The keys of the Modules asked, in declared order — echoed as the response's `modules`. */
  readonly modules: readonly string[];
  readonly root: string;
  readonly config: string;
  readonly outcome: { readonly kind: 'no-root' } | Unreadable | ConfigOutcome<AuditResult>;
}

/** What `assess` gathered. `now` is already resolved — see `resolvedInstant`. */
export interface AssessGathered {
  readonly kind: 'assess';
  /** The keys of the Modules asked, in declared order — echoed as the response's `modules`. */
  readonly modules: readonly string[];
  readonly path: string;
  readonly now: string;
  readonly config: string;
  readonly outcome: ConfigOutcome<AssessResult>;
}

/** What `check` gathered. */
export interface CheckGathered {
  readonly kind: 'check';
  /** The keys of the Modules asked, in declared order — echoed as the response's `modules`. */
  readonly modules: readonly string[];
  readonly root: string;
  readonly config: string;
  readonly outcome: { readonly kind: 'no-root' } | Unreadable | ConfigOutcome<DeclaredCheckResult>;
}

/**
 * The four command-shaped gathers, once a command is already known — what is
 * left of `Gathered` once a runtime refusal, an argv refusal and `--help` are
 * excluded. Named so `terminationFor` can delegate to a second function
 * without repeating the four-way union at both ends of the call.
 */
export type CommandGathered = QueryGathered | AuditGathered | AssessGathered | CheckGathered;

/**
 * Everything `terminationFor` can decide from: a refusal that never reached a
 * command, or one command's fully gathered materials.
 */
export type Gathered = Refusal | { readonly kind: 'help' } | CommandGathered;
