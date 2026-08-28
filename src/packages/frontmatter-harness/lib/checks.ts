/**
 * The value constraints, AS A TABLE — not a switch.
 *
 * Two reasons, and only one of them is the linter. ESLint caps `complexity` at
 * 7, so a switch over eight constraint keys is illegal here; a
 * `Record<key, fn>` lookup has complexity 1. The better reason is that a table
 * is exhaustively checkable against the union, so adding a constraint is one row
 * plus one small function — never a change to a dispatcher, and never a change
 * to an entry point.
 *
 * Every check receives the WHOLE `FieldConstraints` and picks its own operand.
 * That was originally a way to avoid a cast; it is now also the shape of the
 * output, because a violation reports the whole fragment verbatim as
 * `requirement`. There is no per-constraint evidence to assemble — the operand a
 * check read and the operand it reports are the same object.
 *
 * A check returns a LIST rather than one violation or null, because
 * `itemMaxLength` reports once per offending entry of a list and addresses each
 * by index.
 *
 * This is a table, not a seam. Nothing imports it from outside the package, and
 * the boundary rules make that mechanical rather than a convention.
 */

import type { FieldConstraints } from '../../contract/constraints.ts';
import type { FrontmatterValue } from '../../contract/frontmatter.ts';
import { FIELD_VIOLATION, type FieldViolationCode } from '../../contract/violation-code.ts';
import type { FieldViolation, Violation } from '../../contract/violation.ts';
import type { Instance } from './address.ts';
import { conformsTo } from './formats.ts';
import { evidence } from './presence.ts';

/** A check, keyed by the constraint key the Operator typed. */
type Check = (requirement: FieldConstraints, value: FrontmatterValue, instance: Instance) => readonly Violation[];

/**
 * The keys that assert something about a VALUE, so they sit behind the presence
 * gate. `presence` itself is the gate, and `intent` is the Operator's prose
 * rather than a check.
 */
export type ValueConstraintKey =
  'allowed' | 'format' | 'pattern' | 'minLength' | 'maxLength' | 'minItems' | 'maxItems' | 'itemMaxLength';

function fault(instance: Instance, violation: FieldViolationCode, requirement: FieldConstraints): FieldViolation {
  return { field: instance.at, ...evidence(instance.value), violation, requirement };
}

/**
 * The value as TEXT.
 *
 * A key written empty reads as the empty string, so it fails `format` or
 * `maxLength` ordinarily. `shapeGate` has already refused a container, so the
 * `null` return is unreachable for a value that got this far and exists only to
 * keep this function total.
 */
function asText(value: FrontmatterValue): string {
  if (value === null) return '';
  if (typeof value === 'object') return '';
  return String(value);
}

/** The value as a LIST. A key written empty reads as the empty list. */
function asList(value: FrontmatterValue): readonly FrontmatterValue[] {
  if (Array.isArray(value)) return value;
  return [];
}

export const CHECKS: Record<ValueConstraintKey, Check> = {
  /**
   * A closed set. `requirement` carries the whole fragment, so the vocabulary
   * and each value's meaning arrive with the failure and the stanza is fixable
   * without opening the config.
   */
  allowed: (requirement, value, instance) => {
    if (requirement.allowed === undefined) return [];
    if (requirement.allowed.some((entry) => entry.value === value)) return [];
    return [fault(instance, FIELD_VIOLATION.VALUE_NOT_ALLOWED, requirement)];
  },

  /**
   * One of the named shapes. Checks FORM and only form — `datetime` never asks
   * whether a date has passed, because there is no clock behind this seam.
   */
  format: (requirement, value, instance) => {
    if (requirement.format === undefined) return [];
    if (conformsTo(requirement.format, asText(value))) return [];
    return [fault(instance, FIELD_VIOLATION.FORMAT_MISMATCH, requirement)];
  },

  /**
   * The one expressiveness valve.
   *
   * The regex travels in `requirement`, because `requirement` is the fragment
   * verbatim. What keeps the Kubernetes failure at bay is no longer that the
   * data cannot hold a pattern — it is that the config language makes a sibling
   * `intent` MANDATORY beside `pattern`, so the fragment always arrives carrying
   * its own explanation.
   */
  pattern: (requirement, value, instance) => {
    if (requirement.pattern === undefined) return [];
    if (new RegExp(requirement.pattern).test(asText(value))) return [];
    return [fault(instance, FIELD_VIOLATION.PATTERN_MISMATCH, requirement)];
  },

  minLength: (requirement, value, instance) => {
    if (requirement.minLength === undefined) return [];
    if (asText(value).length >= requirement.minLength) return [];
    return [fault(instance, FIELD_VIOLATION.VALUE_TOO_SHORT, requirement)];
  },

  maxLength: (requirement, value, instance) => {
    if (requirement.maxLength === undefined) return [];
    if (asText(value).length <= requirement.maxLength) return [];
    return [fault(instance, FIELD_VIOLATION.VALUE_TOO_LONG, requirement)];
  },

  minItems: (requirement, value, instance) => {
    if (requirement.minItems === undefined) return [];
    if (asList(value).length >= requirement.minItems) return [];
    return [fault(instance, FIELD_VIOLATION.TOO_FEW_ITEMS, requirement)];
  },

  maxItems: (requirement, value, instance) => {
    if (requirement.maxItems === undefined) return [];
    if (asList(value).length <= requirement.maxItems) return [];
    return [fault(instance, FIELD_VIOLATION.TOO_MANY_ITEMS, requirement)];
  },

  /**
   * The only constraint that reports PER ENTRY, so it is the only one whose
   * violations carry an address the config never wrote: `tags[2]`, not `tags`.
   *
   * The same reasoning as `sources[].resource` — a report that named the list
   * would not tell anyone which entry to shorten. An entry that is not text at
   * all is one collision, reported at the entry's own address, so a mixed list
   * still says exactly which entry the Operator's constraint cannot apply to.
   */
  itemMaxLength: (requirement, value, instance) => {
    const limit = requirement.itemMaxLength;
    if (limit === undefined) return [];

    return asList(value).flatMap((entry, index) => {
      const at = { at: `${instance.at}[${index}]`, value: entry };
      // A PER-ENTRY collision, unlike the address-level one `shapeGate` owns: a
      // list of strings with one mapping in it is the Operator's constraint
      // meeting one entry it cannot apply to, and the entry's own address is
      // what says which.
      if (typeof entry === 'object' && entry !== null) {
        return [fault(at, FIELD_VIOLATION.CONSTRAINT_SHAPE_MISMATCH, requirement)];
      }
      if (asText(entry).length <= limit) return [];
      return [fault(at, FIELD_VIOLATION.ITEM_TOO_LONG, requirement)];
    });
  },
};

/**
 * The order checks run in, so a file's violations are deterministic.
 *
 * Ordering ACROSS addresses is the report's job, not this table's — a report
 * that depended on YAML mapping order would contradict design-ADR 0001.
 */
export const CHECK_ORDER: readonly ValueConstraintKey[] = [
  'allowed',
  'format',
  'pattern',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'itemMaxLength',
];
