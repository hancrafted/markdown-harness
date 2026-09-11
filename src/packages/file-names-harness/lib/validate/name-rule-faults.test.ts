// Colocated unit test for this Module's section and rule validator.
//
// Everything here is a config an Operator could plausibly write and this Module
// must refuse. The Conformance config cannot hold any of it, because a
// Conformance config must be valid — so this file is the only place these
// refusals exist.

import { describe, expect, it } from 'vitest';
import { sectionFaults } from './name-rule-faults.pure';

const SOUND = {
  ruleId: 'content-block-names',
  intent: 'A content block leads with its category',
  path: ['docs/blocks/**/*.md'],
  file: { format: 'kebab-case' },
};

/** Every code the section reports, so a case names outcomes rather than indexes. */
function codesFor(section: unknown): readonly string[] {
  return sectionFaults(section).map((fault) => fault.code);
}

describe('file-names section faults', () => {
  describe('success cases', () => {
    it('accepts a sound section', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = sectionFaults({ rules: [SOUND] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('says nothing about an absent section, because governance is opt-in', () => {
      // A repo that never writes this section simply has no naming rules. That
      // is an ordinary repo rather than a misconfigured one, and it is why the
      // "no Module at all" question belongs to the loader instead.
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = sectionFaults(undefined);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a rule carrying excludeFiles', () => {
      // ARRANGE
      const rule = { ...SOUND, excludeFiles: ['**/index.md'] };
      const expected: string[] = [];
      // ACT
      const actual = sectionFaults({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses an empty rule list, which is a half-finished edit', () => {
      // Distinguished from an absent section: writing the section and leaving it
      // empty is almost always an edit someone stopped halfway through.
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_RULE_LIST', location: 'file-names.rules' }];
      // ACT
      const actual = sectionFaults({ rules: [] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the fileName sugar, which this Module deliberately withholds', () => {
      // THE TRAP THIS REFUSAL EXISTS FOR. Selecting by an exact file name while
      // constraining that same name reaches only the files that already satisfy
      // the rule — so every misnamed file falls through unselected and the
      // Module reports nothing at all. Silence that looks like a clean corpus.
      // ARRANGE
      const rule = { ruleId: 'logs', intent: 'Logs are named log', fileName: 'log.md', file: { maxLength: 3 } };
      const expected = ['CONFIG_UNRECOGNISED_KEY', 'CONFIG_SELECTOR_MISSING'];
      // ACT
      const actual = codesFor({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a rule with no selector', () => {
      // ARRANGE
      const rule = { ruleId: 'nameless', intent: 'Selects nothing', file: { maxLength: 3 } };
      const expected = ['CONFIG_SELECTOR_MISSING'];
      // ACT
      const actual = codesFor({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a rule with no file subject, which is its whole payload', () => {
      // ARRANGE
      const rule = { ruleId: 'inert', intent: 'Asserts nothing', path: ['docs/**/*.md'] };
      const expected = ['CONFIG_EMPTY_CONSTRAINT'];
      // ACT
      const actual = codesFor({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a rule with no intent', () => {
      // ARRANGE
      const rule = { ruleId: 'silent', path: ['docs/**/*.md'], file: { maxLength: 3 } };
      const expected = ['CONFIG_MISSING_RULE_INTENT'];
      // ACT
      const actual = codesFor({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('points a duplicate ruleId at the LATER occurrence', () => {
      // The first rule to claim a name is not the mistake, and reporting it
      // there would send the Operator to edit the rule they meant to keep.
      // ARRANGE
      const expected = [{ code: 'CONFIG_DUPLICATE_RULE_ID', location: 'file-names.rules[1].ruleId' }];
      // ACT
      const actual = sectionFaults({ rules: [SOUND, { ...SOUND }] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a section key outside the vocabulary', () => {
      // No Module-wide default block has earned a place here yet. The growth
      // rule PERMITS one; it does not require one.
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'file-names.assess' }];
      // ACT
      const actual = sectionFaults({ rules: [SOUND], assess: { stale: 'Rename it' } });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports every fault at once rather than stopping at the first', () => {
      // A config fails WHOLE. An Operator fixing one fault per run is an
      // Operator who stops running the tool.
      // ARRANGE
      const broken = { ruleId: '', path: [], file: {} };
      const atLeast = 3;
      // ACT
      const actual = codesFor({ rules: [broken] });
      // ASSERT
      expect(actual.length).toBeGreaterThanOrEqual(atLeast);
    });

    it('locates a fault by its full path through the section', () => {
      // The location is what an Operator greps for, so it names the key rather
      // than the rule's ordinal alone.
      // ARRANGE
      const rule = { ...SOUND, file: { segments: [{ name: 'slug', pattern: '^x$' }] } };
      const expected = ['file-names.rules[0].file.segments[0].pattern'];
      // ACT
      const actual = sectionFaults({ rules: [rule] }).map((fault) => fault.location);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a section that is not a mapping at all', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'file-names' }];
      // ACT
      const actual = sectionFaults(['rules']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty glob inside an otherwise sound selector', () => {
      // ARRANGE
      const rule = { ...SOUND, path: [''] };
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const actual = codesFor({ rules: [rule] });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
