/**
 * Validate one field constraint.
 *
 * A constraint is the deepest tier of the config, and the one place three of
 * the catalog's codes can fire. Everything here reports rather than throws: a
 * config fails whole, so a constraint states every fault it carries and the
 * caller concatenates.
 */

import type { ConfigFault } from '../../../response-contract/index.ts';

/** Every key a constraint may carry. Grows only by deliberate amendment. */
const CONSTRAINT_KEYS: readonly string[] = [
  'presence',
  'minLength',
  'maxLength',
  'format',
  'pattern',
  'minItems',
  'maxItems',
  'itemMaxLength',
  'allowed',
  'intent',
];

/** The three named presence states (§3.3). */
const PRESENCE_STATES: readonly string[] = ['required', 'optional', 'forbidden'];

/** The three named formats (§3.3). */
const FORMATS: readonly string[] = ['datetime', 'uri', 'actor'];

/** The five bounds, every one of which names a number (§3.3). */
const BOUND_KEYS: readonly string[] = ['minLength', 'maxLength', 'minItems', 'maxItems', 'itemMaxLength'];

/** A YAML mapping, excluding arrays — `typeof [] === 'object'` would otherwise admit a list. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An intent key written and left blank, wherever it sits. */
function emptyIntentAt(carrier: Record<string, unknown>, location: string): readonly ConfigFault[] {
  if (!('intent' in carrier) || carrier.intent) return [];
  return [{ code: 'CONFIG_EMPTY_INTENT', location: `${location}.intent` }];
}

/** Every key an `allowed` entry may carry. */
const ALLOWED_KEYS: readonly string[] = ['value', 'intent'];

/**
 * One permitted value, and what choosing it means.
 *
 * The unrecognised-key check here earns its keep against one specific mistake.
 * An unquoted YAML flow scalar splits on its own commas, so
 * `{ value: log, intent: A history, newest first. }` parses as an `intent` of
 * `"A history"` plus a null key named `"newest first."`. The Operator's
 * sentence is silently halved, every presence check still passes, and the
 * truncated half is what the tool would go on to quote. Naming the vocabulary
 * turns that into a fault at the exact address.
 */
function allowedEntryFaults(entry: unknown, at: string): readonly ConfigFault[] {
  if (!isMapping(entry)) return [{ code: 'CONFIG_INVALID_VALUE', location: at }];

  const unrecognised = Object.keys(entry)
    .filter((key) => !ALLOWED_KEYS.includes(key))
    .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${at}.${key}` }));

  const valueless: readonly ConfigFault[] =
    'value' in entry ? [] : [{ code: 'CONFIG_INVALID_VALUE', location: `${at}.value` }];

  return [...unrecognised, ...valueless, ...emptyIntentAt(entry, at)];
}

/** The closed set of permitted values, if the constraint states one. */
function allowedFaults(constraint: Record<string, unknown>, location: string): readonly ConfigFault[] {
  if (!('allowed' in constraint)) return [];

  const entries = constraint.allowed;
  if (!Array.isArray(entries)) return [{ code: 'CONFIG_INVALID_VALUE', location: `${location}.allowed` }];

  return entries.flatMap((entry: unknown, index: number) => allowedEntryFaults(entry, `${location}.allowed[${index}]`));
}

/** Whether a string is a regular expression this platform can compile. */
function compiles(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * A `pattern` owes a sibling `intent`, and owes being a usable regex.
 *
 * The mandatory intent is what the violation reports; without it the raw regex
 * leaks into the message.
 */
function patternFaults(constraint: Record<string, unknown>, location: string): readonly ConfigFault[] {
  const pattern = constraint.pattern;
  if (pattern === undefined) return [];
  if (typeof pattern !== 'string' || !compiles(pattern)) {
    return [{ code: 'CONFIG_INVALID_VALUE', location: `${location}.pattern` }];
  }
  // PRESENCE, not truthiness. This code means the sibling key is ABSENT; a key
  // written and left blank is `CONFIG_EMPTY_INTENT`, reported above. Testing
  // `constraint.intent` for truth would report one authoring mistake under two
  // codes, and §3.5's catalog gives each condition exactly one.
  if ('intent' in constraint) return [];
  return [{ code: 'CONFIG_MISSING_PATTERN_INTENT', location }];
}

/**
 * Whether a written key holds something its closed vocabulary does not name.
 *
 * PRESENCE, not truthiness, for the same reason `emptyIntentAt` is not: a bare
 * `presence:` parses to `null`, which is outside the vocabulary and so is the
 * Operator saying something wrong rather than saying nothing. A key never
 * written is not a fault here.
 *
 * Membership is tested with `some` rather than `includes` so that comparing an
 * `unknown` against a list of strings needs no cast to make the types meet.
 */
function outsideVocabulary(constraint: Record<string, unknown>, key: string, permitted: readonly string[]): boolean {
  return key in constraint && !permitted.some((word) => word === constraint[key]);
}

/**
 * Whether a written bound holds anything other than a number.
 *
 * Type, never range: `maxItems: 0` is a coherent thing to write, and §3.3 puts
 * no floor under a bound.
 */
function holdsNonNumber(constraint: Record<string, unknown>, key: string): boolean {
  return key in constraint && typeof constraint[key] !== 'number';
}

/**
 * The keys whose value is drawn from a closed vocabulary or names a number.
 *
 * Recognising a key and never reading what it holds is what let `presence:
 * maybe` reach the evaluator, which branches on `required`/`forbidden` alone
 * and so left the field silently ungoverned. §3.5 names that exact config as
 * `CONFIG_INVALID_VALUE`.
 */
function vocabularyFaults(constraint: Record<string, unknown>, location: string): readonly ConfigFault[] {
  const at = (key: string): ConfigFault => ({ code: 'CONFIG_INVALID_VALUE', location: `${location}.${key}` });

  return [
    ...(outsideVocabulary(constraint, 'presence', PRESENCE_STATES) ? [at('presence')] : []),
    ...(outsideVocabulary(constraint, 'format', FORMATS) ? [at('format')] : []),
    ...BOUND_KEYS.filter((key) => holdsNonNumber(constraint, key)).map(at),
  ];
}

/**
 * Every fault one field constraint carries.
 *
 * @param constraint The value written under one field address.
 * @param location The constraint's address in the config's own notation.
 */
export function constraintFaults(constraint: unknown, location: string): readonly ConfigFault[] {
  if (!isMapping(constraint)) return [{ code: 'CONFIG_INVALID_VALUE', location }];

  const keys = Object.keys(constraint);
  if (keys.length === 0) return [{ code: 'CONFIG_EMPTY_CONSTRAINT', location }];

  return [
    ...keys
      .filter((key) => !CONSTRAINT_KEYS.includes(key))
      .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${location}.${key}` })),
    ...vocabularyFaults(constraint, location),
    ...emptyIntentAt(constraint, location),
    ...allowedFaults(constraint, location),
    ...patternFaults(constraint, location),
  ];
}
