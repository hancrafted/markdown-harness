/**
 * Everything wrong with one file, in the order a report must carry it.
 *
 * Two decisions live here and nowhere else.
 *
 * PRECEDENCE. A block that will not parse means opposite things to the two
 * payload kinds. Under a constraining rule `FRONTMATTER_UNPARSEABLE` is
 * reported ALONE, because no field, `unknownKeys` or cross-field check is
 * answerable against data that never parsed. Under `frontmatter: forbidden` the
 * rule's complaint — that there is a block at all — is true whether or not the
 * bytes are well-formed, so `FRONTMATTER_FORBIDDEN` is what fires and the
 * unparseable code is not additionally reported: deletion is the fix either way.
 *
 * ORDER. Fields in the config's own declaration order, then cross-field sets,
 * then unknown keys in the frontmatter's own key order. Declared-field findings
 * group together and the not-declared finding goes last. The choice is
 * arbitrary; being written down is not.
 */

import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { Violation } from '../../../response-contract/index.ts';
import { crossFieldViolations } from './cross-field.pure.ts';
import { fieldViolations } from './field-constraint.pure.ts';
import { evidenceFor } from './field-evidence.pure.ts';
import { frontmatterData } from './frontmatter-data.pure.ts';
import { unknownKeyViolations } from './unknown-key.pure.ts';

/** The payload as written, the whole of what a forbidding rule asks. */
const FORBIDS = { frontmatter: 'forbidden' } as const;

/**
 * What a forbidding rule reports.
 *
 * A file with no fence satisfies it. Anything else is a block, and the evidence
 * is the block's top-level keys — OMITTED where the bytes never parsed, because
 * there are no keys to extract from them.
 */
function forbiddenVerdict(text: string): readonly Violation[] {
  const data = frontmatterData(text);
  if (data.kind === 'absent') return [];
  if (data.kind === 'unparseable') return [{ field: null, violation: 'FRONTMATTER_FORBIDDEN', requirement: FORBIDS }];
  return [{ field: null, value: evidenceFor(data.data), violation: 'FRONTMATTER_FORBIDDEN', requirement: FORBIDS }];
}

/**
 * Everything one rule has to say about one file.
 *
 * @param text The file's full contents.
 * @param rule The rule that won this file under first-match.
 */
export function violationsForFile(text: string, rule: FrontmatterRule): readonly Violation[] {
  if (rule.frontmatter === 'forbidden') return forbiddenVerdict(text);

  const data = frontmatterData(text);
  if (data.kind === 'unparseable') return [{ field: null, violation: 'FRONTMATTER_UNPARSEABLE' }];

  // A file with no fence at all reads as an empty mapping, which is what lets
  // `presence: required` fire on a file that never opened a block.
  const mapping = data.kind === 'absent' ? {} : data.data;

  const fields = Object.entries(rule.fields ?? {}).flatMap(([address, constraints]) =>
    fieldViolations(address, constraints, mapping),
  );

  return [...fields, ...crossFieldViolations(rule, mapping), ...unknownKeyViolations(rule, mapping)];
}
