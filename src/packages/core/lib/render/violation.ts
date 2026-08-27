/**
 * THE MESSAGE CORPUS — the soft layer, and the whole reason the report data
 * carries no English.
 *
 * A change to the report data is a CONTRACT change. A change to the wording in
 * this file is a CORPUS change. That line is drawn exactly here so the October
 * workshops can rewrite every sentence below without touching the portable
 * artifact.
 *
 * Three labels are the whole grammar:
 *
 *   Found:   what is in the file
 *   Wanted:  the harness's own sentence, naming the firing constraint
 *   Why:     the intent, verbatim, in the Operator's words
 *
 * The intent is APPENDED to a sentence and never substituted for one, which is
 * what stops an author writing prose that hides which constraint fired. You can
 * see that on the page: every stanza has a `Wanted:` line of its own.
 *
 * Rendering rules that are specification, not taste:
 *
 *   - Plain text, never markdown. The report quotes globs full of `*` and
 *     intents containing `#`; a format with no escapes cannot be injected.
 *   - Harness prose is ASCII. Author prose is verbatim, whatever it contains.
 *   - No computed wrapping. Column padding inside a list is fine; reflowing
 *     somebody's sentence to a guessed terminal width is not.
 *   - Every violation stanza is self-sufficient.
 *
 * A TABLE, not a switch. Nine constraints is complexity 11 against a cap of 7,
 * and the cap is right: a table is exhaustively checkable against the union, so
 * a new constraint cannot ship without a sentence.
 */

import type { Format } from '../../../contract/constraints.ts';
import type { AllowedOption } from '../../../contract/values.ts';
import type { Violation } from '../../../contract/violation.ts';
import { found } from './observed.ts';

type Constraint = Violation['constraint'];
type Wanted<K extends Constraint> = (violation: Extract<Violation, { constraint: K }>) => readonly string[];

/**
 * What each named format actually accepts.
 *
 * A named format is the ONE place a violation may describe a shape, and that is
 * the payoff of naming formats instead of writing regexes: the description is
 * written once, by us, in prose, rather than derived from a pattern the Operator
 * typed.
 */
const FORMAT_SHAPES: Record<Format, string> = {
  datetime: 'an ISO 8601 timestamp with an explicit offset, like 2026-08-25T09:00:00Z',
  uri: 'a path or URI, as one token with no spaces',
  actor: 'an actor: <producer>/<version>, or human:<id>, or process:<id>',
};

/**
 * The whole allowed set, uncapped, with each value's meaning.
 *
 * Uncapped is the point: this is what makes the stanza fixable WITHOUT opening
 * the config. An entry whose `intent` the config omitted renders as the bare
 * value rather than as an invented sentence.
 */
function vocabulary(options: readonly AllowedOption[]): readonly string[] {
  const width = Math.max(...options.map((option) => String(option.value).length));
  return options.map((option) => {
    const value = String(option.value);
    return option.intent === null ? `  ${value}` : `  ${value.padEnd(width + 2)}${option.intent}`;
  });
}

const WANTED: { [K in Constraint]: Wanted<K> } = {
  frontmatter: () => ['no frontmatter at all; this rule forbids it on these paths'],
  presence: (violation) =>
    violation.operand === 'required'
      ? [`${violation.at} present, with a value`]
      : [`${violation.at} absent; this rule forbids it`],
  allowed: (violation) => [
    `one of the ${violation.operand.length} values this rule permits`,
    ...vocabulary(violation.operand),
  ],
  format: (violation) => [`the ${violation.operand} format`, `  ${FORMAT_SHAPES[violation.operand]}`],
  pattern: (violation) => [`a value matching the pattern this rule sets for ${violation.at}`],
  unknownKeys: (violation) => [
    `one of the ${violation.known.length} keys this rule names`,
    `  ${violation.known.join('  ')}`,
  ],
  exactlyOneOf: (violation) => [`exactly one of ${violation.operand.join(', ')}`],
  anyOf: (violation) => [`at least one of ${violation.operand.join(', ')}`],
  allOf: (violation) => [`all of ${violation.operand.join(', ')}`],
};

function wanted(violation: Violation): readonly string[] {
  // The one cast, in one place: TypeScript will not correlate a key held in a
  // variable with the union member that key selects. Every definition site
  // above is fully checked, which is where the mistakes are.
  const sentence = WANTED[violation.constraint] as (value: Violation) => readonly string[];
  return sentence(violation);
}

function foundLine(violation: Violation): string {
  if ('found' in violation) return found(violation.found);
  // A cross-field constraint's evidence is which arms were satisfied, not a
  // value: none and both fail `exactlyOneOf` for opposite reasons, and a count
  // could not say which arm to remove.
  return violation.satisfied.length === 0 ? 'none of them' : violation.satisfied.join(' and ');
}

export function stanza(violation: Violation): readonly string[] {
  const [sentence, ...evidence] = wanted(violation);
  return [
    `  ${violation.at ?? '(whole file)'}  [${violation.constraint}]`,
    `    Found:  ${foundLine(violation)}`,
    `    Wanted: ${sentence}`,
    ...evidence.map((line) => `            ${line}`),
    `    Why:    ${violation.intent}`,
  ];
}
