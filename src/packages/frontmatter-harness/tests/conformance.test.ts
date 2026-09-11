// The Conformance suite, under `fixtures/conformance/`, doing both of its jobs.
//
// COVERAGE: every key in the config vocabulary is exercised somewhere, and the
// config obeys the config-validity rules the validator enforces. When the
// vocabulary grows, this fails until the suite grows with it.
//
// SPECIFICATION: every Conformance case states its own expected outcome in an
// `<!-- expect: -->` marker, and the last suite in this file holds the
// implementation to it. That half could not exist before `--check` did; the
// coverage half above ran alone until then.
//
// ARCH-002 makes a changed marker a CONTRACT CHANGE rather than a test fix, so
// a failure here is answered by reading the case's reasoning paragraph and
// deciding which of the two is wrong — never by editing the marker to agree
// with the code.
//
// IT NOW COVERS TWO MODULES, and the tiers doubled with them: the rule, the
// subject, the segment and the name-allowed entry are this Module's four, on
// top of the frontmatter Module's four. Naming only some is how a tier goes
// unguarded, which is exactly how `format: datetiem` once failed nothing.
//
// It still LIVES with `frontmatter-harness`, and that is now a tension rather
// than a reason: ARCH-002 placed it here because "rules live inside a Module's
// config section, so the suite asserting that config is a complete surface
// belongs to the Module owning that section". With two Modules, no single
// Module owns it. Moving it would mean editing ARCH-002's `files:` glob, which
// is a governed act — recorded here for the delivery map rather than done
// quietly by a prototype.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type {
  AllowedValue,
  FieldConstraints,
  FileNameRule,
  FileSubject,
  Format,
  MarkdownHarnessConfig,
  NameAllowedValue,
  SegmentConstraints,
} from '../../config-contract/index.ts';
import { checkCorpus } from '../../corpus-verdict/check-corpus.ts';
import { queryPath } from '../../corpus-verdict/query-path.ts';
import { listMarkdownFiles } from '../../markdown-file-tree/list-markdown-files.ts';
import { assessPath } from '../assess.ts';

const CONFIG_URL = new URL('../../../../fixtures/conformance/valid-test-config.yaml', import.meta.url);
const config = parse(readFileSync(CONFIG_URL, 'utf8')) as MarkdownHarnessConfig;
const rules = config.frontmatter?.rules ?? [];
const nameRules: readonly FileNameRule[] = config['file-names']?.rules ?? [];

/** The two Module keys, in the order the specification declares them. */
const MODULE_KEYS = ['frontmatter', 'file-names'] as const;

/** Every key a frontmatter rule may carry. Grows only by deliberate amendment. */
const RULE_KEYS = [
  'ruleId',
  'path',
  'fileName',
  'excludeFiles',
  'intent',
  'frontmatter',
  'fields',
  'unknownKeys',
  'exactlyOneOf',
  'anyOf',
  'allOf',
  'assess',
] as const;

/** Every key a field constraint may carry. */
const CONSTRAINT_KEYS = [
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
] as const;

/**
 * What a rule may still carry alongside `frontmatter: forbidden`. Everything else
 * in `RULE_KEYS` is payload, derived rather than listed again — so a payload key
 * added above is covered here without a second edit.
 */
const NON_PAYLOAD_KEYS: readonly string[] = ['ruleId', 'path', 'fileName', 'excludeFiles', 'intent', 'frontmatter'];
const PAYLOAD_KEYS = RULE_KEYS.filter((key) => !NON_PAYLOAD_KEYS.includes(key));

/** Every key one `allowed` entry may carry. */
const ALLOWED_ENTRY_KEYS: readonly string[] = ['value', 'intent'];

// --- the `file-names` Module's own four tiers -------------------------------

/** Every key a naming rule may carry. `fileName` is deliberately NOT among them. */
const NAME_RULE_KEYS = ['ruleId', 'path', 'excludeFiles', 'intent', 'file'] as const;

/** Every key a `file:` subject may carry, across both of its variants. */
const SUBJECT_KEYS = ['segments', 'minLength', 'maxLength', 'format', 'pattern', 'allowed', 'intent'] as const;

/** Every key one declared segment may carry. A nested `segments` is absent on purpose. */
const SEGMENT_KEYS = ['name', 'minLength', 'maxLength', 'format', 'pattern', 'allowed', 'intent'] as const;

/** The constraint keys `segments:` is exclusive of — it may sit beside `intent` and nothing else. */
const SUBJECT_SIBLINGS: readonly string[] = ['minLength', 'maxLength', 'format', 'pattern', 'allowed'];

/**
 * The named formats, DERIVED FROM THE UNION rather than listed beside it.
 *
 * `Record<Format, true>` is the whole point: a `Format[]` stays valid when the
 * union grows, so a fourth member would be silently unexercised by every loop
 * below — measured, and the reason `kebab-case` had to arrive with this change.
 * Keyed, a new member stops this file compiling until it is written here.
 */
