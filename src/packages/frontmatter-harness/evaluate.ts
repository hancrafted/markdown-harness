/**
 * THE MODULE: one section of the config, one family of checks.
 *
 * Given a rule payload and a parsed frontmatter mapping, produces violations.
 * Knows nothing about files, globs, YAML or reporting — dependency-cruiser's
 * `module-may-not-depend-on-core` rule is what holds that, and it is what makes
 * `CONTEXT.md`'s claim that the Core is "the parts that know nothing about
 * markdown frontmatter" true of the code rather than only of the prose.
 */

import type { FrontmatterRule } from '../contract/config.ts';
import type { FieldConstraints } from '../contract/constraints.ts';
import type { Frontmatter } from '../contract/frontmatter.ts';
import type { Violation } from '../contract/violation.ts';
import { instances, type Instance } from './lib/address.ts';
import { isEmpty, observe } from './lib/presence.ts';

export function evaluate(rule: FrontmatterRule, frontmatter: Frontmatter): readonly Violation[] {
  // `frontmatter: forbidden` excludes every payload key, so this arm is the
  // whole of the rule and there is nothing else to evaluate.
  if (rule.frontmatter === 'forbidden') {
    if (frontmatter === null) return [];
    return [{ constraint: 'frontmatter', at: null, found: observe(frontmatter), intent: rule.intent }];
  }

  return Object.entries(rule.fields ?? {}).flatMap(([address, constraints]) =>
    instances(frontmatter, address).flatMap((instance) => atAddress(constraints, instance, rule.intent)),
  );
}

/**
 * Every constraint this rule states about one instance.
 *
 * The presence gate comes first and, when it fails, is the ONLY thing reported
 * at this address: one missing `description` otherwise reports `presence`,
 * `maxLength` and `format` at once, and the Contributor reads three sentences
 * about one hole.
 */
function atAddress(constraints: FieldConstraints, instance: Instance, ruleIntent: string): readonly Violation[] {
  const gate = presence(constraints, instance, ruleIntent);
  if (gate !== null) return [gate];
  return [];
}

function presence(constraints: FieldConstraints, instance: Instance, ruleIntent: string): Violation | null {
  const found = observe(instance.value);
  // A constraint-level `intent` wins over the rule's, for this constraint only.
  const intent = constraints.intent ?? ruleIntent;

  if (constraints.presence === 'required' && isEmpty(instance.value)) {
    return { constraint: 'presence', at: instance.at, operand: 'required', found, intent };
  }
  if (constraints.presence === 'forbidden' && found.kind !== 'absent') {
    return { constraint: 'presence', at: instance.at, operand: 'forbidden', found, intent };
  }
  return null;
}
