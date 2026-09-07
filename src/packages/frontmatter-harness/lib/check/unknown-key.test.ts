// Colocated unit test for `unknownKeys: forbidden`.
//
// `allowedKeys` is the ONE non-verbatim requirement in any response, so most of
// these tests are about how it is derived: a Contributor cannot be required to
// open the config to learn what was permitted, and an address that reaches into
// a nested shape still permits only its own top-level key.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { unknownKeyViolations } from './unknown-key.pure';

const REFERENCE = { ruleId: 'reference', intent: 'Reference pages are looked up by slug' };

describe('unknown keys', () => {
  describe('success cases', () => {
    it('reports nothing when the rule leaves unknownKeys at its default', () => {
      // Absent means `allowed`: a permissive default is the only one that lets a
      // rule govern one key of a document without inheriting every other key.
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        fields: { type: { presence: 'required' } },
      };
      const data = { type: 'reference', anything: 'else' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing when unknownKeys is written as allowed', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...REFERENCE, path: ['docs/**/*.md'], unknownKeys: 'allowed', fields: {} };
      const data = { whatever: 1 };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing when every key in the file is one the rule names', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        fields: { type: { presence: 'required' }, slug: { presence: 'optional' } },
      };
      const data = { type: 'reference', slug: 'triage-labels' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });
  });

  describe('failure cases', () => {
    it('reports a key the rule does not name, with the permitted set derived', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/reference/**/*.md'],
        unknownKeys: 'forbidden',
        fields: { type: { presence: 'required' }, description: { presence: 'required' } },
      };
      const data = { type: 'reference', description: 'A page.', reviewedBy: 'nobody' };
      const expected = [
        {
          field: 'reviewedBy',
          value: 'nobody',
          violation: 'UNKNOWN_KEY_FORBIDDEN',
          requirement: { unknownKeys: 'forbidden', allowedKeys: ['type', 'description'] },
        },
      ];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports several unknown keys in the frontmatter own key order', () => {
      // Not the config's order and not sorted: the file's own order, so a reader
      // scanning the block top-down meets the findings in the same sequence.
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        fields: { type: { presence: 'required' } },
      };
      const data = { zebra: 1, type: 'reference', apple: 2 };
      const expected = ['zebra', 'apple'];
      // ACT
      const actual = unknownKeyViolations(rule, data).map((found) => found.field);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('permits the top-level key a nested address reaches through', () => {
      // `generated.by` permits `generated`, and nothing deeper: the rule named a
      // key inside it, so the key itself is plainly meant to be there.
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        fields: { 'generated.by': { presence: 'required' }, 'sources[].id': { presence: 'required' } },
      };
      const data = { generated: { by: 'claude-opus/5' }, sources: [{ id: 'spec' }] };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('dedupes the permitted set, keeping the config order', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        fields: {
          sources: { minItems: 1 },
          'sources[].id': { presence: 'required' },
          'sources[].resource': { presence: 'required' },
          type: { presence: 'required' },
        },
      };
      const data = { unexpected: true };
      const expected = ['sources', 'type'];
      // ACT
      const actual = unknownKeyViolations(rule, data)[0].requirement.allowedKeys;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('permits a key a cross-field set names but no field constraint does', () => {
      // A rule that requires a key through `allOf` cannot coherently forbid it
      // as unknown.
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        allOf: ['title', 'description'],
        fields: { type: { presence: 'required' } },
      };
      const data = { type: 'workflow', title: 'A title', description: 'A description' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = unknownKeyViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports a container evidence value by its keys, never their contents', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...REFERENCE,
        path: ['docs/**/*.md'],
        unknownKeys: 'forbidden',
        fields: { type: { presence: 'required' } },
      };
      const data = { type: 'reference', extra: { secret: 'do not print me' } };
      const expected = { keys: ['secret'] };
      // ACT
      const actual = unknownKeyViolations(rule, data)[0].value;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
