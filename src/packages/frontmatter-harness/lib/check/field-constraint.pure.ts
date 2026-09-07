/**
 * Everything one field's constraints have to say about one file.
 *
 * Ordered presence, then shape, then `allowed` (§4.6). The three tiers answer
 * different questions and only the first can make the rest meaningless: an
 * absent field has no shape to collide with and no membership to test, which is
 * why `presence` is the only key that may make a field mandatory. A `minItems`
 * that fired on absence would quietly turn every size constraint into
 * `required`.
 *
 * The tiers are split one function per shape rather than one function per
 * field, because each shape's constraints are a closed group in §3.3's table
 * and the table's order is the reporting order.
 */

import type { FieldConstraints } from '../../../config-contract/index.ts';
import type { FieldViolation, FieldViolationCode } from '../../../response-contract/index.ts';
import type { AddressSite, FrontmatterMapping } from './check.types.ts';
import { resolveAddress } from './field-address.pure.ts';
import { evidenceFor, isEmptyValue } from './field-evidence.pure.ts';
import { matchesFormat } from './value-format.pure.ts';

/** Constraints that name STRINGS, in §3.3's own table order. */
const STRING_KEYS = ['minLength', 'maxLength', 'format', 'pattern'] as const;

/** Constraints that name LISTS, in §3.3's own table order. */
const LIST_KEYS = ['minItems', 'maxItems', 'itemMaxLength'] as const;

/**
 * A reporter bound to one constraint object.
 *
 * Bound rather than passed, so every violation from this address carries the
 * same fragment verbatim and no call site can quietly report a different one.
 *
 * The evidence arrives WRAPPED, so that "no evidence" and "evidence that
 * happens to be undefined" stay distinguishable: the `value` key's OMISSION is
 * what carries absence, and `null` has to keep its literal meaning.
 */
function reportFor(requirement: FieldConstraints) {
  return function report(field: string, code: FieldViolationCode, value?: { of: unknown }): FieldViolation {
    if (value === undefined) return { field, violation: code, requirement };
    return { field, value: evidenceFor(value.of), violation: code, requirement };
  };
}

/** Whether the constraint object asks anything that names a given shape. */
function asks(constraints: FieldConstraints, keys: readonly (keyof FieldConstraints)[]): boolean {
  return keys.some((key) => constraints[key] !== undefined);
}

/**
 * Whether the value's shape can answer the constraints at all.
 *
 * One finding per address rather than one per collided constraint: a violation
 * carries the whole config fragment verbatim, so three list constraints over a
 * string would print the same fragment three times and ask for one repair.
 */
function collides(constraints: FieldConstraints, value: unknown): boolean {
  if (typeof value === 'string') return asks(constraints, LIST_KEYS);
  if (Array.isArray(value)) return asks(constraints, STRING_KEYS);
  return asks(constraints, STRING_KEYS) || asks(constraints, LIST_KEYS);
}

/**
 * The two string-length bounds.
 *
 * Separate codes rather than one range violation, because the repairs are
 * opposite and an agent should not have to compare the value against the bound
 * to work out which way to move.
 */
function lengthViolations(field: string, constraints: FieldConstraints, value: string): FieldViolation[] {
  const report = reportFor(constraints);
  const { minLength, maxLength } = constraints;
  const failures: FieldViolation[] = [];

  if (minLength !== undefined && value.length < minLength) {
    failures.push(report(field, 'VALUE_TOO_SHORT', { of: value }));
  }
  if (maxLength !== undefined && value.length > maxLength) {
    failures.push(report(field, 'VALUE_TOO_LONG', { of: value }));
  }
  return failures;
}

/** The named format and the regex, both of which name strings. */
function formatViolations(field: string, constraints: FieldConstraints, value: string): FieldViolation[] {
  const report = reportFor(constraints);
  const { format, pattern } = constraints;
  const failures: FieldViolation[] = [];

  if (format !== undefined && !matchesFormat(format, value)) {
    failures.push(report(field, 'FORMAT_MISMATCH', { of: value }));
  }
  // A `pattern` that will not compile is a config fault caught at load time, so
  // reaching one here would mean validation let it through.
  if (pattern !== undefined && !new RegExp(pattern).test(value)) {
    failures.push(report(field, 'PATTERN_MISMATCH', { of: value }));
  }
  return failures;
}

/** The two entry-count bounds, evidenced by the count and never the entries. */
function countViolations(field: string, constraints: FieldConstraints, entries: readonly unknown[]): FieldViolation[] {
  const report = reportFor(constraints);
  const { minItems, maxItems } = constraints;
  const failures: FieldViolation[] = [];

  if (minItems !== undefined && entries.length < minItems) {
    failures.push(report(field, 'TOO_FEW_ITEMS', { of: entries }));
  }
  if (maxItems !== undefined && entries.length > maxItems) {
    failures.push(report(field, 'TOO_MANY_ITEMS', { of: entries }));
  }
  return failures;
}

