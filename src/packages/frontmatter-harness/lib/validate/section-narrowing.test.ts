// Colocated unit test for the narrowing that replaced the config cast.
//
// The predicate's whole claim is that a section carrying no fault is a section
// of the contract's type, so these tests are about REACH: each failure case
// below is a different tier of the config, and a predicate that missed any one
// of them would hand the loader a type it had not earned.

import { describe, expect, it } from 'vitest';
import { isFrontmatterConfig } from './section-narrowing.pure.ts';

const rule = { ruleId: 'research', intent: 'Research notes cite what they drew on', folderTrees: ['docs/'] };

describe('isFrontmatterConfig', () => {
  describe('success cases', () => {
    it('accepts a section the validator finds no fault in', () => {
      // ARRANGE
      const section = { rules: [rule] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('accepts both payload variants, so the union is earned rather than assumed', () => {
      // A rule either forbids frontmatter or constrains it, and the type is a
      // union of the two.
      // ARRANGE
      const section = {
        rules: [
          rule,
          { ruleId: 'plain', intent: 'Plain docs carry none', folderTrees: ['docs/plain/'], frontmatter: 'forbidden' },
        ],
      };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('rejects a section that is not a mapping', () => {
      // ARRANGE
      const section = 'rules';
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a rule list that is not a list', () => {
      // ARRANGE
      const section = { rules: { research: rule } };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a rule missing a key the contract makes mandatory', () => {
      // ARRANGE
      const section = { rules: [{ ruleId: 'research', folderTrees: ['docs/'] }] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a rule carrying wildcards in a selector token', () => {
      // ARRANGE
      const section = { rules: [{ ...rule, folderTrees: ['docs/**'] }] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects an absent section, which names no module at all', () => {
      // ARRANGE
      const section = undefined;
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects an empty rule list, which is a config error and not an inert harness', () => {
      // ARRANGE
      const section = { rules: [] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a list-valued key holding a non-string', () => {
      // ARRANGE
      const section = { rules: [{ ...rule, folderTrees: ['docs/', 3] }] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('reaches the deepest tier, so a bad constraint cannot ride in under a good rule', () => {
      // ARRANGE
      const section = { rules: [{ ...rule, fields: { slug: { presence: 'maybe' } } }] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
