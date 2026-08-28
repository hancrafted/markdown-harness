/**
 * The SECOND gate: a shape-specific constraint met a shape it does not name.
 *
 * `constraints.ts` states the vocabulary's central promise — "`minLength` names
 * strings, `minItems` names lists" — and cites the trap it exists to avoid:
 * Laravel's shape-agnostic `min:18` silently meaning "18 digits". Before this
 * gate, a wrong-shaped value was answered with `return null` by each value
 * check, which is the silence the promise was supposed to buy protection from.
 *
 * Reported ONCE PER ADDRESS rather than once per constraint, and that is not a
 * tidiness choice. A violation reports the whole fragment verbatim as
 * `requirement`, so `tags: "one, two"` under
 * `{ minItems: 1, maxItems: 5, itemMaxLength: 20 }` would emit three violations
 * carrying identical codes, identical addresses and identical requirements —
 * three rows saying one thing. The collision is a property of the address, so it
 * belongs at the address.
 *
 * `null` collides with nothing. A key written empty is the empty value of
 * whichever shape the constraint names — the empty string for `maxLength`, the
 * empty list for `minItems` — so it fails those constraints ordinarily. That
 * assignment of blame is the point: an empty `description:` is the Contributor's
 * mistake, and `CONSTRAINT_SHAPE_MISMATCH` accuses the Operator's config.
 */

import type { FieldConstraints } from '../../contract/constraints.ts';
import type { FrontmatterValue } from '../../contract/frontmatter.ts';
import { FIELD_VIOLATION } from '../../contract/violation-code.ts';
import type { Violation } from '../../contract/violation.ts';
import type { Instance } from './address.ts';
import { evidence } from './presence.ts';

/** Constraint keys that name a string, a number or a boolean. */
const NAMES_TEXT = ['allowed', 'format', 'pattern', 'minLength', 'maxLength'] as const;

/** Constraint keys that name a list. */
const NAMES_LIST = ['minItems', 'maxItems', 'itemMaxLength'] as const;

function statesAny(requirement: FieldConstraints, keys: readonly (keyof FieldConstraints)[]): boolean {
  return keys.some((key) => requirement[key] !== undefined);
}

/**
 * Which constraint keys this value's shape refuses.
 *
 * A mapping refuses every value constraint: the language has no key that names
 * one, so any constraint at all on a mapping-valued field is a misapplication.
 */
function refused(value: FrontmatterValue): readonly (keyof FieldConstraints)[] {
  if (Array.isArray(value)) return NAMES_TEXT;
  if (typeof value === 'object') return [...NAMES_TEXT, ...NAMES_LIST];
  return NAMES_LIST;
}

export function shapeGate(requirement: FieldConstraints, instance: Instance): Violation | null {
  const { value } = instance;
  if (value === undefined || value === null) return null;
  if (!statesAny(requirement, refused(value))) return null;

  return {
    field: instance.at,
    ...evidence(value),
    violation: FIELD_VIOLATION.CONSTRAINT_SHAPE_MISMATCH,
    requirement,
  };
}
