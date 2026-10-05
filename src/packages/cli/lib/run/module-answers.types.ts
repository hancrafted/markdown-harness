/**
 * What each read verb of the Module port answers, and the pair `cli` composes from.
 *
 * `config-contract` leaves every answer generic: it is type-only and may name
 * neither `foundation` nor `response-contract` (ARCH-008 §1.3), so it cannot
 * say what a verb answers. `cli` is the one composer (§4.1) and pins the
 * answers here, then checks the declared Module set against them with
 * `satisfies` in `module-set.ts`. A Module that answers another shape no
 * longer compiles there.
 */

import type { ModuleDescriptor } from '../../../config-contract/index.ts';
import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { ModuleAssess, ModuleAudit, ModuleCheck, ModuleClaim } from '../../../response-contract/index.ts';
import type { ReportingCommand } from '../argv/argv.types.ts';

/**
 * Every claim a Module makes on a path, in the order it gave them; empty when it passes the path by.
 *
 * Generic in what a claim requires, because that shape is the Module's own; the
 * port pins only that a claim is a claim, and `declared-module.types.ts` reads
 * the concrete union back off the declared set.
 */
export type QueryAnswer<TRequirements = unknown> = readonly ModuleClaim<TRequirements>[];

/** A Module's rule tallies, or the first file it had to open and could not. */
export type AuditAnswer = ModuleAudit | Unreadable;

/** A Module's assessment of one path, or nothing when it passes the path by. */
export type AssessAnswer = ModuleAssess | undefined;

/** A Module's checked extent and findings, or the first governed file it could not read. */
export type CheckAnswer<TViolation = unknown> =
  { readonly kind: 'checked'; readonly result: ModuleCheck<TViolation> } | Unreadable;

/** The Module port with every verb's answer pinned: what each declared descriptor must satisfy. */
export type PinnedModule = ModuleDescriptor<unknown, QueryAnswer, AuditAnswer, AssessAnswer, CheckAnswer>;

/** One Module's answer to one verb, under the key its descriptor carries. */
export interface ModuleAnswer<TAnswer> {
  /** The Module's top-level config key, read from its descriptor. */
  readonly module: string;
  /** What that Module answered. */
  readonly answer: TAnswer;
}

/**
 * One Module, narrowed to a descriptor that carries the verb.
 *
 * Distributes over a union of descriptors, so each declared Module keeps its
 * own answer type; a Module whose type has no such member drops out entirely.
 */
export type Implementing<TModule, TVerb extends ReportingCommand> = TModule extends unknown
  ? TVerb extends keyof TModule
    ? TModule & { readonly [K in TVerb]-?: NonNullable<TModule[K]> }
    : never
  : never;