/**
 * The per-entry length, at each offending entry's own indexed address.
 *
 * Only string entries have a length to exceed — `itemMaxLength` names lists OF
 * STRINGS — so a non-string entry is passed over rather than collided with.
 */
function entryViolations(field: string, constraints: FieldConstraints, entries: readonly unknown[]): FieldViolation[] {
  const report = reportFor(constraints);
  const { itemMaxLength } = constraints;
  if (itemMaxLength === undefined) return [];

  return entries.flatMap((entry, index) => {
    if (typeof entry !== 'string' || entry.length <= itemMaxLength) return [];
    return [report(`${field}[${index}]`, 'ITEM_TOO_LONG', { of: entry })];
  });
}

/** Membership in the closed set. Applies to any shape, so it is tested last. */
function allowedViolations(field: string, constraints: FieldConstraints, value: unknown): FieldViolation[] {
  const report = reportFor(constraints);
  const { allowed } = constraints;
  if (allowed === undefined || allowed.some((entry) => entry.value === value)) return [];
  return [report(field, 'VALUE_NOT_ALLOWED', { of: value })];
}

/** What `presence` says about a field that IS there. */
function presenceViolations(site: AddressSite, constraints: FieldConstraints): FieldViolation[] {
  const report = reportFor(constraints);
  const { presence } = constraints;
  const failures: FieldViolation[] = [];

  if (presence === 'forbidden') failures.push(report(site.field, 'FORBIDDEN_FIELD_PRESENT', { of: site.value }));
  if (presence === 'required' && isEmptyValue(site.value)) {
    failures.push(report(site.field, 'EMPTY_REQUIRED_FIELD', { of: site.value }));
  }
  return failures;
}

/** The shape-specific tier, dispatched on what the value actually is. */
function shapeViolations(site: AddressSite, constraints: FieldConstraints): FieldViolation[] {
  const { field, value } = site;
  if (typeof value === 'string') {
    return [...lengthViolations(field, constraints, value), ...formatViolations(field, constraints, value)];
  }
  if (Array.isArray(value)) {
    return [...countViolations(field, constraints, value), ...entryViolations(field, constraints, value)];
  }
  return [];
}

/** One site: presence, then shape, then `allowed`. */
function siteViolations(site: AddressSite, constraints: FieldConstraints): FieldViolation[] {
  const report = reportFor(constraints);

  if (!site.present) {
    // Nothing but `presence` may speak about a field that is not there.
    return constraints.presence === 'required' ? [report(site.field, 'MISSING_REQUIRED_FIELD')] : [];
  }

  const presence = presenceViolations(site, constraints);

  // A collision stops the tiers below it: neither the shape checks nor
  // membership can answer against a value of the wrong kind.
  if (collides(constraints, site.value)) {
    return [...presence, report(site.field, 'CONSTRAINT_SHAPE_MISMATCH', { of: site.value })];
  }

  return [
    ...presence,
    ...shapeViolations(site, constraints),
    ...allowedViolations(site.field, constraints, site.value),
  ];
}

/**
 * Evaluate one written address against one file's frontmatter.
 *
 * @param address The field address exactly as the config wrote it.
 * @param constraints That address's constraint object, reported verbatim.
 * @param data The file's parsed frontmatter mapping.
 */
export function fieldViolations(
  address: string,
  constraints: FieldConstraints,
  data: FrontmatterMapping,
): readonly FieldViolation[] {
  const resolved = resolveAddress(address, data);
  if (resolved.kind === 'vacuous') return [];

  // Reported at the address AS WRITTEN, because no concrete address exists: the
  // container is the wrong shape, so there is nothing below it to point at.
  //
  // NO `value`, DELIBERATELY, and this is the one place the choice is easy to
  // read as an oversight. The container did name something — `sources: "text"`
  // is present — but the reported `field` is `sources[].id`, and THAT address
  // named nothing. Carrying the container's value here would emit
  // `{ field: 'sources[].id', value: 'text' }`, which states that
  // `sources[].id` holds `'text'`. It does not. A leaf-level collision is the
  // opposite case and does carry its value, because there the reported address
  // is the one holding it.
  if (resolved.kind === 'shape-mismatch') {
    return [reportFor(constraints)(address, 'CONSTRAINT_SHAPE_MISMATCH')];
  }

  return resolved.sites.flatMap((site) => siteViolations(site, constraints));
}
