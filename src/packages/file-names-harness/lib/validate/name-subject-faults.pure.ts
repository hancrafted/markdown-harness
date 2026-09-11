/**
 * What is wrong with a `file:` subject, its segments, and their allowed sets.
 *
 * The deepest tier of this Module's config validation. It reuses the shared
 * `ConfigFaultCode` catalog rather than minting a private one: an Operator
 * reading `CONFIG_INVALID_VALUE` beside a location of
 * `file-names.rules[0].file.maxLength` needs no new vocabulary to act on it.
 */

import type { Format } from '../../../config-contract/index.ts';
import { matchesFormat } from '../../../named-formats/matches-format.ts';
import type { ConfigFault } from '../../../response-contract/index.ts';

/**
 * The named formats as a runtime set, derived from the union.
 *
 * `Record<Format, true>` rather than a bare array, so a fifth named format
 * stops this file compiling instead of being silently rejected as unknown by a
 * list nobody remembered to extend.
 */
const FORMAT_NAMES: Record<Format, true> = { datetime: true, uri: true, actor: true, 'kebab-case': true };

/** Every key one segment may carry. A nested `segments` is absent on purpose. */
const SEGMENT_KEYS: readonly string[] = ['name', 'minLength', 'maxLength', 'format', 'pattern', 'allowed', 'intent'];

/** The constraint keys a subject may carry when it declares no `segments`. */
const CONSTRAINT_KEYS: readonly string[] = ['minLength', 'maxLength', 'format', 'pattern', 'allowed', 'intent'];

/** Every key one `allowed` entry may carry. */
const ALLOWED_ENTRY_KEYS: readonly string[] = ['value', 'intent'];

/** The fixed delimiter, which no `allowed` value may contain. */
const DELIMITER = '__';

function invalid(location: string): ConfigFault {
  return { code: 'CONFIG_INVALID_VALUE', location };
}