const FORMAT_NAMES: Record<Format, true> = { datetime: true, uri: true, actor: true, 'kebab-case': true };
const FORMATS: readonly string[] = Object.keys(FORMAT_NAMES);

/** The fixed segment delimiter, which no `allowed` value may contain. */
const DELIMITER = '__';

/** What a `file:` subject and a segment both admit — a private local shape, per ARCH-005. */
interface NameConstraintCarrier {
  format?: Format;
  pattern?: string;
  intent?: string;
  minLength?: number;
  maxLength?: number;
  allowed?: NameAllowedValue[];
}

function everyRuleKey(): Set<string> {
  const seen = new Set<string>();
  for (const rule of rules) for (const key of Object.keys(rule)) seen.add(key);
  return seen;
}

function everyConstraint(): FieldConstraints[] {
  return rules.flatMap((rule) => Object.values(rule.fields ?? {}));
}

function everyConstraintKey(): Set<string> {
  const seen = new Set<string>();
  for (const constraint of everyConstraint()) for (const key of Object.keys(constraint)) seen.add(key);
  return seen;
}

function everyAllowedValue(): AllowedValue[] {
  return everyConstraint().flatMap((constraint) => constraint.allowed ?? []);
}

function everyFieldAddress(): string[] {
  return rules.flatMap((rule) => Object.keys(rule.fields ?? {}));
}

function everyNameRuleKey(): Set<string> {
  const seen = new Set<string>();
  for (const rule of nameRules) for (const key of Object.keys(rule)) seen.add(key);
  return seen;
}

function everySubject(): FileSubject[] {
  return nameRules.map((rule) => rule.file);
}

function everySubjectKey(): Set<string> {
  const seen = new Set<string>();
  for (const subject of everySubject()) for (const key of Object.keys(subject)) seen.add(key);
  return seen;
}

function everySegment(): SegmentConstraints[] {
  return everySubject().flatMap((subject) => subject.segments ?? []);
}

function everySegmentKey(): Set<string> {
  const seen = new Set<string>();
  for (const segment of everySegment()) for (const key of Object.keys(segment)) seen.add(key);
  return seen;
}

/** Every `allowed` entry anywhere in the naming Module — on a segment or on a whole stem. */
function everyNameAllowedValue(): NameAllowedValue[] {
  const onSegments = everySegment().flatMap((segment) => segment.allowed ?? []);
  const onSubjects = everySubject().flatMap((subject) => subject.allowed ?? []);
  return [...onSegments, ...onSubjects];
}

/**
 * Every block in the naming Module that may carry a constraint key — a subject
 * or a segment.
 *
 * Typed as the constraint keys the two have in common rather than as a bare
 * index signature, so a loop over these is still checked against the contract
 * instead of against `unknown`.
 */
function everyNameConstraintCarrier(): readonly NameConstraintCarrier[] {
  return [...everySubject(), ...everySegment()];
}

