// Colocated unit test for the `body-structure:` section as a whole, walked in
// validation order: section keys, an empty rule list, duplicate ids
// across the whole list, then each Rule in turn.

import { describe, expect, it } from 'vitest';
import { isBodyStructureConfig, sectionFaults } from './section-faults.pure.ts';

const SOUND = {
  ruleId: 'sound',
  folders: ['docs/'],
  intent: 'A sound rule, so the only fault reported is the one below.',
  headings: [{ purpose: 'heading', level: 1 }],
};

describe('sectionFaults', () => {
  describe('success cases', () => {
    it('finds nothing in a sound section, and narrows it to the section type', () => {
      // ARRANGE
      const section = { rules: [SOUND, { ...SOUND, ruleId: 'other', headings: [{ purpose: 'heading', level: 1 }] }] };
      const expected = { faults: [], narrowed: true };
      // ACT
      const actual = { faults: sectionFaults(section), narrowed: isBodyStructureConfig(section) };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a closed Rule with no headings, a closed Rule with headings, and allow beside a maxLevel', () => {
      // ARRANGE
      const base = { ruleId: SOUND.ruleId, folders: SOUND.folders, intent: SOUND.intent };
      const rules = [
        { ...base, ruleId: 'a', undefinedHeadings: 'forbid' },
        { ...base, ruleId: 'b', undefinedHeadings: 'forbid', headings: SOUND.headings },
        { ...base, ruleId: 'c', undefinedHeadings: 'allow', maxLevel: 3 },
        { ...base, ruleId: 'd', undefinedHeadings: 'allow', headings: SOUND.headings },
      ];
      const expected: readonly unknown[] = [];
      // ACT
      const actual = sectionFaults({ rules });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an unrecognised section key and an empty rule list', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.not-a-section-key' },
        { code: 'CONFIG_EMPTY_RULE_LIST', location: 'body-structure.rules' },
      ];
      // ACT
      const actual = sectionFaults({ 'not-a-section-key': true, rules: [] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a duplicate id at the later Rule, before any Rule is walked', () => {
      // ARRANGE
      const unexplained = { ruleId: 'sound', folders: ['docs/'], headings: SOUND.headings };
      const expected = [
        { code: 'CONFIG_DUPLICATE_RULE_ID', location: 'body-structure.rules[1].ruleId' },
        { code: 'CONFIG_MISSING_RULE_INTENT', location: 'body-structure.rules[1]' },
      ];
      // ACT
      const actual = sectionFaults({ rules: [SOUND, unexplained] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('walks one Rule in order: keys, id, intent, selector, axes, exclusions, payload, maxLevel, headings', () => {
      // ARRANGE
      const rule = {
        maxDepth: 3,
        ruleId: '',
        intent: '',
        excludeFiles: 'scratch.md',
        maxLevel: 0,
        headings: [{ purpose: 'heading', level: 1, pattern: '' }],
      };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.rules[0].maxDepth' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].ruleId' },
        { code: 'CONFIG_EMPTY_INTENT', location: 'body-structure.rules[0].intent' },
        { code: 'CONFIG_SELECTOR_MISSING', location: 'body-structure.rules[0]' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].excludeFiles' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].maxLevel' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].headings[0].pattern' },
      ];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('puts the exclusion after maxLevel and undefinedHeadings and before headings, beside three other faults', () => {
      // ARRANGE
      const rule = {
        maxDepth: 3,
        ...SOUND,
        maxLevel: 3,
        undefinedHeadings: 'forbid',
        headings: [{ purpose: 'heading', level: 1, pattern: '' }],
      };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.rules[0].maxDepth' },
        { code: 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE', location: 'body-structure.rules[0].maxLevel' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].headings[0].pattern' },
      ];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an invalid undefinedHeadings after an invalid maxLevel and before headings', () => {
      // ARRANGE
      const rule = {
        ...SOUND,
        maxLevel: 0,
        undefinedHeadings: 'forbidden',
        headings: [{ purpose: 'heading', level: 1, pattern: '' }],
      };
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].maxLevel' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].undefinedHeadings' },
        { code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].headings[0].pattern' },
      ];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a Rule that writes neither maxLevel nor headings at the Rule', () => {
      // ARRANGE
      const payloadless = { ruleId: SOUND.ruleId, folders: SOUND.folders, intent: SOUND.intent };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: 'body-structure.rules[0]' }];
      // ACT
      const actual = sectionFaults({ rules: [payloadless] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a section that is not a mapping, and rules that are not a list', () => {
      // ARRANGE
      const expected = [
        [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure' }],
        [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules' }],
        [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0]' }],
      ];
      // ACT
      const actual = [sectionFaults(['rules']), sectionFaults({ rules: 'none' }), sectionFaults({ rules: ['sound'] })];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a Rule intent written with no value as empty, the code the first Module gives it', () => {
      // `intent:` with nothing after it parses to null. That is "written and
      // left blank", not a value of the wrong type, and the
      // reused code keeps the meaning `frontmatter` gives it.
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: 'body-structure.rules[0].intent' }];
      // ACT
      const actual = sectionFaults({ rules: [{ ...SOUND, intent: null }] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty types list, which could never win', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].types' }];
      // ACT
      const actual = sectionFaults({ rules: [{ ...SOUND, types: [] }] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the retired keys by name', () => {
      // ARRANGE
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.rules[0].levels' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.rules[0].headings[0].title' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.rules[0].headings[0].prefix' },
      ];
      // ACT
      const actual = sectionFaults({
        rules: [{ ...SOUND, levels: [], headings: [{ purpose: 'heading', level: 1, title: 'x', prefix: 'y' }] }],
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses allow alone as an empty Rule, since the default written out asks nothing of a body', () => {
      // ARRANGE
      const alone = { ruleId: SOUND.ruleId, folders: SOUND.folders, intent: SOUND.intent, undefinedHeadings: 'allow' };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: 'body-structure.rules[0]' }];
      // ACT
      const actual = sectionFaults({ rules: [alone] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an invalid undefinedHeadings alone once, with no empty-constraint fault beside it', () => {
      // ARRANGE
      const alone = { ruleId: SOUND.ruleId, folders: SOUND.folders, intent: SOUND.intent, undefinedHeadings: 'Forbid' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].undefinedHeadings' }];
      // ACT
      const actual = sectionFaults({ rules: [alone] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps an empty headings list its own fault beside forbid', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: 'body-structure.rules[0].headings' }];
      // ACT
      const actual = sectionFaults({ rules: [{ ...SOUND, undefinedHeadings: 'forbid', headings: [] }] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a section that writes no rules key as an empty rule list', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_RULE_LIST', location: 'body-structure.rules' }];
      // ACT
      const actual = sectionFaults({});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports forbid beside an invalid maxLevel and an over-deep entry as the one invalid maxLevel', () => {
      // ARRANGE
      const rule = { ...SOUND, maxLevel: 9, undefinedHeadings: 'forbid', headings: [{ purpose: 'heading', level: 4 }] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'body-structure.rules[0].maxLevel' }];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses undefinedHeadings written at section level: it is a Rule key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.undefinedHeadings' }];
      // ACT
      const actual = sectionFaults({ undefinedHeadings: 'forbid', rules: [SOUND] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a Rule that writes only a vocabulary: the titles a level may take are a constraint', () => {
      // ARRANGE
      const alone = {
        ruleId: 'v',
        folders: SOUND.folders,
        intent: SOUND.intent,
        vocabulary: [{ level: 3, allowed: ['A'] }],
      };
      const expected: readonly unknown[] = [];
      // ACT
      const actual = sectionFaults({ rules: [alone] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty vocabulary list at the list alone, never also as an empty Rule', () => {
      // ARRANGE
      const alone = { ruleId: 'v', folders: SOUND.folders, intent: SOUND.intent, vocabulary: [] };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: 'body-structure.rules[0].vocabulary' }];
      // ACT
      const actual = sectionFaults({ rules: [alone] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('still calls an allow-only Rule empty, since the default written out asks nothing', () => {
      // ARRANGE
      const alone = { ruleId: 'v', folders: SOUND.folders, intent: SOUND.intent, undefinedHeadings: 'allow' };
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: 'body-structure.rules[0]' }];
      // ACT
      const actual = sectionFaults({ rules: [alone] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('walks vocabulary after the closed-spine exclusion and before headings', () => {
      // ARRANGE
      const rule = {
        ...SOUND,
        undefinedHeadings: 'forbid',
        maxLevel: 2,
        vocabulary: [{ level: 3, allowed: ['A', 'A'] }],
        headings: [{ purpose: 'heading', level: 1, intent: '' }],
      };
      const expected = [
        { code: 'CONFIG_MAX_LEVEL_ON_CLOSED_SPINE', location: 'body-structure.rules[0].maxLevel' },
        { code: 'CONFIG_DUPLICATE_VOCABULARY_TITLE', location: 'body-structure.rules[0].vocabulary[0].allowed[1]' },
        { code: 'CONFIG_EMPTY_INTENT', location: 'body-structure.rules[0].headings[0].intent' },
      ];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses vocabulary written at section level: it is a Rule key', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure.vocabulary' }];
      // ACT
      const actual = sectionFaults({ vocabulary: [], rules: [SOUND] });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
