/**
 * Validate one field constraint.
 *
 * A constraint is the deepest tier of the config, and the one place three of
 * the catalog's codes can fire. Everything here reports rather than throws: a
 * config fails whole, so a constraint states every fault it carries and the
 * caller concatenates.
 */

import type { AllowedValue, FieldConstraints, Format } from '../../../config-contract/index.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/**
 * Every key a constraint may carry, keyed by the type that declares them.
 *
 * Grows only by deliberate amendment, and now cannot grow on one side alone:
 * `Record<keyof T, true>` fails to compile both when the contract gains a key
 * this forgot and when this names a key the contract does not have.
 */
const CONSTRAINT_KEYS: Record<keyof FieldConstraints, true> = {
  presence: true,
  minLength: true,
  maxLength: true,
  format: true,
  pattern: true,
  minItems: true,
  maxItems: true,
  itemMaxLength: true,
  allowed: true,
  intent: true,
};

/**
 * The named vocabularies, keyed by the union each one shadows.
 *
 * A `Record` keyed by the type rather than a list of strings, because a type
 * union is erased before any of this runs and a runtime check cannot read one.
 * Keying by the union is the only thing that keeps the shadow honest: widening
 * `Format` in `config-contract` and forgetting this file leaves a missing key,
 * and a misspelt spelling an excess one, so neither compiles.
 *
 * The type is the source and these follow it. That is the opposite direction
 * from the const-object pattern, which is for a vocabulary with no home — this
 * one has one, in `config-contract`, and it stays the source.
 */
const PRESENCE_STATES: Record<NonNullable<FieldConstraints['presence']>, true> = {
  required: true,
  optional: true,
  forbidden: true,
};

const FORMATS: Record<Format, true> = { datetime: true, uri: true, actor: true, 'kebab-case': true };

/** The five bounds, every one of which names a finite number (§3.3). */
const BOUND_KEYS: readonly (keyof FieldConstraints)[] = [
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'itemMaxLength',
];

/** A YAML mapping, excluding arrays — `typeof [] === 'object'` would otherwise admit a list. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An intent key written and left blank, wherever it sits. */
function emptyIntentAt(carrier: Record<string, unknown>, location: string): readonly ConfigFault[] {
  if (!('intent' in carrier) || carrier.intent) return [];
  return [{ code: 'CONFIG_EMPTY_INTENT', location: `${location}.intent` }];
}

/** Every key an `allowed` entry may carry, keyed by the type that declares them. */
const ALLOWED_KEYS: Record<keyof AllowedValue, true> = { value: true, intent: true };

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
    .filter((key) => !Object.hasOwn(ALLOWED_KEYS, key))
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
 * Membership is `Object.hasOwn` and never `in`: `in` walks the prototype chain,
 * so `format: toString` would answer true and pass a nonsense value straight
 * through the check that exists to stop it.
 */
function outsideVocabulary(constraint: Record<string, unknown>, key: string, permitted: Record<string, true>): boolean {
  if (!(key in constraint)) return false;
  const written = constraint[key];
  return typeof written !== 'string' || !Object.hasOwn(permitted, written);
}

/**
 * Whether a written bound holds anything other than a finite number.
 *
 * `Number.isFinite` and never `typeof`, because `typeof NaN === 'number'` and
 * YAML spells NaN `.nan`. A bound of NaN passes a type check, so the config is
 * accepted and governs its files, and then no comparison against it can ever be
 * true — `'ab'.length < NaN` is false — so the bound reports nothing. That is
 * exactly the failure this whole check exists to end. `.inf` does the same to a
 * ceiling. `Number.isFinite` does not coerce, so it also rejects `'3'`.
 *
 * No floor and no ceiling otherwise: `maxItems: 0` is coherent, and §3.3 puts
 * no range on a bound.
 */
function lacksFiniteBound(constraint: Record<string, unknown>, key: string): boolean {
  return key in constraint && !Number.isFinite(constraint[key]);
}

/**
 * The keys whose value is drawn from a closed vocabulary or names a finite number.
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
    ...BOUND_KEYS.filter((key) => lacksFiniteBound(constraint, key)).map(at),
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
      .filter((key) => !Object.hasOwn(CONSTRAINT_KEYS, key))
      .map((key): ConfigFault => ({ code: 'CONFIG_UNRECOGNISED_KEY', location: `${location}.${key}` })),
    ...vocabularyFaults(constraint, location),
    ...emptyIntentAt(constraint, location),
    ...allowedFaults(constraint, location),
    ...patternFaults(constraint, location),
  ];
}
