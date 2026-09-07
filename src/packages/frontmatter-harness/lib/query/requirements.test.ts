// Colocated unit test for projecting a winning rule into a query answer.
//
// The subject is fidelity: the config's own vocabulary, re-exposed verbatim,
// down to which keys the Operator did and did not write.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { requirementsForRule } from './requirements.pure';

const UNKNOWN_KEYS = 'unknownKeys';
const CROSS_FIELD = 'crossField';
const FRONTMATTER = 'frontmatter';
const FIELDS = 'fields';

describe('requirementsForRule', () => {
  describe('success cases', () => {
    it('answers a frontmatter-forbidden rule with nothing else to ask', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'plain',
        intent: 'Plain docs carry no frontmatter',
        path: ['docs/plain/**'],
        frontmatter: 'forbidden',
      };
      const expected = { frontmatter: 'forbidden' };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('sorts fields by address rather than by written order', () => {
      // YAML mapping key order is a serialization detail nothing may depend on,
      // so `fields` is the one computed thing in the answer.
      // ARRANGE
      const rule: FrontmatterRule = {
        ruleId: 'reference',
        intent: 'Reference pages say how far they can be trusted',
        path: ['docs/reference/**/*.md'],
        fields: {
          type: { presence: 'required' },
          draft: { presence: 'forbidden' },
          slug: { pattern: '^[a-z]+$', intent: 'Slugs are lowercase' },
        },
      };
      const expected = ['draft', 'slug', 'type'];
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(FIELDS in actual && actual.fields.map((entry) => entry.field)).toEqual(expected);
    });

    it('carries every constraint flat beside the address, intent verbatim', () => {
      // ARRANGE
      const verbatim = 'Slugs are lowercase words joined by single hyphens';
      const rule: FrontmatterRule = {
        ruleId: 'reference',
        intent: 'rule level',
        path: ['docs/**'],
        fields: { slug: { pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', intent: verbatim } },
      };
      const expected = [{ field: 'slug', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', intent: verbatim }];
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(FIELDS in actual && actual.fields).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('leaves an unwritten unknownKeys absent rather than spelling it allowed', () => {
      // Absent is not `allowed` spelled differently — writing it would put a
      // word in the Operator's mouth.
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'], fields: {} };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(actual).not.toHaveProperty(UNKNOWN_KEYS);
    });

    it('gives a forbidden rule no fields key at all', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'], frontmatter: 'forbidden' };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(actual).not.toHaveProperty(FIELDS);
    });

    it('omits crossField when the rule states no set constraint', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'] };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(actual).not.toHaveProperty(CROSS_FIELD);
    });
  });

  describe('edge cases', () => {
    it('always presents fields, empty when the rule names none', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'] };
      const expected: unknown[] = [];
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(FIELDS in actual && actual.fields).toEqual(expected);
      expect(actual).not.toHaveProperty(FRONTMATTER);
    });

    it('carries only the set constraints the Operator wrote', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'], anyOf: ['a', 'b'] };
      const expected = { anyOf: ['a', 'b'] };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(CROSS_FIELD in actual && actual.crossField).toEqual(expected);
    });

    it('keeps an explicitly written unknownKeys', () => {
      // ARRANGE
      const written = 'forbidden';
      const rule: FrontmatterRule = { ruleId: 'r', intent: 'i', path: ['docs/**'], unknownKeys: 'forbidden' };
      // ACT
      const actual = requirementsForRule(rule);
      // ASSERT
      expect(UNKNOWN_KEYS in actual && actual.unknownKeys).toBe(written);
    });
  });
});