function unrecognised(location: string): ConfigFault {
  return { code: 'CONFIG_UNRECOGNISED_KEY', location };
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keys outside a tier's vocabulary, each reported at its own location. */
function unknownKeys(block: Record<string, unknown>, known: readonly string[], at: string): ConfigFault[] {
  return Object.keys(block)
    .filter((key) => !known.includes(key))
    .map((key) => unrecognised(`${at}.${key}`));
}

/**
 * One `allowed` entry.
 *
 * `value` must be a STRING. YAML hands a bare `0006` over as a number, and this
 * repo's own design-ADR filenames open with a digit run — so a permissive
 * `value` lets an Operator write a closed set that can never match the strings
 * it is compared against, and nothing would ever say so.
 *
 * A value containing `__` is refused HERE, at load. The guard is total because
 * the value is a string and single-spelled, so `includes` sees every case. An
 * unreachable entry would otherwise fail silently, while `VALUE_NOT_ALLOWED`
 * printed it back to the Contributor as a permitted choice.
 */
function allowedEntryFaults(entry: unknown, at: string): ConfigFault[] {
  if (!isMapping(entry)) return [invalid(at)];

  const faults = unknownKeys(entry, ALLOWED_ENTRY_KEYS, at);

  if (typeof entry.value !== 'string') faults.push(invalid(`${at}.value`));
  else if (entry.value.includes(DELIMITER)) faults.push(invalid(`${at}.value`));

  if ('intent' in entry && (typeof entry.intent !== 'string' || entry.intent === '')) {
    faults.push({ code: 'CONFIG_EMPTY_INTENT', location: `${at}.intent` });
  }
  return faults;
}

/** The closed set as a whole. */
function allowedFaults(allowed: unknown, at: string): ConfigFault[] {
  if (!Array.isArray(allowed) || allowed.length === 0) return [invalid(at)];
  return allowed.flatMap((entry, index) => allowedEntryFaults(entry, `${at}[${index}]`));
}

/** Each length bound must be a number, wherever it appears. */
function boundFaults(block: Record<string, unknown>, at: string): ConfigFault[] {
  return ['minLength', 'maxLength']
    .filter((key) => key in block && typeof block[key] !== 'number')
    .map((key) => invalid(`${at}.${key}`));
}

/** A format must be one of the names the union declares. */
function formatFaults(block: Record<string, unknown>, at: string): ConfigFault[] {
  if (!('format' in block)) return [];
  const named = typeof block.format === 'string' && block.format in FORMAT_NAMES;
  return named ? [] : [invalid(`${at}.format`)];
}

/** An `intent` written and left empty says less than one omitted. */
function intentFaults(block: Record<string, unknown>, at: string): ConfigFault[] {
  if (!('intent' in block)) return [];
  if (typeof block.intent === 'string' && block.intent !== '') return [];
  return [{ code: 'CONFIG_EMPTY_INTENT', location: `${at}.intent` }];
}

/** Every constraint key a subject or a segment may carry, checked in declared order. */
function constraintFaults(block: Record<string, unknown>, at: string): ConfigFault[] {
  return [
    ...boundFaults(block, at),
    ...formatFaults(block, at),
    ...('pattern' in block ? patternFaults(block, at) : []),
    ...('allowed' in block ? allowedFaults(block.allowed, `${at}.allowed`) : []),
    ...intentFaults(block, at),
  ];
}

/**
 * A regex, and the sentence it is required to travel with.
 *
 * The mandatory sibling `intent` is the whole reason `pattern` is admissible at
 * all: without it the raw regex leaks into the violation message, which is the
 * failure this language exists to avoid.
 */
function patternFaults(block: Record<string, unknown>, at: string): ConfigFault[] {
  if (typeof block.pattern !== 'string' || block.pattern === '') return [invalid(`${at}.pattern`)];
  if (typeof block.intent === 'string' && block.intent !== '') return [];
  return [{ code: 'CONFIG_MISSING_PATTERN_INTENT', location: `${at}.pattern` }];
}

/**
 * One declared segment.
 *
 * `name` is mandatory and must be kebab-case. Not decoration: the reported
 * address is dotted — `file.slug` — so a name carrying a `.` would make the
 * address unsplittable by the consumer reading it.
 */
function segmentFaults(segment: unknown, at: string): ConfigFault[] {
  if (!isMapping(segment)) return [invalid(at)];

  const faults = unknownKeys(segment, SEGMENT_KEYS, at);
  const name = segment.name;

  if (typeof name !== 'string' || name === '' || !matchesFormat('kebab-case', name)) {
    faults.push(invalid(`${at}.name`));
  }
  return [...faults, ...constraintFaults(segment, at)];
}

/** The declared list: non-empty, and no two parts answering to the same address. */
function segmentListFaults(segments: unknown, at: string): ConfigFault[] {
  if (!Array.isArray(segments) || segments.length === 0) return [invalid(at)];

  const faults = segments.flatMap((segment, index) => segmentFaults(segment, `${at}[${index}]`));
  const names = segments.map((segment) => (isMapping(segment) ? segment.name : undefined));
  const repeated = names.filter((name, index) => name !== undefined && names.indexOf(name) !== index);

  return [...faults, ...repeated.map(() => invalid(at))];
}

/**
 * The subject itself.
 *
 * `segments:` is EXCLUSIVE of its siblings, and the exclusion is reported as
 * `CONFIG_INVALID_VALUE` at the offending sibling because that is literally
 * what the contract says: `SegmentedSubject` types every one of those keys as
 * `never`, so any value at all is outside its type.
 *
 * @param subject The value written under `file:`.
 * @param at The location prefix this subject is reported under.
 */
export function subjectFaults(subject: unknown, at: string): ConfigFault[] {
  if (!isMapping(subject)) return [invalid(at)];

  const faults = unknownKeys(subject, ['segments', ...CONSTRAINT_KEYS], at);

  if (!('segments' in subject)) {
    if (Object.keys(subject).length === 0) return [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: at }];
    return [...faults, ...constraintFaults(subject, at)];
  }

  const siblings = CONSTRAINT_KEYS.filter((key) => key !== 'intent' && key in subject);
  return [
    ...faults,
    ...siblings.map((key) => invalid(`${at}.${key}`)),
    ...segmentListFaults(subject.segments, `${at}.segments`),
  ];
}
