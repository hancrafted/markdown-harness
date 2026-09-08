// Colocated unit test for the narrowing that replaced the config cast.
//
// The predicate's whole claim is that a section carrying no fault is a section
// of the contract's type, so these tests are about REACH: each failure case
// below is a different tier of the config, and a predicate that missed any one
// of them would hand the loader a type it had not earned.

import { describe, expect, it } from 'vitest';
import { isFrontmatterConfig } from './section-narrowing.pure';

const rule = { ruleId: 'research', intent: 'Research notes cite what they drew on', path: ['docs/**'] };

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
      // union of the two. Accepting only the constraining half would narrow to
      // a type the contract does not declare.
      // ARRANGE
      const section = {
        rules: [
          rule,
          { ruleId: 'plain', intent: 'Plain docs carry none', path: ['docs/plain/**'], frontmatter: 'forbidden' },
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
      const section = { rules: [{ ruleId: 'research', path: ['docs/**'] }] };
      // ACT
      const actual = isFrontmatterConfig(section);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a rule carrying both selectors, which the type makes unrepresentable', () => {
      // `RuleSelector` is a union with `never` on the absent half, so a rule
      // holding both is not assignable however well-formed each half looks.
      // ARRANGE
      const section = { rules: [{ ...rule, fileName: 'log.md' }] };
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

    it('rejects a list-valued key holding a non-string, the shape this narrowing was opened for', () => {
      // The ticket names exactly this: a non-string glob is typed as a string
      // by the contract, so the old assertion carried it to the matcher as
      // something that could never match.
      // ARRANGE
      const section = { rules: [{ ...rule, path: ['docs/**', 3] }] };
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
