/**
 * The constraint checks, AS A TABLE — not a switch.
 *
 * Two reasons, and only one of them is the linter. ESLint caps `complexity` at
 * 7, so a nine-arm `switch` over constraint keys is illegal here; a
 * `Record<key, fn>` lookup has complexity 1. The better reason is that a table
 * is exhaustively checkable against the union, so adding a constraint is one row
 * plus one small function — never a change to a dispatcher, and never a change
 * to an entry point.
 *
 * Every check receives the WHOLE `FieldConstraints` and picks its own operand.
 * That was originally a way to avoid a cast; it is now also the shape of the
 * output, because a violation reports the whole fragment verbatim as `expected`.
 * There is no per-constraint evidence to assemble any more — the operand a check
 * read and the operand it reports are the same object.
 *
 * This is a table, not a seam. Nothing imports it from outside the package, and
 * the boundary rules make that mechanical rather than a convention.
 */

import type { FieldConstraints } from '../../contract/constraints.ts';
import type { Violation } from '../../contract/violation.ts';
import type { Instance } from './address.ts';
import { conformsTo } from './formats.ts';
import { observe } from './presence.ts';

/** A check, keyed by the constraint key the Operator typed. */
type Check = (constraints: FieldConstraints, instance: Instance) => Violation | null;

/**
 * The keys that assert something about a VALUE, so they sit behind the presence
 * gate. `presence` itself is the gate, and `intent` is the Operator's prose
 * rather than a check.
 */
export type ValueConstraintKey = 'allowed' | 'format' | 'pattern';

export const CHECKS: Record<ValueConstraintKey, Check> = {
  /**
   * A closed set. `expected` carries the whole fragment, so the vocabulary and
   * each value's meaning arrive with the failure and the stanza is fixable
   * without opening the config.
   */
  allowed: (expected, instance) => {
    if (expected.allowed === undefined) return null;
    const found = observe(instance.value);
    if (found.kind !== 'scalar') return null;
    if (expected.allowed.some((entry) => entry.value === found.value)) return null;
    return { constraint: 'allowed', field: instance.at, found, expected };
  },

  /**
   * One of the named shapes. Checks FORM and only form — `datetime` never asks
   * whether a date has passed, because there is no clock behind this seam.
   */
  format: (expected, instance) => {
    if (expected.format === undefined) return null;
    const found = observe(instance.value);
    if (found.kind !== 'scalar') return null;
    if (conformsTo(expected.format, String(found.value))) return null;
    return { constraint: 'format', field: instance.at, found, expected };
  },

  /**
   * The one expressiveness valve.
   *
   * The regex now travels in `expected`, because `expected` is the fragment
   * verbatim. What keeps the Kubernetes failure at bay is no longer that the
   * data cannot hold a pattern — it is that the config language makes a sibling
   * `intent` MANDATORY beside `pattern`, so the fragment always arrives carrying
   * its own explanation.
   */
  pattern: (expected, instance) => {
    if (expected.pattern === undefined) return null;
    const found = observe(instance.value);
    if (found.kind !== 'scalar') return null;
    if (new RegExp(expected.pattern).test(String(found.value))) return null;
    return { constraint: 'pattern', field: instance.at, found, expected };
  },
};

/**
 * The order checks run in, so a file's violations are deterministic.
 *
 * Ordering ACROSS addresses is the report's job, not this table's — a report
 * that depended on YAML mapping order would contradict design-ADR 0001.
 */
export const CHECK_ORDER: readonly ValueConstraintKey[] = ['allowed', 'format', 'pattern'];
