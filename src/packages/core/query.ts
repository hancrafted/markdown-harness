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
 * There is deliberately no rendered `steering:` string in what comes back. See
 * `contract/steering-answer.ts` for why that absence is the point rather than an
 * omission.
 */

import type { ConfigRejected } from '../contract/config-rejected.ts';
import type { SteeringAnswer } from '../contract/steering-answer.ts';
import { requirements } from '../frontmatter-harness/requirements.ts';
import { emptyRuleList, readRules } from './lib/config/parse.ts';
import { normalize } from './lib/corpus/normalize.ts';
import { exclusions, resolve, ruleRef, type RuleOutcome } from './lib/corpus/select.ts';

export function query(configText: string, path: string): SteeringAnswer | ConfigRejected {
  const rules = readRules(configText);
  // Before resolution, because `governs: null` means INVISIBLE — a broken
  // config must not be able to say that about every path.
  if (rules.length === 0) return emptyRuleList();

  const repoPath = normalize(path);
  const { winner, outcomes } = resolve(rules, repoPath);
  const fared = (outcome: RuleOutcome) => rules.filter((_, index) => outcomes[index] === outcome);

  return {
    report: 'steering',
    format: 1,
    path: repoPath,
    // `null` means invisible, not unconstrained — and `excluded` below is
    // usually the reason.
    governs: winner === null ? null : { rule: ruleRef(winner), requires: requirements(winner) },
    shadowed: fared('shadowed').map(ruleRef),
    excluded: fared('excluded').map((rule) => ({ rule: ruleRef(rule), excludedBy: exclusions(rule, repoPath) })),
  };
}
