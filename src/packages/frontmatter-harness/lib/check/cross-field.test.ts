// Colocated unit test for the three set constraints.
//
// `exactlyOneOf` is the one that earns two codes, and the pair of tests for it
// is the reason: satisfying none and satisfying both want OPPOSITE repairs, and
// a consumer holding one code for both would have to count the satisfied set to
// work out which way to move.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { crossFieldViolations } from './cross-field.pure';

const SKILLS = { ruleId: 'skills', intent: 'A skill is addressed by exactly one of its two names' };

describe('cross-field constraints', () => {
  describe('success cases', () => {
    it('reports nothing when exactly one of the set is satisfied', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/skills/**/SKILL.md'], exactlyOneOf: ['name', 'title'] };
      const data = { type: 'skill', name: 'writing' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing when one arm of anyOf carries the set', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/research/**/*.md'], anyOf: ['sources', 'generated'] };
      const data = { sources: [{ id: 'only' }] };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing for a rule that names no set at all', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...SKILLS,
        path: ['docs/plain/**/*.md'],
        fields: { type: { presence: 'required' } },
      };
      const data = { type: 'plain' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });
  });

  describe('failure cases', () => {
    it('reports an empty satisfied set for exactlyOneOf as none present', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/skills/**/SKILL.md'], exactlyOneOf: ['name', 'title'] };
      const data = { type: 'skill', description: 'A skill that never says what it is called.' };
      const expected = [
        {
          field: null,
          satisfied: [],
          violation: 'EXACTLY_ONE_OF_NONE_PRESENT',
          requirement: { exactlyOneOf: ['name', 'title'] },
        },
      ];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a doubly satisfied exactlyOneOf as multiple present', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/skills/**/SKILL.md'], exactlyOneOf: ['name', 'title'] };
      const data = { type: 'skill', name: 'legacy', title: 'Legacy' };
      const expected = [
        {
          field: null,
          satisfied: ['name', 'title'],
          violation: 'EXACTLY_ONE_OF_MULTIPLE_PRESENT',
          requirement: { exactlyOneOf: ['name', 'title'] },
        },
      ];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports an unsatisfied anyOf with the empty set it found', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/research/**/*.md'], anyOf: ['sources', 'generated'] };
      const data = { type: 'research', description: 'Research that says where nothing came from.' };
      const expected = [
        {
          field: null,
          satisfied: [],
          violation: 'ANY_OF_UNSATISFIED',
          requirement: { anyOf: ['sources', 'generated'] },
        },
      ];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a partly satisfied allOf, so the repair is a subtraction', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/workflows/**/*.md'], allOf: ['title', 'description'] };
      const data = { type: 'workflow', title: 'Publish the package' };
      const expected = [
        {
          field: null,
          satisfied: ['title'],
          violation: 'ALL_OF_UNSATISFIED',
          requirement: { allOf: ['title', 'description'] },
        },
      ];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not let a written-and-blank value satisfy a set', () => {
      // One definition of "empty" in this tool, not two: the same emptiness
      // `presence: required` uses and `EMPTY_REQUIRED_FIELD` reports.
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/workflows/**/*.md'], allOf: ['title', 'description'] };
      const data = { title: 'A title', description: '' };
      const expected = ['title'];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual[0].satisfied).toEqual(expected);
    });

    it('reports the three sets in the order the response declares them', () => {
      // ARRANGE
      const rule: FrontmatterRule = {
        ...SKILLS,
        path: ['docs/**/*.md'],
        exactlyOneOf: ['a', 'b'],
        anyOf: ['c', 'd'],
        allOf: ['e', 'f'],
      };
      const expected = ['EXACTLY_ONE_OF_NONE_PRESENT', 'ANY_OF_UNSATISFIED', 'ALL_OF_UNSATISFIED'];
      // ACT
      const actual = crossFieldViolations(rule, {}).map((found) => found.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts a nested address in a set by the same emptiness rule', () => {
      // ARRANGE
      const rule: FrontmatterRule = { ...SKILLS, path: ['docs/**/*.md'], anyOf: ['generated.by', 'sources'] };
      const data = { generated: { by: 'claude-opus/5' } };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = crossFieldViolations(rule, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });
  });
});
