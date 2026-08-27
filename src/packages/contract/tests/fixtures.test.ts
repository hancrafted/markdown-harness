// Fixture-integrity tests for `fixtures/`.
//
// These do not test the harness — no reader, resolver or check command exists
// yet. They assert that the fixture is still a COMPLETE test surface: every key
// in the config vocabulary is exercised somewhere, and the fixture obeys the
// config-validity rules a real validator will later enforce. When the
// vocabulary grows, this fails until the fixture grows with it.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { MarkdownHarnessConfig } from '../config.ts';
import type { AllowedValue, FieldConstraints, Format } from '../constraints.ts';

const CONFIG_URL = new URL('../../../../fixtures/valid-test-config.yaml', import.meta.url);
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

const FORMATS: Format[] = ['datetime', 'uri', 'actor'];

function everyRuleKey(): Set<string> {
  const seen = new Set<string>();
  for (const rule of rules) for (const key of Object.keys(rule)) seen.add(key);
  return seen;
}

function everyConstraint(): FieldConstraints[] {
  return rules.flatMap((rule) => Object.values(rule.fields ?? {}));
}

function everyAllowedValue(): AllowedValue[] {
  return everyConstraint().flatMap((constraint) => constraint.allowed ?? []);
}

function everyFieldAddress(): string[] {
  return rules.flatMap((rule) => Object.keys(rule.fields ?? {}));
}

describe('valid-test-config.yaml is a complete test surface', () => {
  it('parses into exactly one module section', () => {
    expect(Object.keys(config)).toEqual(['frontmatter']);
    expect(rules.length).toBeGreaterThan(0);
  });

  it.each(RULE_KEYS)('exercises the rule key %s', (key) => {
    expect(everyRuleKey()).toContain(key);
  });

  it.each(CONSTRAINT_KEYS)('exercises the constraint %s', (key) => {
    expect(everyConstraint().some((c) => key in c)).toBe(true);
  });

  it.each(FORMATS)('exercises the named format %s', (format) => {
    expect(everyConstraint().some((c) => c.format === format)).toBe(true);
  });

  it('reaches both nesting depths', () => {
    const addresses = everyFieldAddress();
    expect(addresses.some((a) => a.includes('[].'))).toBe(true);
    expect(addresses.some((a) => a.includes('.') && !a.includes('[]'))).toBe(true);
  });

  it('addresses a list and its entries separately', () => {
    const addresses = new Set(everyFieldAddress());
    expect(addresses).toContain('sources');
    expect(addresses).toContain('sources[].resource');
  });
});

describe('valid-test-config.yaml obeys the config-validity rules', () => {
  it('gives every rule exactly one selector', () => {
    for (const rule of rules) {
      const selectors = ['path', 'fileName'].filter((k) => k in rule);
      expect(selectors, JSON.stringify(rule.intent)).toHaveLength(1);
    }
  });

  it('gives every rule an intent', () => {
    for (const rule of rules) expect(rule.intent).toBeTruthy();
  });

  it('gives every rule a ruleId, and no two the same', () => {
    // The report refers to a rule by this and never by its index. Rules are
    // ordered and first match wins, so position is semantic — but position is a
    // terrible identity: inserting one rule renumbers every later one, and a
    // stored report's `rules[5]` would name something else next week.
    const ids = rules.map((rule) => rule.ruleId);

    for (const id of ids) expect(id, JSON.stringify(ids)).toBeTruthy();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every pattern a sibling intent', () => {
    for (const constraint of everyConstraint()) {
      if ('pattern' in constraint) expect(constraint.intent).toBeTruthy();
    }
  });

  it('leaves a frontmatter-forbidden rule with no payload', () => {
    for (const rule of rules) {
      if (!('frontmatter' in rule)) continue;
      expect(rule.frontmatter).toBe('forbidden');
      expect(PAYLOAD_KEYS.filter((k) => k in rule)).toEqual([]);
    }
  });

  it('spells every allowed entry as a record, never a bare string', () => {
    for (const entry of everyAllowedValue()) {
      expect(typeof entry, JSON.stringify(entry)).toBe('object');
      expect(entry).toHaveProperty('value');
    }
  });

  it('derives the type vocabulary from the union of allowed values', () => {
    // The Floor is gone: no top-level ceiling and no rule-level `types:`. `type`
    // is an ordinary field, so the repo's vocabulary is implicit rather than
    // declared — derivable for reporting, no longer stated in one place.
    expect(rules.some((rule) => 'types' in rule)).toBe(false);
    const vocabulary = new Set(
      (rules.flatMap((rule) => rule.fields?.type?.allowed ?? []) as AllowedValue[]).map((entry) => entry.value),
    );
    expect(vocabulary.size).toBeGreaterThan(1);
  });

  it('gives every allowed record only the keys an allowed record has', () => {
    // This caught a real defect the moment it was written, and the defect had
    // been in the fixture since the fixture existed. Written as a YAML FLOW
    // mapping, `{ value: draft, intent: Written down, not yet trusted. }` is
    // three entries, not two: an unquoted scalar terminates at the comma, so
    // the intent read `Written down` and `not yet trusted.` became a third key
    // holding null. Five records were silently truncated mid-sentence.
    //
    // Nothing noticed because nothing had ever READ an intent — the other
    // assertions here check that a key is present, never what it holds. A
    // misparsed value in a trust tool is the worst available bug, so the
    // specification asserts its own shape now.
    for (const entry of everyAllowedValue()) {
      expect(Object.keys(entry).sort(), JSON.stringify(entry)).toEqual(
        ['intent', 'value'].filter((key) => key in entry),
      );
    }
  });

  it('rejects an intent that is present but empty', () => {
    for (const carrier of [...everyConstraint(), ...everyAllowedValue()]) {
      if ('intent' in carrier) expect(carrier.intent).toBeTruthy();
    }
  });
});