describe('valid-test-config.yaml is a complete test surface', () => {
  describe('success cases', () => {
    it('parses into exactly the module sections the specification declares', () => {
      // ARRANGE
      const expected = [...MODULE_KEYS];
      // ACT
      const actual = Object.keys(config);
      // ASSERT
      expect(actual).toEqual(expected);
      expect(rules.length).toBeGreaterThan(0);
      expect(nameRules.length).toBeGreaterThan(0);
    });

    it.each(RULE_KEYS)('exercises the rule key %s', (key) => {
      // ARRANGE
      const keysInConfig = everyRuleKey();
      // ACT
      const seen = [...keysInConfig];
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(CONSTRAINT_KEYS)('exercises the constraint %s', (key) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const seen = constraints.flatMap((constraint) => Object.keys(constraint));
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(ALLOWED_ENTRY_KEYS)('exercises the allowed-entry key %s', (key) => {
      // The allowed-entry tier had a closure assertion and no coverage loop, so
      // an entry key could have gone unreached while the suite still called
      // itself complete. ARCH-002 §1.2 names this tier alongside the other
      // three; §3.1 requires every one of them be reached.
      // ARRANGE
      const entries = everyAllowedValue();
      // ACT
      const seen = entries.flatMap((entry) => Object.keys(entry));
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(FORMATS)('exercises the named format %s', (format) => {
      // Reached across BOTH Modules, because a format is portable specification
      // rather than one Module's vocabulary: `kebab-case` is exercised on a
      // frontmatter field and on a name segment, and both readings must be the
      // same claim about the same string.
      // ARRANGE
      const carriers = [...everyConstraint(), ...everyNameConstraintCarrier()];
      // ACT
      const seen = carriers.flatMap((carrier) => (carrier.format === undefined ? [] : [carrier.format]));
      // ASSERT
      expect(seen).toContain(format);
    });

    it.each(NAME_RULE_KEYS)('exercises the naming rule key %s', (key) => {
      // ARRANGE
      const keysInConfig = everyNameRuleKey();
      // ACT
      const seen = [...keysInConfig];
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(SUBJECT_KEYS)('exercises the file subject key %s', (key) => {
      // The tier that proves the subject has TWO shapes. `segments` and the five
      // constraint keys can never appear on one object, so reaching them all
      // takes at least two rules — which is the exclusivity being exercised
      // rather than merely declared.
      // ARRANGE
      const keysInConfig = everySubjectKey();
      // ACT
      const seen = [...keysInConfig];
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(SEGMENT_KEYS)('exercises the segment key %s', (key) => {
      // ARRANGE
      const keysInConfig = everySegmentKey();
      // ACT
      const seen = [...keysInConfig];
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(ALLOWED_ENTRY_KEYS)('exercises the naming allowed-entry key %s', (key) => {
      // ARRANGE
      const entries = everyNameAllowedValue();
      // ACT
      const seen = entries.flatMap((entry) => Object.keys(entry));
      // ASSERT
      expect(seen).toContain(key);
    });
  });

  describe('failure cases', () => {
    it('carries no rule key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = RULE_KEYS;
      // ACT
      const unknown = [...everyRuleKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no allowed-entry key outside the vocabulary', () => {
      // The assertion that was missing while five intents sat truncated. An
      // unquoted YAML flow scalar splits on its own commas, so
      // `{ value: log, intent: A history, newest first. }` yields a halved
      // `intent` and a null key named after the tail. Every presence check
      // still passes, which is exactly why presence checks were not enough.
      // ARRANGE
      const known = ALLOWED_ENTRY_KEYS;
      // ACT
      const unknown = everyAllowedValue().flatMap((entry) => Object.keys(entry).filter((key) => !known.includes(key)));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('names no format outside the vocabulary, in either Module', () => {
      // The named-format tier had a coverage loop and no closure assertion, so
      // `format: datetiem` would have failed nothing here — the constraint-key
      // closure test sees the KEY `format`, never its value.
      // ARRANGE
      const known = FORMATS;
      // ACT
      const unknown = [...everyConstraint(), ...everyNameConstraintCarrier()]
        .flatMap((carrier) => (carrier.format === undefined ? [] : [carrier.format]))
        .filter((format) => !known.includes(format));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no constraint key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = CONSTRAINT_KEYS;
      // ACT
      const unknown = [...everyConstraintKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no naming rule key outside the vocabulary', () => {
      // This is also what proves the `fileName` sugar is withheld. Selecting by
      // an exact file name while constraining that same name reaches only the
      // files that already satisfy the rule, so every misnamed file would fall
      // through unselected and the Module would report nothing at all.
      // ARRANGE
      const known: readonly string[] = NAME_RULE_KEYS;
      // ACT
      const unknown = [...everyNameRuleKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no file subject key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = SUBJECT_KEYS;
      // ACT
      const unknown = [...everySubjectKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no segment key outside the vocabulary, nested segments included', () => {
      // `segments` is absent from `SEGMENT_KEYS`, so a nested one fails here.
      // Under a fixed `__` a nested segment has nothing left to split on.
      // ARRANGE
      const known: readonly string[] = SEGMENT_KEYS;
      // ACT
      const unknown = [...everySegmentKey()].filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no naming allowed-entry key outside the vocabulary', () => {
      // ARRANGE
      const known = ALLOWED_ENTRY_KEYS;
      // ACT
      const unknown = everyNameAllowedValue().flatMap((entry) =>
        Object.keys(entry).filter((key) => !known.includes(key)),
      );
      // ASSERT
      expect(unknown).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('reaches both nesting depths', () => {
      // ARRANGE
      const listEntry = 'list entry';
      const mappingKey = 'mapping key';
      const topLevel = 'top level';
      // ACT
      const depths = everyFieldAddress().map((address) => {
        if (address.includes('[].')) return listEntry;
        return address.includes('.') ? mappingKey : topLevel;
      });
      // ASSERT
      expect(depths).toContain(listEntry);
      expect(depths).toContain(mappingKey);
    });

    it('addresses a list and its entries separately', () => {
      // ARRANGE
      const list = 'sources';
      const entryField = 'sources[].resource';
      // ACT
      const addresses = new Set(everyFieldAddress());
      // ASSERT
      expect(addresses).toContain(list);
      expect(addresses).toContain(entryField);
    });

    it('reaches every segment count the grammar admits, one and up', () => {
      // A suite that only ever declared two segments could not tell the count
      // from a constant. One is the degenerate case — a stem with no delimiter
      // at all — and it is a real shape rather than an edge to route around.
      // ARRANGE
      const one = 1;
      const three = 3;
      // ACT
      const counts = everySubject().flatMap((subject) =>
        subject.segments === undefined ? [] : [subject.segments.length],
      );
      // ASSERT
      expect(counts).toContain(one);
      expect(counts).toContain(three);
    });

    it('reaches both subject shapes, segmented and whole-stem', () => {
      // ARRANGE
      const segmented = everySubject().filter((subject) => subject.segments !== undefined);
      const whole = everySubject().filter((subject) => subject.segments === undefined);
      // ACT
      const reached = { segmented: segmented.length > 0, whole: whole.length > 0 };
      // ASSERT
      expect(reached).toEqual({ segmented: true, whole: true });
    });
  });
});

describe('valid-test-config.yaml obeys the config-validity rules', () => {
  describe('success cases', () => {
    it('gives every rule exactly one selector', () => {
      // ARRANGE
      const selectorKeys = ['path', 'fileName'];
      // ACT
      const counts = rules.map((rule) => selectorKeys.filter((key) => key in rule).length);
      // ASSERT
      for (const count of counts) expect(count).toBe(1);
    });

    it('gives every rule a ruleId', () => {
      // ARRANGE
      const ids = rules.map((rule) => rule.ruleId);
      // ACT
      const missing = ids.filter((id) => !id);
      // ASSERT
      expect(missing).toEqual([]);
    });

    it('gives every rule an intent', () => {
      // ARRANGE
      const intents = rules.map((rule) => rule.intent);
      // ACT
      const missing = intents.filter((intent) => !intent);
      // ASSERT
      expect(missing).toEqual([]);
    });

    it('gives every pattern a sibling intent, in both Modules', () => {
      // Without it the raw regex leaks into the violation message, which is the
      // failure this language exists to avoid. The naming Module is included
      // because `pattern` RELOCATED during this change — off `reference.slug`,
      // which became a named format, and onto `sources[].id`. Had it not landed
      // somewhere in the same change, this assertion would have run over an
      // empty list and passed while checking nothing.
      // ARRANGE
      const patterned = [...everyConstraint(), ...everyNameConstraintCarrier()].filter(
        (carrier) => 'pattern' in carrier,
      );
      // ACT
      const missing = patterned.filter((carrier) => !carrier.intent);
      // ASSERT
      expect(patterned.length).toBeGreaterThan(0);
      expect(missing).toEqual([]);
    });

    it('gives every naming rule a path selector and a file subject', () => {
      // ARRANGE
      const incomplete = nameRules.filter((rule) => !Array.isArray(rule.path) || rule.file === undefined);
      // ACT
      const offending = incomplete.map((rule) => rule.ruleId);
      // ASSERT
      expect(offending).toEqual([]);
    });

    it('gives every naming rule a ruleId and an intent', () => {
      // ARRANGE
      const missing = nameRules.filter((rule) => !rule.ruleId || !rule.intent);
      // ACT
      const offending = missing.map((rule, index) => rule.ruleId || index);
      // ASSERT
      expect(offending).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('gives no two rules the same ruleId', () => {
      // ARRANGE
      const ids = rules.map((rule) => rule.ruleId);
      // ACT
      const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
      // ASSERT
      expect(repeated).toEqual([]);
    });

    it('leaves a frontmatter-forbidden rule with no payload', () => {
      // ARRANGE
      const forbidding = rules.filter((rule) => 'frontmatter' in rule);
      const forbidden = 'forbidden';
      // ACT
      const withPayload = forbidding.flatMap((rule) => PAYLOAD_KEYS.filter((key) => key in rule));
      // ASSERT
      for (const rule of forbidding) expect(rule.frontmatter).toBe(forbidden);
      expect(withPayload).toEqual([]);
    });

    it('spells every allowed entry as a record, never a bare string', () => {
      // ARRANGE
      const entries = everyAllowedValue();
      const recordType = 'object';
      const valueKey = 'value';
      // ACT
      const types = entries.map((entry) => typeof entry);
      // ASSERT
      for (const type of types) expect(type).toBe(recordType);
      for (const entry of entries) expect(entry).toHaveProperty(valueKey);
    });

    it('rejects an intent that is present but empty', () => {
      // ARRANGE
      const carriers = [...everyConstraint(), ...everyAllowedValue(), ...everyNameConstraintCarrier()].filter(
        (carrier) => 'intent' in carrier,
      );
      // ACT
      const empty = carriers.filter((carrier) => !carrier.intent);
      // ASSERT
      expect(empty).toEqual([]);
    });

    it('gives no two naming rules the same ruleId', () => {
      // ARRANGE
      const ids = nameRules.map((rule) => rule.ruleId);
      // ACT
      const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
      // ASSERT
      expect(repeated).toEqual([]);
    });

    it('never puts a naming allowed value outside a string', () => {
      // YAML hands a bare `0006` over as a NUMBER, and this repo's own six
      // design-ADR filenames open with a digit run — so a numeric `value` is a
      // closed set that can never match the strings it is compared against.
      // ARRANGE
      const stringType = 'string';
      // ACT
      const types = everyNameAllowedValue().map((entry) => typeof entry.value);
      // ASSERT
      expect(everyNameAllowedValue().length).toBeGreaterThan(0);
      for (const type of types) expect(type).toBe(stringType);
    });

    it('never lets a naming allowed value contain the fixed delimiter', () => {
      // Refused at LOAD with `CONFIG_INVALID_VALUE`, and the guard is TOTAL
      // because the value is a string and single-spelled. An unreachable entry
      // would otherwise fail silently while `VALUE_NOT_ALLOWED` printed it back
      // to a Contributor as a permitted choice.
      // ARRANGE
      const entries = everyNameAllowedValue();
      // ACT
      const offending = entries.filter((entry) => entry.value.includes(DELIMITER));
      // ASSERT
      expect(offending).toEqual([]);
    });

    it('gives every segment a unique kebab-case name', () => {
      // Not decoration: the reported address is dotted — `file.slug` — so a name
      // carrying a `.` would be unsplittable by the consumer reading it.
      // ARRANGE
      const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      // ACT
      const malformed = everySegment()
        .map((segment) => segment.name)
        .filter((name) => !kebab.test(name));
      const repeatedWithin = everySubject().flatMap((subject) => {
        const names = (subject.segments ?? []).map((segment) => segment.name);
        return names.filter((name, index) => names.indexOf(name) !== index);
      });
      // ASSERT
      expect(malformed).toEqual([]);
      expect(repeatedWithin).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('derives the type vocabulary from the union of allowed values', () => {
      // The Floor is gone: no top-level ceiling and no rule-level `types:`. `type`
      // is an ordinary field, so the repo's vocabulary is implicit rather than
      // declared — derivable for reporting, no longer stated in one place.
      // ARRANGE
      const retiredKey = 'types';
      // ACT
      const ceilingCarriers = rules.filter((rule) => retiredKey in rule).map((rule) => rule.intent);
      const vocabulary = new Set(
        (rules.flatMap((rule) => rule.fields?.type?.allowed ?? []) as AllowedValue[]).map((entry) => entry.value),
      );
      // ASSERT
      expect(ceilingCarriers).toEqual([]);
      expect(vocabulary.size).toBeGreaterThan(1);
    });

    it('never lets a subject carry segments beside a constraint of its own', () => {
      // `format: kebab-case` over a `__`-joined stem can only ever fail, and a
      // whole-name cap silently disagrees with the sum of the parts'. The two
      // are exclusive in the type, and this is the corpus proving the type is
      // describing the config rather than the other way round.
      // ARRANGE
      const segmented = everySubject().filter((subject) => subject.segments !== undefined);
      // ACT
      const offending = segmented.flatMap((subject) => SUBJECT_SIBLINGS.filter((key) => key in subject));
      // ASSERT
      expect(segmented.length).toBeGreaterThan(0);
      expect(offending).toEqual([]);
    });

    it('lets a whole-stem subject carry the length cap a segmented one may not', () => {
      // The narrowing that "no whole-name length cap exists by construction"
      // needed: it reasoned from `segments:` eating its siblings, so it was only
      // ever true of an object carrying one. `file: { maxLength: 24 }` disagrees
      // with nothing and reports a code the catalog already holds.
      // ARRANGE
      const capKey = 'maxLength';
      // ACT
      const capped = everySubject().filter((subject) => subject.segments === undefined && capKey in subject);
      // ASSERT
      expect(capped.length).toBeGreaterThan(0);
    });

    it('never offers the fileName sugar on a naming rule', () => {
      // Stated as its own case because it is the trap that would make every
      // violation invisible rather than merely wrong.
      // ARRANGE
      const sugar = 'fileName';
      // ACT
      const offending = nameRules.filter((rule) => sugar in rule).map((rule) => rule.ruleId);
      // ASSERT
      expect(offending).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// The specification half: each case's stated verdict, against what runs.
// ---------------------------------------------------------------------------

/** The synthetic repo root the config's paths are written relative to. */
const CORPUS_ROOT = fileURLToPath(new URL('../../../../fixtures/conformance', import.meta.url));

/** The three verdicts a Conformance case may state (ARCH-002 §2.1). */
const PASSES = 'PASSES';
const FAILS = 'FAILS';
const UNGOVERNED = 'UNGOVERNED';

const MARKER = /<!-- expect: (\w+) -->/g;

/**
 * The verdict one case states.
 *
 * Throws rather than defaulting: a case with no marker, or with two, is a
 * broken contract and not a file to quietly skip. `expect-marker` already
 * rejects both, so reaching here means the rule did not run.
 */
function verdictOf(path: string): string {
  const body = readFileSync(new URL(`../../../../fixtures/conformance/${path}`, import.meta.url), 'utf8');
  const found = [...body.matchAll(MARKER)].map((match) => match[1]);
  if (found.length !== 1) throw new Error(`${path} must carry exactly one expect marker, found ${found.length}`);
  return found[0];
}

const corpus = listMarkdownFiles(CORPUS_ROOT) ?? [];
const cases = corpus.map((path) => ({ path, verdict: verdictOf(path) }));
const stated = (verdict: string): string[] => cases.filter((one) => one.verdict === verdict).map((one) => one.path);

const checked = checkCorpus(CORPUS_ROOT, corpus, config);
const verdict = checked.kind === 'checked' ? checked.result : undefined;
const reported = new Set((verdict?.files ?? []).map((file) => file.path));

/** The Modules that reported something about one path, in the order the report lists them. */
function modulesReporting(path: string): readonly string[] {
  const file = (verdict?.files ?? []).find((one) => one.path === path);
  return (file?.modules ?? []).map((block) => block.module);
}

/**
 * The verdict the IMPLEMENTATION reaches for one case.
 *
 * Reduced to the same three words the markers use, so a disagreement reads as
 * `expected 'PASSES' to be 'FAILS'` — which names what the harness actually
 * said. Comparing set membership as a boolean would report only that false is
 * not true, the same message for every possible cause.
 *
 * `invisible` is now a claim about EVERY Module at once, which is why this asks
 * the composer rather than one Module's resolver.
 */
function verdictFrom(path: string): string {
  if (queryPath(path, config).governance === 'invisible') return UNGOVERNED;
  return reported.has(path) ? FAILS : PASSES;
}

describe('the harness reports the verdict each Conformance case states', () => {
  describe('success cases', () => {
    it.each(stated(PASSES))('reports %s as conforming', (path) => {
      // A PASSES case must be GOVERNED and carry nothing: a file that passed
      // because no rule looked at it would be an UNGOVERNED case instead, and
      // the two are different claims. Both are covered by comparing verdicts.
      // ARRANGE
      const expected = PASSES;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it.each(stated(FAILS))('reports %s as violating', (path) => {
      // ARRANGE
      const expected = FAILS;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it.each(stated(UNGOVERNED))('never governs %s, so it can carry real faults unreported', (path) => {
      // The faults in an UNGOVERNED case are real and may never be reported.
      // That is the whole of what such a case tests.
      // ARRANGE
      const expected = UNGOVERNED;
      // ACT
      const actual = verdictFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('answers every case at once, so a disagreement names the whole corpus', () => {
      // The per-case tests above fail one file at a time. This one fails with a
      // diff of every case that disagrees, which is what a reader needs when a
      // parsing change moves several verdicts together.
      // ARRANGE
      const expected = Object.fromEntries(cases.map((one) => [one.path, one.verdict]));
      // ACT
      const actual = Object.fromEntries(cases.map((one) => [one.path, verdictFrom(one.path)]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three verdicts, so no branch of this suite is vacuous', () => {
      // An `it.each` over an empty list is a passing suite that asserted
      // nothing. This is what stops one of the three blocks above going silent.
      // ARRANGE
      const everyVerdict = [PASSES, FAILS, UNGOVERNED];
      // ACT
      const exercised = everyVerdict.filter((verdict) => stated(verdict).length > 0);
      // ASSERT
      expect(exercised).toEqual(everyVerdict);
    });

    it('agrees with the marker tally on how many files are governed and invalid', () => {
      // The counts and the per-file verdicts come from the same run, so this
      // catches the summary drifting from `files` — and it is stated against the
      // MARKERS rather than against the corpus size, so adding a case with no
      // marker cannot quietly satisfy it.
      //
      // `governedFiles` is the UNION across Modules, which is what makes this
      // still one number against one marker tally: a file both Modules govern is
      // counted once, exactly as it carries one marker.
      // ARRANGE
      const expected = {
        governedFiles: stated(PASSES).length + stated(FAILS).length,
        invalidFiles: stated(FAILS).length,
      };
      // ACT
      const summary = verdict?.summary;
      const actual = { governedFiles: summary?.governedFiles, invalidFiles: summary?.invalidFiles };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('enumerates every Conformance case the suite declares', () => {
      // Stated by hand rather than counted back off the corpus it is checking.
      // ARCH-002 makes adding or removing a Conformance case a contract change,
      // so this number belongs to that review instead of silently agreeing with
      // whatever the tree now holds — and `corpus.length` compared against
      // anything derived from `corpus` could not fail at all.
      // ARRANGE
      const declaredCases = 85;
      // ACT
      const enumerated = corpus.length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });
  });
});

// ---------------------------------------------------------------------------
// The Module dimension: which Module said what, about which file.
// ---------------------------------------------------------------------------

describe('the harness attributes every finding to the Module that made it', () => {
  describe('success cases', () => {
    it('lists both Modules for a file that fails in each, in declared order', () => {
      // The shape that could not be expressed at all before a second Module
      // existed. The order is the specification's, never the YAML mapping's.
      // ARRANGE
      const expected = [...MODULE_KEYS];
      // ACT
      const actual = modulesReporting('docs/reference/Bad_Name.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists only the naming Module for a file whose frontmatter is not governed', () => {
      // `--check` lists only Modules WITH FINDINGS, so a file the frontmatter
      // Module never claimed carries one block and not an empty second one.
      // ARRANGE
      const expected = ['file-names'];
      // ACT
      const actual = modulesReporting('docs/names/glossary/Glossary-Term.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists only the frontmatter Module for a file whose name is not governed', () => {
      // ARRANGE
      const expected = ['frontmatter'];
      // ACT
      const actual = modulesReporting('docs/plain/untyped.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('carries each Module its own winning rule, because first-match holds within one', () => {
      // The docblock that justified a single `ruleId` per file is relocated, not
      // repealed: it is true within a Module and measurably false across them.
      // ARRANGE
      const expected = [
        { module: 'frontmatter', ruleId: 'reference' },
        { module: 'file-names', ruleId: 'reference-page-names' },
      ];
      // ACT
      const file = (verdict?.files ?? []).find((one) => one.path === 'docs/reference/Bad_Name.md');
      const actual = (file?.modules ?? []).map((block) => ({ module: block.module, ruleId: block.ruleId }));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('prefixes every naming code with its own Module, so a bare code cannot be ambiguous', () => {
      // A shared `FORMAT_MISMATCH` cannot tell an agent whether to rename the
      // file or edit the frontmatter — opposite repairs.
      // ARRANGE
      const prefix = 'FILE_NAMES__';
      // ACT
      const codes = (verdict?.files ?? [])
        .flatMap((file) => file.modules)
        .filter((block) => block.module === 'file-names')
        .flatMap((block) => block.violations.map((one) => one.violation));
      // ASSERT
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) expect(code.startsWith(prefix)).toBe(true);
    });

    it('addresses every naming finding at the subject or one of its declared parts', () => {
      // `file`, or `file.<segment>` — dotted so a returning folder subject
      // inherits the spelling without the address changing shape.
      // ARRANGE
      const subject = 'file';
      // ACT
      const addresses = (verdict?.files ?? [])
        .flatMap((file) => file.modules)
        .filter((block) => block.module === 'file-names')
        .flatMap((block) => block.violations.map((one) => one.segment));
      const malformed = addresses.filter((one) => one !== subject && !one.startsWith(`${subject}.`));
      // ASSERT
      expect(addresses.length).toBeGreaterThan(0);
      expect(malformed).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('sums totalViolations across Modules rather than counting files', () => {
      // ARRANGE
      const summed = (verdict?.files ?? []).reduce(
        (total, file) => total + file.modules.reduce((count, block) => count + block.violations.length, 0),
        0,
      );
      // ACT
      const reportedTotal = verdict?.summary.totalViolations;
      // ASSERT
      expect(reportedTotal).toBe(summed);
      expect(summed).toBeGreaterThan(stated(FAILS).length);
    });

    it('lists every governing Module for a query, including one already satisfied', () => {
      // Where `--check` shows only findings, `--query` shows everything that
      // governs — because the path may not exist yet, so "already satisfies" is
      // not yet a fact about anything.
      // ARRANGE
      const expected = [...MODULE_KEYS];
      // ACT
      const answered = queryPath('docs/reference/labels.md', config);
      const actual = answered.governance === 'governed' ? answered.modules.map((one) => one.module) : [];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('hands a naming rule its subject verbatim, so an agent can construct a conforming name', () => {
      // The whole reason `--query` matters most to this Module: it is asked
      // while the name is still being chosen.
      // ARRANGE
      const expected = ['category', 'slug'];
      // ACT
      const answered = queryPath('docs/names/blocks/does-not-exist-yet.md', config);
      const block =
        answered.governance === 'governed' ? answered.modules.find((one) => one.module === 'file-names') : undefined;
      const subject = block?.module === 'file-names' ? block.requirements.file : undefined;
      const actual = (subject?.segments ?? []).map((segment) => segment.name);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('carries the declared roster on a segmented finding and omits it on a whole-stem one', () => {
      // The roster is DERIVED beside a verbatim fragment — the second capped
      // exception in the response, and capped the same way as the first. Its
      // absence is what marks a finding as a whole-stem one.
      // ARRANGE
      const expected = { segmented: ['category', 'slug'], whole: undefined };
      // ACT
      const findingsFor = (path: string) =>
        (verdict?.files ?? []).find((one) => one.path === path)?.modules.find((block) => block.module === 'file-names');
      const segmented = findingsFor('docs/names/blocks/wiki__llm-wiki.md');
      const whole = findingsFor('docs/names/plain/ab.md');
      const actual = {
        segmented: segmented?.violations[0]?.requirement.segments,
        whole: whole?.violations[0]?.requirement.segments,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// The Assessment half: each case's stated agent action, against what runs.
// ---------------------------------------------------------------------------

/**
 * The instant this suite is judged against, PINNED.
 *
 * Not in `valid-test-config.yaml`, and the placement is the decision: the
 * config is the subject under test, so the instant belongs beside the runner
 * that judges it. Left to a real clock, `fresh.md` would turn `REVIEW` on the
 * day its `stale_after` passed and this suite would go red on an unchanged tree
 * — on a date nobody wrote down. Moving this constant is a contract change on
 * the same terms as moving a marker.
 */
const ASSESSMENT_INSTANT = '2026-12-01T00:00:00Z';

/** The three agent actions a Conformance case may state (ARCH-002 §4). */
const REVIEW = 'REVIEW';
const PROCEED = 'PROCEED';
const FIX_FILE = 'FIX_FILE';

const ASSESS_MARKER = /<!-- assess: (\w+) -->/g;

/**
 * The agent action one case states, or nothing if it states none.
 *
 * Absence is legal here and is not legal for `expect:`: the Assessment markers
 * cover the five states deliberately rather than exhaustively, because a
 * freshness answer is meaningless for most of this corpus. Two markers is a
 * broken contract on the same terms as two `expect:` markers, so it throws.
 */
function assessMarkerOf(path: string): string | undefined {
  const body = readFileSync(new URL(`../../../../fixtures/conformance/${path}`, import.meta.url), 'utf8');
  const found = [...body.matchAll(ASSESS_MARKER)].map((match) => match[1]);
  if (found.length > 1) throw new Error(`${path} must carry at most one assess marker, found ${found.length}`);
  return found[0];
}

const assessCases = corpus
  .map((path) => ({ path, action: assessMarkerOf(path) }))
  .filter((one): one is { path: string; action: string } => one.action !== undefined);

const marked = (action: string): string[] => assessCases.filter((one) => one.action === action).map((one) => one.path);

/** What the IMPLEMENTATION answers for one case, at the pinned instant. */
function actionFrom(path: string): string {
  return assessPath({ root: CORPUS_ROOT, path: path }, config, ASSESSMENT_INSTANT).agentAction;
}

describe('the harness reports the agent action each Conformance case states', () => {
  describe('success cases', () => {
    it.each(marked(PROCEED))('tells an agent to proceed on %s', (path) => {
      // ARRANGE
      const expected = PROCEED;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it("carries the Operator's own sentence on a stale file, verbatim, and names the block it came from", () => {
      // The one case where this tool emits prose, and it is never its own. The
      // sentence below is the `freshness` rule's `assess.stale` value, copied
      // from the config rather than reworded — if the two ever disagree, the
      // config is right and this is the contract change.
      // ARRANGE
      const verbatim = 'Re-verify this against the source before quoting it, then move stale_after.';
      const expected = { instruction: verbatim, source: 'rule' };
      // ACT
      const answered = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/stale.md' }, config, ASSESSMENT_INSTANT);
      const actual = { instruction: answered.instruction, source: answered.source };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it.each(marked(REVIEW))('tells an agent to review %s', (path) => {
      // ARRANGE
      const expected = REVIEW;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it.each(marked(FIX_FILE))('tells an agent to repair %s', (path) => {
      // ARRANGE
      const expected = FIX_FILE;
      // ACT
      const actual = actionFrom(path);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('answers every marked case at once, so a disagreement names them together', () => {
      // ARRANGE
      const expected = Object.fromEntries(assessCases.map((one) => [one.path, one.action]));
      // ACT
      const actual = Object.fromEntries(assessCases.map((one) => [one.path, actionFrom(one.path)]));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three agent actions, so no branch of this suite is vacuous', () => {
      // ARRANGE
      const everyAction = [REVIEW, PROCEED, FIX_FILE];
      // ACT
      const exercised = everyAction.filter((action) => marked(action).length > 0);
      // ASSERT
      expect(exercised).toEqual(everyAction);
    });

    it('states no agent action outside the vocabulary', () => {
      // Closure, not coverage: the marker set proves the SUITE reaches every
      // action, and this proves no case states one the contract does not define.
      // ARRANGE
      const known = [REVIEW, PROCEED, FIX_FILE];
      // ACT
      const unknown = assessCases.map((one) => one.action).filter((action) => !known.includes(action));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('says nothing at all about a file no rule selects', () => {
      // The UNGOVERNED case carries a second marker, and this is what the
      // marker means beyond the action: no rule, no evidence, no sentence.
      //
      // Assessment stays FRONTMATTER-ONLY, deliberately. A name has nothing to
      // assess — there is no `stale_after` in a filename — so this Module
      // carries no `assess:` key at all rather than an inert one.
      // ARRANGE
      const expected = { agentAction: PROCEED, state: 'ungoverned' };
      // ACT
      const actual = assessPath(
        { root: CORPUS_ROOT, path: 'docs/research/vendor/upstream.md' },
        config,
        ASSESSMENT_INSTANT,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
