/**
 * Ask every declared Module one question, and settle what came back.
 *
 * Each verb used to repeat the `MODULE_SET.map(...)` pairing of a descriptor's
 * key with its answer, and each composer redeclared that pair privately. The
 * pair is one shape and `gatherAnswers` is the one place it is built, so the
 * composers take `ModuleAnswer<T>[]` and nothing else.
 */

import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { Implementing, ModuleAnswer, Verb } from './module-answers.types.ts';

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
export function implementing<TModule extends Partial<Record<Verb, unknown>>, TVerb extends Verb>(
  modules: readonly TModule[],
  verb: TVerb,
): Implementing<TModule, TVerb>[] {
  return modules.filter((module): module is Implementing<TModule, TVerb> => module[verb] !== undefined);
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
