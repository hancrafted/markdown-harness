/**
 * Compose every Module's claim on one path into the answer `query` returns.
 *
 * The mirror of `corpus-verdict.pure.ts`, and deliberately its shape: an agent
 * that learned to read one report should not have to learn a second one. What
 * differs is which Modules appear — every governing Module here, because this
 * command is asked BEFORE the file exists and a Module with nothing to complain
 * about is the one whose requirements have not been met yet.
 *
 * "Invisible" is decided here and nowhere deeper, because it is a claim about
 * the WHOLE config: one Module passing a path by says nothing on its own, and
 * only the composing Package can see that none of them claimed it.
 */

import type { ModuleRequirements, QueryResult } from '../../../response-contract/index.ts';
import type { ModuleAnswer, QueryAnswer } from './module-answers.types.ts';

/**
 * What the config asks of one path, across every Module that answered.
 *
 * @param path The queried path, normalised — the spelling the answer echoes back.
 * @param answers Each Module's answer under its own config key, IN DECLARED MODULE ORDER — the order the blocks are reported in.
 */
export function pathGovernance<TRequirements>(
  path: string,
  answers: readonly ModuleAnswer<QueryAnswer<TRequirements>>[],
): QueryResult<TRequirements> {
  const modules: ModuleRequirements<TRequirements>[] = [];

  for (const answer of answers) {
    for (const claim of answer.answer) {
      modules.push({ module: answer.module, rule: claim.rule, requirements: claim.requirements });
    }
  }

  if (modules.length === 0) return { governance: 'invisible', path };

  return { governance: 'governed', path, modules };
}
