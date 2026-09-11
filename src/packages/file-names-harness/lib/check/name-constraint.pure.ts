/**
 * Everything one set of constraints has to say about one string.
 *
 * ONE TIER SERVES BOTH SUBJECTS. A declared part and a whole stem are judged by
 * the identical function, because `SegmentConstraints` and `PlainSubject` carry
 * the same five constraint keys and mean the same thing by them. Two tiers
 * would be two chances to disagree about what `maxLength` counts.
 *
 * Ordered length, then shape, then `allowed` — the frontmatter Module's own
 * §4.6 order, minus the presence tier it opens with. There is no presence tier
 * here and there cannot be: every file has a stem, and a part either exists or
 * the COUNT is wrong, which is a different finding reported one level up.
 *
 * Every violation carries the failing config fragment verbatim, never a
 * sentence of ours. A stored message would hold one fact twice.
 */

import { matchesFormat } from '../../../named-formats/matches-format.ts';
import type { NameRequirement, SegmentViolation } from '../../../response-contract/index.ts';
import type { NameConstraints, NameSite } from './name-check.types.ts';

/**
 * A reporter bound to one site and one requirement.
 *
 * Bound rather than passed, so every finding from this address carries the same
 * fragment and no call site can quietly report a different one.
 */
function reportFor(site: NameSite, requirement: NameRequirement) {
  return function report(code: SegmentViolation['violation']): SegmentViolation {
    return { segment: site.segment, value: site.value, violation: code, requirement };
  };
}

/**
 * The two length bounds.
 *
 * Separate codes rather than one range violation, because the repairs are
 * opposite and an agent should not have to compare the value against the bound
 * to work out which way to move.
 */
function lengthViolations(
  site: NameSite,
  constraints: NameConstraints,
  requirement: NameRequirement,
): SegmentViolation[] {
  const report = reportFor(site, requirement);
  const { minLength, maxLength } = constraints;
  const failures: SegmentViolation[] = [];

  if (minLength !== undefined && site.value.length < minLength) {
    failures.push(report('FILE_NAMES__VALUE_TOO_SHORT'));
  }
  if (maxLength !== undefined && site.value.length > maxLength) {
    failures.push(report('FILE_NAMES__VALUE_TOO_LONG'));
  }
  return failures;
}

/** The named format and the regex, both of which name strings. */
function shapeViolations(
  site: NameSite,
  constraints: NameConstraints,
  requirement: NameRequirement,
): SegmentViolation[] {
  const report = reportFor(site, requirement);
  const { format, pattern } = constraints;
  const failures: SegmentViolation[] = [];

  if (format !== undefined && !matchesFormat(format, site.value)) {
    failures.push(report('FILE_NAMES__FORMAT_MISMATCH'));
  }
  // A `pattern` that will not compile is a config fault caught at load time, so
  // reaching one here would mean validation let it through.
  if (pattern !== undefined && !new RegExp(pattern).test(site.value)) {
    failures.push(report('FILE_NAMES__PATTERN_MISMATCH'));
  }
  return failures;
}

/**
 * Membership in the closed set, tested last.
 *
 * No shape collision is possible: `allowed[].value` is a string by contract and
 * the value under test is a string by construction, which is precisely why
 * `CONSTRAINT_SHAPE_MISMATCH` has no counterpart in this Module's catalog.
 */
function allowedViolations(
  site: NameSite,
  constraints: NameConstraints,
  requirement: NameRequirement,
): SegmentViolation[] {
  const { allowed } = constraints;
  if (allowed === undefined || allowed.some((entry) => entry.value === site.value)) return [];
  return [reportFor(site, requirement)('FILE_NAMES__VALUE_NOT_ALLOWED')];
}

/**
 * Evaluate one string against one constraint object.
 *
 * Every failing constraint reports, rather than stopping at the first: a name
 * with a wrong category AND a malformed slug is two repairs, and an agent told
 * only about the first would have to run the check again to discover the
 * second.
 *
 * @param site The dotted address and the value found at it.
 * @param constraints That address's constraint object.
 * @param requirement What the report carries back, assembled by the caller.
 */
export function nameViolations(
  site: NameSite,
  constraints: NameConstraints,
  requirement: NameRequirement,
): readonly SegmentViolation[] {
  return [
    ...lengthViolations(site, constraints, requirement),
    ...shapeViolations(site, constraints, requirement),
    ...allowedViolations(site, constraints, requirement),
  ];
}
