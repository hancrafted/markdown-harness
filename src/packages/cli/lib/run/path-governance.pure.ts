/**
 * Compose every Module's claim on one path into the answer `--query` returns.
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

import type { ModuleClaim, ModuleRequirements, QueryResult } from '../../../response-contract/index.ts';

/**
 * One Module's answer, under the name the report will give it.
 *
 * A private local type beside its only consumer, on the same terms as the
 * checking command's: pairing a descriptor's key with its Module's answer is
 * `cli`'s own composition step.
 */
interface ModuleAnswer {
  /** The Module's top-level config key, read from its descriptor. */
  module: string;
  /** What that Module asks of the path, or nothing when it passed the path by. */
  claim: ModuleClaim | undefined;
}

/**
 * What the config asks of one path, across every Module that answered.
 *
 * @param path The queried path, normalised — the spelling the answer echoes back.
 * @param answers Each Module's answer under its own config key, IN DECLARED MODULE ORDER — the order the blocks are reported in.
 */
export function pathGovernance(path: string, answers: readonly ModuleAnswer[]): QueryResult {
  const modules: ModuleRequirements[] = [];

  for (const answer of answers) {
    if (answer.claim === undefined) continue;
    modules.push({ module: answer.module, rule: answer.claim.rule, requirements: answer.claim.requirements });
  }

  if (modules.length === 0) return { governance: 'invisible', path };

  return { governance: 'governed', path, modules };
}
