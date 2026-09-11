// The config faults this Module owns — and the two it deliberately does not.

import { describe, expect, it } from 'vitest';
import { indexesSectionFaults, isIndexesConfig } from './indexes-section.pure.ts';

describe('indexesSectionFaults', () => {
  describe('success cases', () => {
    it('accepts a section carrying every key the vocabulary defines', () => {
      // ARRANGE
      const section = {
        descriptionSource: 'index.md',
        directories: { './': null, 'docs/': { descriptionSource: 'AGENTS.md', excludeFiles: ['docs/draft-*.md'] } },
      };
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual([]);
      expect(isIndexesConfig(section)).toBe(true);
    });

    it('accepts an absent section, because governance is opt-in', () => {
      // A config naming no Module governs nothing, and this Module is opt-in on
      // top of the frontmatter one rather than required beside it.
      // ARRANGE
      const absent = undefined;
      // ACT
      const actual = indexesSectionFaults(absent);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('rejects a directory key written without its trailing slash', () => {
      // The slash is what makes YAML's TEXTUAL key uniqueness semantic: without
      // it, `docs/research/` and `docs/research` are two keys for one directory
      // and the whole protection leaks.
      // ARRANGE
      const section = { directories: { 'docs/research': null } };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: "indexes.directories['docs/research']" }];
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an empty directories mapping, on the empty-rule-list precedent', () => {
      // A Module named and then asked to do nothing is a mistake, not an inert
      // Module — the same judgement `rules: []` already gets.
      // ARRANGE
      const section = { directories: {} };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'indexes.directories' }];
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a key the vocabulary does not define, at either tier', () => {
      // Both tiers, because a key in the wrong half must be a reportable error
      // rather than a silent no-op. `depth:`, `heading:` and `titleSource:`
      // were each proposed and declined, so each lands here.
      // ARRANGE
      const section = { directories: { 'docs/': { heading: 'Research' } }, depth: 2 };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'indexes.depth' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: "indexes.directories['docs/'].heading" },
      ];
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('accepts a bare key, which parses to null and means every default', () => {
      // Four characters for "publish here, with every default" is the whole
      // reason the mapping is spellable at all.
      // ARRANGE
      const section = { directories: { 'docs/': null } };
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('rejects a section that is not a mapping at all', () => {
      // A list would otherwise pass a bare object check and fail much later,
      // with a fault naming a key rather than the section.
      // ARRANGE
      const section = ['docs/'];
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: 'indexes' }];
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects settings whose values are the wrong type, one fault each', () => {
      // A config fails WHOLE: every reason is carried at once rather than one
      // per re-run.
      // ARRANGE
      const section = { directories: { 'docs/': { descriptionSource: 1, excludeFiles: 'docs/*' } } };
      const expected = [
        { code: 'CONFIG_INVALID_VALUE', location: "indexes.directories['docs/'].descriptionSource" },
        { code: 'CONFIG_INVALID_VALUE', location: "indexes.directories['docs/'].excludeFiles" },
      ];
      // ACT
      const actual = indexesSectionFaults(section);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
