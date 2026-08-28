// Coverage tests for the Conformance suite's config, under `fixtures/conformance/`.
//
// These do not test the harness — no reader, resolver or check command exists
// yet. They assert that the Conformance suite is still a COMPLETE test surface:
// every key in the config vocabulary is exercised somewhere, and the config
// obeys the config-validity rules a real validator will later enforce. When the
// vocabulary grows, this fails until the suite grows with it.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { AllowedValue, FieldConstraints, Format } from './constraints';
import type { MarkdownHarnessConfig } from './contract';

const CONFIG_URL = new URL('../../fixtures/conformance/valid-test-config.yaml', import.meta.url);
const config = parse(readFileSync(CONFIG_URL, 'utf8')) as MarkdownHarnessConfig;
const rules = config.frontmatter?.rules ?? [];

/** Every key a rule may carry. Grows only by deliberate amendment. */
const RULE_KEYS = [
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
const NON_PAYLOAD_KEYS: readonly string[] = ['path', 'fileName', 'excludeFiles', 'intent', 'frontmatter'];
const PAYLOAD_KEYS = RULE_KEYS.filter((key) => !NON_PAYLOAD_KEYS.includes(key));

const FORMATS: Format[] = ['datetime', 'uri', 'actor'];

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

describe('valid-test-config.yaml is a complete test surface', () => {
  describe('happy path', () => {
    it('parses into exactly one module section', () => {
      // ARRANGE
      const expected = ['frontmatter'];
      // ACT
      const actual = Object.keys(config);
      // ASSERT
      expect(actual).toEqual(expected);
      expect(rules.length).toBeGreaterThan(0);
    });

    it.each(RULE_KEYS)('exercises the rule key %s', (key) => {
      // ARRANGE
      const seen = everyRuleKey();
      // ACT
      const isExercised = seen.has(key);
      // ASSERT
      expect(isExercised).toBe(true);
    });

    it.each(CONSTRAINT_KEYS)('exercises the constraint %s', (key) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const isExercised = constraints.some((constraint) => key in constraint);
      // ASSERT
      expect(isExercised).toBe(true);
    });

    it.each(FORMATS)('exercises the named format %s', (format) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const isExercised = constraints.some((constraint) => constraint.format === format);
      // ASSERT
      expect(isExercised).toBe(true);
    });
  });

  describe('sad path', () => {
    it('carries no rule key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = RULE_KEYS;
      // ACT
      const unknown = [...everyRuleKey()].filter((key) => !known.includes(key));
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
  });

  describe('edge cases', () => {
    it('reaches both nesting depths', () => {
      // ARRANGE
      const addresses = everyFieldAddress();
      // ACT
      const reachesListEntries = addresses.some((address) => address.includes('[].'));
      const reachesMappingKeys = addresses.some((a) => a.includes('.') && !a.includes('[]'));
      // ASSERT
      expect(reachesListEntries).toBe(true);
      expect(reachesMappingKeys).toBe(true);
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
  });
});

describe('valid-test-config.yaml obeys the config-validity rules', () => {
  describe('happy path', () => {
    it('gives every rule exactly one selector', () => {
      // ARRANGE
      const selectorKeys = ['path', 'fileName'];
      // ACT
      const counts = rules.map((rule) => selectorKeys.filter((key) => key in rule).length);
      // ASSERT
      for (const count of counts) expect(count).toBe(1);
    });

    it('gives every rule an intent', () => {
      // ARRANGE
      const intents = rules.map((rule) => rule.intent);
      // ACT
      const missing = intents.filter((intent) => !intent);
      // ASSERT
      expect(missing).toEqual([]);
    });

    it('gives every pattern a sibling intent', () => {
      // ARRANGE
      const patterned = everyConstraint().filter((constraint) => 'pattern' in constraint);
      // ACT
      const missing = patterned.filter((constraint) => !constraint.intent);
      // ASSERT
      expect(missing).toEqual([]);
    });
  });

  describe('sad path', () => {
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
      const carriers = [...everyConstraint(), ...everyAllowedValue()].filter((carrier) => 'intent' in carrier);
      // ACT
      const empty = carriers.filter((carrier) => !carrier.intent);
      // ASSERT
      expect(empty).toEqual([]);
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
      const declaresCeiling = rules.some((rule) => retiredKey in rule);
      const vocabulary = new Set(
        (rules.flatMap((rule) => rule.fields?.type?.allowed ?? []) as AllowedValue[]).map((entry) => entry.value),
      );
      // ASSERT
      expect(declaresCeiling).toBe(false);
      expect(vocabulary.size).toBeGreaterThan(1);
    });
  });
});
