// What `mh indexes generate` would write, without writing it.
//
// PROTOTYPE. Throwaway on day one; the question it answers and the answers it
// reached are in `docs/workshop/prototype/index-generator/findings.md`.
//
// The dry run is the whole entry point, and there is deliberately no writing
// twin here. Two tenets meet at this line: *nothing writes to a tree unasked*,
// so generation is a command an Operator runs rather than a side effect of
// `--check`; and the command that runs it has no settled shape yet, because
// issue #108 is open. A planner is the half that can be built and pinned before
// that question closes — and a Conformance suite asserting exact bytes needs a
// dry run anyway, since a suite that wrote to its own corpus could not be run
// twice.
//
// Enumeration is NOT here. The corpus arrives as a list of paths, the same
// contract `check.ts` takes, so the walker's refusals stay provable on their own.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { matchGlob } from './lib/entries/glob-match.impure.ts';
import { readCorpusSources } from './lib/plan/corpus-source.impure.ts';
import { indexPlan } from './lib/plan/index-plan.pure.ts';
import type { IndexPlan } from './lib/plan/plan.types.ts';

// Re-exported by name, never starred: a caller cannot read a plan without the
// shape of one, and `tests/` reaches a Package only through its entry points.
export type { IndexPlan, PlannedIndex } from './lib/plan/plan.types.ts';

/**
 * Plan every index the config declares.
 *
 * An empty plan is a real answer: a config carrying no `indexes:` section
 * governs no directory, which is opt-in working rather than a fault. Whether an
 * `indexes:` section with an EMPTY `directories:` mapping is a config error is
 * settled the other way, in `validate-config.ts`, on the precedent that an
 * empty rule list is a config error rather than an inert harness.
 *
 * @param root The corpus directory exactly as the caller wrote it — never resolved.
 * @param files The corpus, as root-relative paths in walker order.
 * @param config A config that has already been validated.
 */
export function planIndexes(root: string, files: readonly string[], config: MarkdownHarnessConfig): IndexPlan {
  const indexes = config.indexes;
  if (indexes === undefined) return { indexes: [] };

  const sources = readCorpusSources(root, files);
  return indexPlan({ config: indexes, files, sources, matches: matchGlob });
}
