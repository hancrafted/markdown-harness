/**
 * `unknownKeys: forbidden` — the only rule-level key that reports per key.
 *
 * TOP-LEVEL ONLY. "Known" is the set of top-level SEGMENTS of the rule's
 * addresses, so a rule constraining `generated.by` makes the whole `generated`
 * mapping known and says nothing about what else is inside it. Reaching deeper
 * would mean a rule that named one nested key implicitly forbade its siblings,
 * which is a much stronger claim than the Operator made.
 *
 * The default is `allowed`, and it stays a per-rule choice rather than a global
 * one: a permissive default is the only one that lets a rule govern one key of a
 * document without inheriting every other key's fate.
 */

import type { FrontmatterRule } from '../../contract/config.ts';
import type { Frontmatter } from '../../contract/frontmatter.ts';
import type { Violation } from '../../contract/violation.ts';
import { head } from './address.ts';
import { observe } from './presence.ts';

/** The top-level names this rule names, deduped, in the order the config wrote them. */
function known(rule: FrontmatterRule): readonly string[] {
  return [...new Set(Object.keys(rule.fields ?? {}).map(head))];
}

export function unknownKeys(rule: FrontmatterRule, frontmatter: Frontmatter): readonly Violation[] {
  if (rule.unknownKeys !== 'forbidden' || frontmatter === null) return [];
  const named = known(rule);

  return Object.keys(frontmatter)
    .filter((key) => !named.includes(key))
    .map((key) => ({
      constraint: 'unknownKeys' as const,
      at: key,
      known: named,
      found: observe(frontmatter[key]),
      intent: rule.intent,
    }));
}
