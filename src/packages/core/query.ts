/**
 * `query` — what the config asks of one path.
 *
 * Takes config TEXT, not a parsed config, for the reason `check` does: parsing
 * and validation produce result content, so both live inside this seam.
 *
 * IT NEVER TOUCHES THE CORPUS. The entire input is a path string and the
 * config, which is `git check-attr` semantics — a path that does not exist and
 * one that does are answered identically. Resolution is path-only, so nothing
 * here could read a file even if it wanted to, and an agent can ask what will be
 * required of a file before writing a byte of it.
 *
 * There is deliberately no rendered `steering:` string in what comes back. The
 * answer is the structured payload and nothing else, so what steers an agent is
 * the config's own vocabulary — which is the thing being measured.
 */

import type { ConfigErrorResult } from '../contract/config-error.ts';
import type { QueryResult } from '../contract/query-result.ts';
import { requirements } from '../frontmatter-harness/requirements.ts';
import { configFaults, readRules, rejected } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { resolve } from './lib/corpus/select.ts';

export function query(configText: string, path: string): QueryResult | ConfigErrorResult {
  const rules = readRules(configText);
  // Before resolution, because `governance: 'invisible'` is a claim about every
  // rule in the config — a broken config must not be able to make it.
  const faults = configFaults(rules);
  if (faults.length > 0) return rejected(faults);

  const repoPath = normalize(path);
  const { winner } = resolve(rules, repoPath);

  // Invisible is not unconstrained. WHY nothing governs this path — a rule above
  // won, or a rule's own `excludeFiles` fired — is the Operator's question, and
  // `--coverage` is where it is answered.
  if (winner === null) return { governance: 'invisible', path: repoPath };

  return {
    governance: 'governed',
    path: repoPath,
    rule: { ruleId: winner.ruleId, intent: winner.intent },
    requirements: requirements(winner),
  };
}
