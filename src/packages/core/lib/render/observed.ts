/**
 * The `Found:` line — what was actually in the file.
 *
 * A TABLE, not a switch: five kinds is already complexity 9 against a cap of 7,
 * and the cap is doing its job. A table is also exhaustively checkable against
 * the union, so a new `Observed` kind fails to compile until it has a sentence.
 *
 * Harness prose is ASCII; author prose and file values are verbatim.
 */

import type { Observed } from '../../../contract/values.ts';

type Kind = Observed['kind'];
type Sentence<K extends Kind> = (observed: Extract<Observed, { kind: K }>) => string;

/**
 * Plain double quotes, and no escaping beyond them.
 *
 * The report is plain text, not markdown, and that is specification rather than
 * taste: it quotes globs full of `*` and intents containing `#`, and a format
 * with no escapes cannot be injected.
 */
function quote(value: string): string {
  return value === '' ? '"" (an empty string)' : `"${value}"`;
}

const FOUND: { [K in Kind]: Sentence<K> } = {
  absent: () => 'nothing',
  null: () => 'an empty value: the key is written, with nothing after it',
  scalar: (observed) => (typeof observed.value === 'string' ? quote(observed.value) : String(observed.value)),
  list: (observed) => (observed.length === 0 ? 'an empty list' : `a list of ${observed.length}`),
  mapping: (observed) => (observed.keys.length === 0 ? 'an empty mapping' : `keys: ${observed.keys.join(', ')}`),
};

export function found(observed: Observed): string {
  // The one cast, in one place, and unavoidable: TypeScript will not correlate a
  // key held in a variable with the union member that key selects. Every
  // definition site above is fully checked, which is where the mistakes are.
  const sentence = FOUND[observed.kind] as (value: Observed) => string;
  return sentence(observed);
}
