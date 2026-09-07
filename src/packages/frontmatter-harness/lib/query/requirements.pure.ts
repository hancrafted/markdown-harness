/**
 * Project a winning rule into the answer `--query` returns.
 *
 * The requirements re-expose the config's own vocabulary verbatim, down to
 * which keys the Operator did and did not write. Nothing here composes a
 * sentence: an absent `unknownKeys` stays absent, because `allowed` is the
 * language's word and an answer that writes it has put a word in the
 * Operator's mouth.
 */

import type { FieldConstraints, FrontmatterRule } from '../../../config-contract/index.ts';
import type { ConstrainingRequirements, FieldRequirement, Requirements } from '../../../response-contract/index.ts';

/** The three set constraints, in the order the response declares them. */
const CROSS_FIELD_KEYS = ['exactlyOneOf', 'anyOf', 'allOf'] as const;

/**
 * Code-unit order, not locale order.
 *
 * `localeCompare` reads a host setting no argument supplies, so it is
 * inadmissible here and would in any case make one config answer differently on
 * two machines.
 */
function byAddress(left: FieldRequirement, right: FieldRequirement): number {
  if (left.field < right.field) return -1;
  return left.field > right.field ? 1 : 0;
}

/** One entry per address the rule names, sorted, constraints spread flat beside `field`. */
function fieldsOf(fields: Record<string, FieldConstraints> | undefined): readonly FieldRequirement[] {
  return Object.entries(fields ?? {})
    .map(([field, constraints]) => ({ field, ...constraints }))
    .sort(byAddress);
}

/** The set constraints the Operator actually wrote, or nothing. */
function crossFieldOf(rule: FrontmatterRule): Pick<ConstrainingRequirements, 'crossField'> {
  const written = CROSS_FIELD_KEYS.filter((key) => rule[key] !== undefined);
  if (written.length === 0) return {};
  return { crossField: Object.fromEntries(written.map((key) => [key, rule[key]])) };
}

/**
 * Everything the winning rule asks of the queried path.
 *
 * @param rule The rule that won under first-match.
 */
export function requirementsForRule(rule: FrontmatterRule): Requirements {
  if (rule.frontmatter === 'forbidden') return { frontmatter: 'forbidden' };

  return {
    fields: fieldsOf(rule.fields),
    ...(rule.unknownKeys === undefined ? {} : { unknownKeys: rule.unknownKeys }),
    ...crossFieldOf(rule),
  };
}
