/**
 * Ask every declared Module one question, and settle what came back.
 *
 * Each verb used to repeat the `MODULE_SET.map(...)` pairing of a descriptor's
 * key with its answer, and each composer redeclared that pair privately. The
 * pair is one shape and `gatherAnswers` is the one place it is built, so the
 * composers take `ModuleAnswer<T>[]` and nothing else.
 */

import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { ModuleCommands, ReportingCommand } from '../argv/argv.types.ts';
import { REPORTING_COMMANDS } from '../argv/reporting-commands.pure.ts';
import type { Implementing, ModuleAnswer } from './module-answers.types.ts';

/**
 * Every Module's answer to one verb, in declared Module order.
 *
 * @param modules The declared Module set; each is named by the key on ITS OWN descriptor.
 * @param ask How to put the verb to one Module.
 */
export function gatherAnswers<TModule extends { readonly key: string }, TAnswer>(
  modules: readonly TModule[],
  ask: (module: TModule) => TAnswer,
): ModuleAnswer<TAnswer>[] {
  return modules.map((module) => ({ module: module.key, answer: ask(module) }));
}

/**
 * The Modules that implement one verb, in declared Module order.
 *
 * The port's verbs are optional, and a Module without one has nothing to say
 * on that command — so it is skipped, never asked, and never reported as an
 * empty answer. Presence of the member is the whole test.
 *
 * @param modules The declared Module set.
 * @param verb The command verb about to be asked.
 */
export function implementing<
  TModule extends Partial<Record<ReportingCommand, unknown>>,
  TVerb extends ReportingCommand,
>(modules: readonly TModule[], verb: TVerb): Implementing<TModule, TVerb>[] {
  return modules.filter((module): module is Implementing<TModule, TVerb> => module[verb] !== undefined);
}

/**
 * Every Module's command-line name and the commands it implements, in declared
 * Module order — what the argv parser needs to scope a run and to name the
 * alternatives when it refuses one.
 *
 * The name is the key on each Module's OWN descriptor, so the command line,
 * the config and the response's `module` field share one name and no list of
 * Module names is written anywhere.
 *
 * @param modules The declared Module set.
 */
export function moduleCommands<TModule extends { readonly key: string } & Partial<Record<ReportingCommand, unknown>>>(
  modules: readonly TModule[],
): ModuleCommands[] {
  return modules.map((module) => ({
    key: module.key,
    commands: REPORTING_COMMANDS.filter((verb) => module[verb] !== undefined),
  }));
}

/**
 * The Modules one run asks, in declared Module order.
 *
 * @param modules The declared Module set.
 * @param keys The keys the parsed invocation resolved: one for a scoped run, every implementer otherwise.
 */
export function inScope<TModule extends { readonly key: string }>(
  modules: readonly TModule[],
  keys: readonly string[],
): TModule[] {
  return modules.filter((module) => keys.includes(module.key));
}

/** Whether one answer is a read refusal rather than something to compose. */
function isUnreadable<TAnswer>(answer: TAnswer | Unreadable): answer is Unreadable {
  return typeof answer === 'object' && answer !== null && 'kind' in answer && answer.kind === 'unreadable';
}

/**
 * The first read refusal in declared Module order, or every answer once none refused.
 *
 * A refusal wins before anything is composed: a report quietly missing a file
 * looks complete, which is the one failure the reporting commands exist not to
 * have. Settling here is what lets the composers take answers that cannot be a
 * refusal, with no cast and no unreachable `throw` behind a guard.
 *
 * @param answers Each Module's answer, IN DECLARED MODULE ORDER.
 */
export function settledAnswers<TAnswer>(
  answers: readonly ModuleAnswer<TAnswer | Unreadable>[],
): Unreadable | ModuleAnswer<TAnswer>[] {
  const settled: ModuleAnswer<TAnswer>[] = [];
  for (const { module, answer } of answers) {
    if (isUnreadable(answer)) return answer;
    settled.push({ module, answer });
  }
  return settled;
}
