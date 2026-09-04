// Coverage tests for the Conformance suite's config, under `fixtures/conformance/`.
//
// These do not test `markdown-harness` — no reader, resolver or check command
// exists yet. They assert that the Conformance suite is still a COMPLETE test
// surface: every key in the config vocabulary is exercised somewhere, and the
// config obeys the config-validity rules a real validator will later enforce.
// When the vocabulary grows, this fails until the suite grows with it.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { AllowedValue, FieldConstraints, Format, MarkdownHarnessConfig } from '../../config-contract/index.ts';

const CONFIG_URL = new URL('../../../../fixtures/conformance/valid-test-config.yaml', import.meta.url);
const config = parse(readFileSync(CONFIG_URL, 'utf8')) as MarkdownHarnessConfig;
const rules = config.frontmatter?.rules ?? [];

/** Every key a rule may carry. Grows only by deliberate amendment. */
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
  describe('success cases', () => {
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

    it.each(FORMATS)('exercises the named format %s', (format) => {
      // ARRANGE
      const constraints = everyConstraint();
      // ACT
      const seen = constraints.flatMap((constraint) => constraint.format ?? []);
      // ASSERT
      expect(seen).toContain(format);
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

    it('gives every pattern a sibling intent', () => {
      // ARRANGE
      const patterned = everyConstraint().filter((constraint) => 'pattern' in constraint);
      // ACT
      const missing = patterned.filter((constraint) => !constraint.intent);
      // ASSERT
      expect(missing).toEqual([]);
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
      const ceilingCarriers = rules.filter((rule) => retiredKey in rule).map((rule) => rule.intent);
      const vocabulary = new Set(
        (rules.flatMap((rule) => rule.fields?.type?.allowed ?? []) as AllowedValue[]).map((entry) => entry.value),
      );
      // ASSERT
      expect(ceilingCarriers).toEqual([]);
      expect(vocabulary.size).toBeGreaterThan(1);
    });
  });
});
