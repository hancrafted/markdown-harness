/**
 * THE MODULE: one section of the config, one family of checks.
 *
 * Given a rule payload and a parsed frontmatter mapping, produces violations.
 * Knows nothing about files, globs, YAML or reporting — dependency-cruiser's
 * `module-may-not-depend-on-core` rule is what holds that, and it is what makes
 * `CONTEXT.md`'s claim that the Core is "the parts that know nothing about
 * markdown frontmatter" true of the code rather than only of the prose.
 *
 * Note what is NOT here any more: intent resolution. A violation reports the
 * field's constraints VERBATIM, and a field's own `intent` is one of those
 * constraints, so an override travels with the fragment. The rule's `intent` is
 * the fallback and lives once, on the rule reference. Nothing resolves, nothing
 * is copied, and the two can no longer disagree.
 */

import type { FrontmatterRule } from '../contract/config.ts';
import type { FieldConstraints } from '../contract/constraints.ts';
import type { Frontmatter } from '../contract/frontmatter.ts';
import { FIELD_VIOLATION, RULE_VIOLATION } from '../contract/violation-code.ts';
import type { Violation } from '../contract/violation.ts';
import { instances, type Instance } from './lib/address.ts';
import { CHECKS, CHECK_ORDER } from './lib/checks.ts';
import { crossField } from './lib/crossfield.ts';
import { evidence, isEmpty, summarise } from './lib/presence.ts';
import { shapeGate } from './lib/shape.ts';
import { unknownKeys } from './lib/unknown.ts';

export function evaluate(rule: FrontmatterRule, frontmatter: Frontmatter): readonly Violation[] {
  // `frontmatter: forbidden` excludes every payload key, so this arm is the
  // whole of the rule and there is nothing else to evaluate.
  if (rule.frontmatter === 'forbidden') {
    if (frontmatter === null) return [];
    return [
      {
        field: null,
        value: summarise(frontmatter),
        violation: RULE_VIOLATION.FRONTMATTER_FORBIDDEN,
        requirement: { frontmatter: 'forbidden' },
      },
    ];
  }

  const fields = Object.entries(rule.fields ?? {}).flatMap(([address, constraints]) =>
    instances(frontmatter, address).flatMap((instance) => atAddress(constraints, instance)),
  );
  return ordered([...fields, ...crossField(rule, frontmatter), ...unknownKeys(rule, frontmatter)]);
}

/**
 * Every constraint this rule states about one instance.
 *
 * The presence gate comes first and, when it fails, is the ONLY thing reported
 * at this address: one missing `description` otherwise reports `presence`,
 * `maxLength` and `format` at once, and the Contributor reads three faults about
 * one hole. `expected` carries all three regardless, so nothing is hidden — it
 * is the COUNT of violations that stays honest.
 */
function atAddress(requirement: FieldConstraints, instance: Instance): readonly Violation[] {
  const gate = presence(requirement, instance);
  if (gate !== null) return [gate];

  // An address that named nothing holds no value for a value constraint to read,
  // and `presence` is the ONLY key that may make a field mandatory. Without this
  // line `minItems: 1` on an absent list would fire, which quietly turns every
  // size constraint into `required` and contradicts governance being opt-in.
  const { value } = instance;
  if (value === undefined) return [];

  // The second gate. A constraint that does not name this value's shape is the
  // Operator's misapplication, reported once for the address rather than once
  // per collided constraint — see `lib/shape.ts`.
  const shape = shapeGate(requirement, instance);
  if (shape !== null) return [shape];

  return CHECK_ORDER.flatMap((key) => CHECKS[key](requirement, value, instance));
}

/**
 * The gate, and the one clause that fails three ways.
 *
 * Each way wants a different repair — write the field, fill the field, delete
 * the field — so each gets its own code. They were one code until this change,
 * which left the direction to be inferred by comparing `requirement` against
 * `value`; see `violation-code.ts` for the measurement that ended that.
 */
function presence(requirement: FieldConstraints, instance: Instance): Violation | null {
  const { value } = instance;

  if (requirement.presence === 'required' && isEmpty(value)) {
    return {
      field: instance.at,
      ...evidence(value),
      violation: value === undefined ? FIELD_VIOLATION.MISSING_REQUIRED_FIELD : FIELD_VIOLATION.EMPTY_REQUIRED_FIELD,
      requirement,
    };
  }
  if (requirement.presence === 'forbidden' && value !== undefined) {
    return {
      field: instance.at,
      ...evidence(value),
      violation: FIELD_VIOLATION.FORBIDDEN_FIELD_PRESENT,
      requirement,
    };
  }
  return null;
}

/**
 * Deterministic order, by address.
 *
 * NOT by config order and NOT by frontmatter order: design-ADR 0001 records
 * that the config language constrains neither, quoting YAML 1.2.2 that mapping
 * key order is "a serialization detail" that "should not be used". A report
 * ordered by either would depend on exactly what the specification says not to
 * depend on. Sorted by address, the same corpus produces the same report
 * whatever order its keys were written in — and a frozen report survives a YAML
 * library that does not preserve order.
 *
 * Digit runs are zero-padded for the comparison, so `sources[2]` sorts before
 * `sources[10]`.
 */
function ordered(violations: readonly Violation[]): readonly Violation[] {
  return [...violations].sort((left, right) => sortKey(left).localeCompare(sortKey(right)));
}

function sortKey(entry: Violation): string {
  // A rule-level constraint names no field and concerns the whole file, so it
  // sorts before every field. The code breaks a tie at one address.
  const field = entry.field === null ? '' : entry.field.replace(/\d+/g, (run) => run.padStart(8, '0'));
  return `${field} ${entry.violation}`;
}
