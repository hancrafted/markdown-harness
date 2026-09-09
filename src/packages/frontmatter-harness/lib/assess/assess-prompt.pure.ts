/**
 * Which `assess:` block answers for one rule, and what it says.
 *
 * Whole-block replacement, never a per-key merge. A rule that wrote its own
 * block replaces the Module-wide one entirely; a rule that wrote none gets the
 * Module's whole. Three reasons, all recorded on the design ticket: §3's "the
 * first matching rule is the complete set" survives replacement and dies under
 * merge; per-key merging recreates the silent-provenance problem `--audit`
 * exists to solve; and deleting a rule's block is then one visible act rather
 * than a one-line diff that silently reactivates a global.
 *
 * With one condition shipping, replacement and merge are indistinguishable in
 * behaviour today. That is exactly why the decision was cheap to make now.
 */

import type { AssessConditions, FrontmatterRule } from '../../../config-contract/index.ts';
import type { PromptSource } from '../../../response-contract/index.ts';

/** The Operator's sentence, and which of the two blocks it came from. */
interface EffectivePrompt {
  /** The sentence, verbatim. */
  prompt: string;
  /** Which block answered, so a reader never has to diff the config. */
  source: PromptSource;
}

/**
 * Which block applies, and whose it is — the replacement decided on its own.
 *
 * Written the OWN key rather than its value: `assess: {}` is a rule declining
 * the Module-wide default, and a rule that never wrote the key is a rule taking
 * it. Those are different acts with the same absent sentence, and only the key
 * tells them apart.
 */
function blockFor(
  rule: FrontmatterRule,
  moduleAssess: AssessConditions | undefined,
): { block: AssessConditions | undefined; source: PromptSource } {
  if ('assess' in rule && rule.assess !== undefined) return { block: rule.assess, source: 'rule' };
  return { block: moduleAssess, source: 'module' };
}

/**
 * The `stale` prompt that applies to one rule, or nothing.
 *
 * Nothing is a legitimate answer twice over: an Operator may configure no
 * prompts at all, and a rule may write an empty block to decline the
 * Module-wide default without the default being deleted for everyone.
 *
 * @param rule The rule that won under first-match.
 * @param moduleAssess The Module-wide block written beside `rules:`, if any.
 */
export function effectivePrompt(
  rule: FrontmatterRule,
  moduleAssess: AssessConditions | undefined,
): EffectivePrompt | undefined {
  const { block, source } = blockFor(rule, moduleAssess);

  const prompt = block?.stale;
  if (prompt === undefined || prompt === '') return undefined;

  return { prompt, source };
}
