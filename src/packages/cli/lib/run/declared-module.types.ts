/**
 * The concrete response, derived from the declared Module set at compile time.
 *
 * The contracts are generic: a claim over its requirements, a finding over its
 * shape, a fault over its code. Each Module declares its own shapes in its own
 * Package, and this file reads them back off `MODULE_SET` — so the union of
 * every Module's shapes is computed, never written out, and adding a Module is
 * one Package plus one entry in the set (ARCH-008). Nothing here is checked at
 * run time: the derivation is types only, and a Module whose answers widen to
 * `unknown` would widen these with it, which `tests/module-set.test.ts` closes
 * with an exhaustive switch over the derived codes.
 */

import type { ConfigFaultCode } from '../../../config-contract/index.ts';
import type { CheckResult, MarkdownHarnessResponse, QueryResult } from '../../../response-contract/index.ts';
import type { MODULE_SET } from '../../module-set.ts';
import type { Implementing, Verb } from './module-answers.types.ts';

/** Any one declared Module's descriptor. */
type DeclaredModule = (typeof MODULE_SET)[number];

/** What a verb answers on each descriptor carrying it, distributed over a union of descriptors. */
type Returned<TModule, TVerb extends Verb> =
  TModule extends Readonly<Record<TVerb, (...args: never[]) => infer TAnswer>> ? TAnswer : never;

/**
 * What one verb answers across the declared set.
 *
 * The port's verbs are optional, so this is read only off the Modules that
 * implement the verb: one that does not contributes nothing to the union,
 * rather than an `undefined` it never answers.
 */
type AnswerTo<TVerb extends Verb> = Returned<Implementing<DeclaredModule, TVerb>, TVerb>;

/** What a claim from any declared Module requires: the union of every Module's requirement shape. */
export type DeclaredRequirements = AnswerTo<'query'>[number]['requirements'];

/** One finding from any declared Module: the union of every Module's violation shape. */
export type DeclaredViolation = Extract<
  AnswerTo<'check'>,
  { kind: 'checked' }
>['result']['files'][number]['violations'][number];

/** Every violation code a response can carry. */
export type DeclaredViolationCode = DeclaredViolation['violation'];

/**
 * Every config fault code a load against the declared set can raise: the Core's
 * and each Module's own.
 *
 * The loader gathers faults as strings — it cannot name the union without
 * naming the Modules — so this closed catalog is what the rejected-config tier
 * pins its hand-written list against, not what the loader returns.
 */
export type DeclaredFaultCode =
  ConfigFaultCode | ReturnType<DeclaredModule['validateSection']>['faults'][number]['code'];

/** What `query` answers once the declared set has answered it. */
export type DeclaredQueryResult = QueryResult<DeclaredRequirements>;

/** What `check` answers once the declared set has answered it. */
export type DeclaredCheckResult = CheckResult<DeclaredViolation>;

/** Everything `mh` can write to stdout, with every Module-owned shape filled in. */
export type DeclaredResponse = MarkdownHarnessResponse<DeclaredRequirements, DeclaredViolation>;
