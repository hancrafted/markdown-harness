/**
 * THE MODULE, asked the other question: not "what is wrong with this file" but
 * "what would this rule ask of one".
 *
 * The same rule payload feeds both, which is why they are two entry points on
 * one Module rather than two Modules. `evaluate` reads a payload against a
 * frontmatter mapping; this reads the payload alone. Neither knows about files,
 * globs or YAML.
 *
 * There is almost nothing here, and that is the design working. The payload is
 * already the answer — the Operator wrote it — so this hands it back rather than
 * describing it. The only reshaping is the one the project already decided it
 * owed: a deterministic order, because mapping key order is a serialization
 * detail the config language does not constrain.
 */

import type { FrontmatterRule } from '../contract/config.ts';
import type { FieldRequirement, Requirement } from '../contract/steering-answer.ts';

/** What one rule asks of any path it governs. */
export function requirements(rule: FrontmatterRule): Requirement {
  // `frontmatter: forbidden` excludes every payload key, so this arm is the
  // whole of the rule and there is nothing else to hand back.
  if (rule.frontmatter === 'forbidden') return { frontmatter: 'forbidden' };

  return {
    fields: fields(rule),
    // Spread rather than assigned, so a key the Operator did not write is
    // ABSENT rather than `undefined`. The distinction survives JSON, and it is
    // the whole of "verbatim" for optional keys.
    ...(rule.unknownKeys === undefined ? {} : { unknownKeys: rule.unknownKeys }),
    ...(rule.exactlyOneOf === undefined ? {} : { exactlyOneOf: rule.exactlyOneOf }),
    ...(rule.anyOf === undefined ? {} : { anyOf: rule.anyOf }),
    ...(rule.allOf === undefined ? {} : { allOf: rule.allOf }),
  };
}

/**
 * Addresses in sorted order, each carrying its constraints untouched.
 *
 * Config addresses never carry a list index — `sources[].resource`, never
 * `sources[1].resource` — so a plain comparison is enough here, where
 * `evaluate` has to zero-pad digit runs for the instance addresses it produces.
 */
function fields(rule: FrontmatterRule): readonly FieldRequirement[] {
  return Object.entries(rule.fields ?? {})
    .map(([field, constraints]) => ({ field, constraints }))
    .sort((left, right) => left.field.localeCompare(right.field));
}
