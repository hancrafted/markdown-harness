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
 * This is a table, not a seam. Nothing imports it from outside the package, and
 * the boundary rules make that mechanical rather than a convention.
 *
 * Every check receives the WHOLE `FieldConstraints` and picks its own operand.
 * The alternative — a mapped type handing each check its own operand — cannot be
 * indexed without a cast, because TypeScript will not correlate a key variable
 * with a value type. A three-line guard per row beats a cast at the call site
 * that suppresses every future mistake as well as this one.
 */

import type { AllowedValue, FieldConstraints } from '../../contract/constraints.ts';
import type { AllowedOption } from '../../contract/values.ts';
import type { Violation } from '../../contract/violation.ts';
import type { Instance } from './address.ts';
import { observe } from './presence.ts';

/**
 * A check, keyed by the constraint key the Operator typed.
 *
 * `intent` is the already-resolved effective intent: a constraint-level
 * `intent` wins over the rule's, and that resolution is a semantic of the
 * config language rather than a display choice, so it happens before this point
 * and not in the renderer.
 */
type Check = (constraints: FieldConstraints, instance: Instance, intent: string) => Violation | null;

/**
 * The keys that assert something about a VALUE, so they sit behind the presence
 * gate. `presence` itself is the gate, and `intent` is prose rather than a
 * check.
 */
export type ValueConstraintKey = 'allowed' | 'pattern';

/** `allowed` records are always records, never bare strings — so a partial map can never be the display source. */
function options(allowed: readonly AllowedValue[]): readonly AllowedOption[] {
  return allowed.map((entry) => ({ value: entry.value, intent: entry.intent ?? null }));
}

export const CHECKS: Record<ValueConstraintKey, Check> = {
  /**
   * A closed set. The violation carries the WHOLE set, uncapped and in config
   * order, with each value's meaning — which is what makes the failure fixable
   * without opening the config.
   */
  allowed: (constraints, instance, intent) => {
    if (constraints.allowed === undefined) return null;
    const found = observe(instance.value);
    if (found.kind !== 'scalar') return null;
    if (constraints.allowed.some((entry) => entry.value === found.value)) return null;
    return { constraint: 'allowed', at: instance.at, operand: options(constraints.allowed), found, intent };
  },

  /**
   * The one expressiveness valve, and THE ONE CHECK WHOSE VIOLATION CARRIES NO
   * OPERAND. The regex has nowhere to leak from: the mandatory sibling `intent`
   * is what the violation reports. This is the failure Kubernetes accepts
   * (`"failed rule: {Rule}"`) and VS Code bolted `patternErrorMessage` on to
   * avoid.
   */
  pattern: (constraints, instance, intent) => {
    if (constraints.pattern === undefined) return null;
    const found = observe(instance.value);
    if (found.kind !== 'scalar') return null;
    if (new RegExp(constraints.pattern).test(String(found.value))) return null;
    return { constraint: 'pattern', at: instance.at, found, intent };
  },
};

/**
 * The order checks run in, so a file's violations are deterministic.
 *
 * Ordering ACROSS addresses is the report's job, not this table's — a report
 * that depended on YAML mapping order would contradict design-ADR 0001.
 */
export const CHECK_ORDER: readonly ValueConstraintKey[] = ['allowed', 'pattern'];
