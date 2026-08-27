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
import type { Violation } from '../contract/violation.ts';
import { instances, type Instance } from './lib/address.ts';
import { CHECKS, CHECK_ORDER } from './lib/checks.ts';
import { crossField } from './lib/crossfield.ts';
import { isEmpty, observe } from './lib/presence.ts';
import { unknownKeys } from './lib/unknown.ts';

export function evaluate(rule: FrontmatterRule, frontmatter: Frontmatter): readonly Violation[] {
  // `frontmatter: forbidden` excludes every payload key, so this arm is the
  // whole of the rule and there is nothing else to evaluate.
  if (rule.frontmatter === 'forbidden') {
    if (frontmatter === null) return [];
    return [
      { constraint: 'frontmatter', field: null, found: observe(frontmatter), expected: { frontmatter: 'forbidden' } },
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
function atAddress(expected: FieldConstraints, instance: Instance): readonly Violation[] {
  const gate = presence(expected, instance);
  if (gate !== null) return [gate];

  return CHECK_ORDER.map((key) => CHECKS[key](expected, instance)).filter(
    (violation): violation is Violation => violation !== null,
  );
}

function presence(expected: FieldConstraints, instance: Instance): Violation | null {
  const found = observe(instance.value);

  if (expected.presence === 'required' && isEmpty(instance.value)) {
    return { constraint: 'presence', field: instance.at, found, expected };
  }
  if (expected.presence === 'forbidden' && found.kind !== 'absent') {
    return { constraint: 'presence', field: instance.at, found, expected };
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

function sortKey(violation: Violation): string {
  // A rule-level constraint names no field and concerns the whole file, so it
  // sorts before every field. `constraint` breaks a tie at one address.
  const field = violation.field === null ? '' : violation.field.replace(/\d+/g, (run) => run.padStart(8, '0'));
  return `${field} ${violation.constraint}`;
}
