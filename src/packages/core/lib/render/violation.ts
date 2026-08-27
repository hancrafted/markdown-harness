/**
 * One violation, as text. There is no message corpus here any more.
 *
 * This file used to hold a hand-written sentence per constraint plus a
 * description per named format. All of it is gone, and the reason it could go is
 * that `expected` carries the config fragment VERBATIM: the fragment already
 * states the constraint, its operand, and the Operator's `intent` where they
 * wrote one, so a sentence of ours could only ever restate it or contradict it.
 *
 * `expected` renders as YAML, using the same library that parsed the config, so
 * the Operator reads their own config back and the `--json` consumer reads the
 * same object. Two channels, one artifact, and no wording to keep in step.
 *
 * Three labels are the whole grammar:
 *
 *   Found:     what is in the file
 *   Expected:  the config fragment that failed, in the config's own language
 *
 * The rule's `intent` is printed once per file, beside the rule, rather than
 * repeated under every violation — a field that overrides it does so inside its
 * own fragment, where it shows up under `Expected:` automatically.
 *
 * Rendering rules that are specification, not taste:
 *
 *   - Plain text. YAML for the fragment, because YAML is what the Operator
 *     typed; never markdown, which would let a glob full of `*` or an intent
 *     containing `#` change how the report reads.
 *   - No computed wrapping. Reflowing somebody's sentence to a guessed terminal
 *     width is not this program's business.
 *   - Every violation stanza is self-sufficient.
 */

import { stringify } from 'yaml';
import type { Violation } from '../../../contract/violation.ts';
import { found } from './observed.ts';

/** The fragment, in the config's own language, indented under its label. */
function expected(violation: Violation): readonly string[] {
  return stringify(violation.expected, { lineWidth: 0 })
    .trimEnd()
    .split('\n')
    .map((line) => `              ${line}`);
}

function foundLine(violation: Violation): string {
  if ('satisfied' in violation.found) {
    // A cross-field constraint's evidence is which arms were satisfied, not a
    // value: none and both fail `exactlyOneOf` for opposite reasons, and a count
    // could not say which arm to remove.
    return violation.found.satisfied.length === 0 ? 'none of them' : violation.found.satisfied.join(' and ');
  }
  return found(violation.found);
}

export function stanza(violation: Violation): readonly string[] {
  const [first, ...rest] = expected(violation);
  return [
    `  ${violation.field ?? '(whole file)'}  [${violation.constraint}]`,
    `    Found:    ${foundLine(violation)}`,
    `    Expected: ${first.trimStart()}`,
    ...rest,
  ];
}
