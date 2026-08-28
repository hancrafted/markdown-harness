/**
 * `query` — what the config asks of one path.
 *
 * Takes config TEXT, not a parsed config, for the reason `check` does: parsing
 * and validation produce report content, so both live inside this seam.
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

import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { SteeringAnswer } from '../contract/steering-answer.ts';
import { requirements } from '../frontmatter-harness/requirements.ts';
import { emptyRuleList, readRules } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { resolve, ruleRef } from './lib/corpus/select.ts';

export function query(configText: string, path: string): SteeringAnswer | ConfigRejected {
  const rules = readRules(configText);
  // Before resolution, because `governedBy: null` means INVISIBLE — a broken
  // config must not be able to say that about every path.
  if (rules.length === 0) return emptyRuleList();

  const repoPath = normalize(path);
  const { winner } = resolve(rules, repoPath);

  return {
    report: 'steering',
    format: 1,
    path: repoPath,
    // `null` means invisible, not unconstrained. WHY it is null — a rule above
    // won, or a rule's own `excludeFiles` fired — is the Operator's question,
    // and the check report's `coverage` is where it is answered.
    governedBy: winner === null ? null : { rule: ruleRef(winner), requires: requirements(winner) },
  };
}
