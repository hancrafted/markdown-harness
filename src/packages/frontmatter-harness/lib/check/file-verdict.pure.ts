/**
 * Everything wrong with one file, in the order a report must carry it.
 *
 * Two decisions live here and nowhere else.
 *
 * PRECEDENCE. A block that will not parse means opposite things to the two
 * payload kinds. Under a constraining rule `FRONTMATTER__UNPARSEABLE` is
 * reported ALONE, because no field, `unknownKeys` or cross-field check is
 * answerable against data that never parsed. Under `frontmatter: forbidden` the
 * rule's complaint — that there is a block at all — is true whether or not the
 * bytes are well-formed, so `FRONTMATTER__FORBIDDEN` is what fires and the
 * unparseable code is not additionally reported: deletion is the fix either way.
 *
 * ORDER. Fields in the config's own declaration order, then cross-field sets,
 * then unknown keys in the frontmatter's own key order. Declared-field findings
 * group together and the not-declared finding goes last. The choice is
 * arbitrary; being written down is not.
 */

import type { Frontmatter } from '../../../foundation/read-corpus.ts';
import type { FrontmatterRule } from '../../section.ts';
import { crossFieldViolations } from './cross-field.pure.ts';
import { fieldViolations } from './field-constraint.pure.ts';
import { evidenceFor } from './field-evidence.pure.ts';
import { unknownKeyViolations } from './unknown-key.pure.ts';
import { FIELD_VIOLATION_CODES } from './violation.pure.ts';
import type { FrontmatterViolation as Violation } from './violation.types.ts';

/** The payload as written, the whole of what a forbidding rule asks. */
const FORBIDS = { frontmatter: 'forbidden' } as const;

/**
 * What a forbidding rule reports.
 *
 * A file with no fence satisfies it. Anything else is a block, and the evidence
 * is the block's top-level keys — OMITTED where the bytes never parsed, because
 * there are no keys to extract from them.
 */
function forbiddenVerdict(data: Frontmatter): readonly Violation[] {
  if (data.kind === 'absent') return [];
  if (data.kind === 'unparseable' || data.kind === 'unterminated') {
    return [{ field: null, violation: FIELD_VIOLATION_CODES.FORBIDDEN, requirement: FORBIDS }];
  }
  return [
    {
      field: null,
      value: evidenceFor(data.data),
      violation: FIELD_VIOLATION_CODES.FORBIDDEN,
      requirement: FORBIDS,
    },
  ];
}

/**
 * Everything one rule has to say about one file.
 *
 * An `unterminated` block is reported exactly as an `unparseable` one: the block
 * exists and gives no mapping to ask anything of.
 *
 * @param frontmatter The file's frontmatter, as the Core parsed it.
 * @param rule The rule that won this file under first-match.
 */
export function violationsForFile(data: Frontmatter, rule: FrontmatterRule): readonly Violation[] {
  if (rule.frontmatter === 'forbidden') return forbiddenVerdict(data);

  if (data.kind === 'unparseable' || data.kind === 'unterminated')
    return [{ field: null, violation: 'FRONTMATTER__UNPARSEABLE' }];

  // A file with no fence at all reads as an empty mapping, which is what lets
  // `presence: required` fire on a file that never opened a block.
  const mapping = data.kind === 'absent' ? {} : data.data;

  const fields = Object.entries(rule.fields ?? {}).flatMap(([address, constraints]) =>
    fieldViolations(address, constraints, mapping),
  );

  return [...fields, ...crossFieldViolations(rule, mapping), ...unknownKeyViolations(rule, mapping)];
}
