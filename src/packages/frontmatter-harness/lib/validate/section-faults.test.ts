// Colocated unit test for validating the whole `frontmatter:` section.
//
// The duplicate-id case is named on the ticket: the fault points at the LATER
// occurrence, because the first rule to claim a name is not the mistake.

import { describe, expect, it } from 'vitest';
import { sectionFaults } from './section-faults.pure';

const RULES_AT = 'frontmatter.rules';
const one = { ruleId: 'a', intent: 'first', path: ['docs/a.md'] };
const two = { ruleId: 'b', intent: 'second', path: ['docs/b.md'] };

describe('sectionFaults', () => {
  describe('success cases', () => {
    it('accepts a section holding sound rules', () => {
      // ARRANGE
      const section = { rules: [one, two] };
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('rejects an absent section as an empty rule list', () => {
      // Naming a module and governing nothing is a mistake, not a no-op.
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_RULE_LIST', location: RULES_AT }];
      // ACT
      const actual = sectionFaults(undefined);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an empty rule list', () => {
      // ARRANGE
      const section = { rules: [] };
      const expected = [{ code: 'CONFIG_EMPTY_RULE_LIST', location: RULES_AT }];
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('points a duplicate ruleId at the later occurrence', () => {
      // ARRANGE
      const twin = { ruleId: 'a', intent: 'second claim', path: ['docs/b.md'] };
      const section = { rules: [one, twin] };
      const expected = [{ code: 'CONFIG_DUPLICATE_RULE_ID', location: `${RULES_AT}[1].ruleId` }];
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a rules key that is not a list', () => {
      // ARRANGE
      const section = { rules: 'oops' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: RULES_AT }];
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports a key the section vocabulary does not define', () => {
      // ARRANGE
      const section = { rules: [one], ruels: [] };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'frontmatter.ruels' }];
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('addresses each rule by its own index', () => {
      // ARRANGE
      const nameless = { intent: 'i', path: ['docs/c.md'] };
      const section = { rules: [one, two, nameless] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${RULES_AT}[2].ruleId` }];
      // ACT
      const actual = sectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every later twin when an id is claimed three times', () => {
      // ARRANGE
      const second = { ruleId: 'a', intent: 'second', path: ['docs/b.md'] };
      const third = { ruleId: 'a', intent: 'third', path: ['docs/c.md'] };
      const expected = [`${RULES_AT}[1].ruleId`, `${RULES_AT}[2].ruleId`];
      // ACT
      const actual = sectionFaults({ rules: [one, second, third] });
      // ASSERT
      expect(actual.map((fault) => fault.location)).toEqual(expected);
    });

    it('rejects a section that is not a mapping', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'frontmatter' }];
      // ACT
      const actual = sectionFaults('nope');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
