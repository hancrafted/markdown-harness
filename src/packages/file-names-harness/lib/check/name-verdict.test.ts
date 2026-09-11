// Colocated unit test for one name's whole verdict.
//
// The tier where the two subject shapes diverge and where the count decision
// lives. The Conformance corpus proves the same rules on real names; this file
// pins the SHAPE of what comes back — the dotted address, the derived roster,
// and the fact that a count failure is reported alone.

import { describe, expect, it } from 'vitest';
import type { FileNameRule } from '../../../config-contract/index.ts';
import { violationsForName } from './name-verdict.pure';

const BLOCKS: FileNameRule = {
  ruleId: 'content-block-names',
  intent: 'A content block leads with its category',
  path: ['docs/blocks/**/*.md'],
  file: {
    segments: [
      { name: 'category', allowed: [{ value: 'aikb' }, { value: 'okf' }] },
      { name: 'slug', minLength: 3, maxLength: 20, format: 'kebab-case' },
    ],
  },
};

const WHOLE: FileNameRule = {
  ruleId: 'plain-stem-names',
  intent: "A plain page's whole name is one readable slug",
  path: ['docs/plain/**/*.md'],
  file: { maxLength: 12, format: 'kebab-case' },
};

describe('name verdict', () => {
  describe('success cases', () => {
    it('reports nothing for a name that satisfies every segment', () => {
      // ARRANGE
      const expected: unknown[] = [];
      // ACT
      const actual = violationsForName('docs/blocks/aikb__llm-wiki.md', BLOCKS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports nothing for a whole stem that satisfies its subject', () => {
      // ARRANGE
      const expected: unknown[] = [];
      // ACT
      const actual = violationsForName('docs/plain/notes.md', WHOLE);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('addresses a part by its declared name, dotted under the subject', () => {
      // `file.slug`, so a returning `folder:` subject inherits the spelling
      // without the address changing shape for anyone already storing one.
      // ARRANGE
      const expected = 'file.slug';
      // ACT
      const [violation] = violationsForName('docs/blocks/aikb__Bad-Slug.md', BLOCKS);
      // ASSERT
      expect(violation.segment).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a short name as too few segments, and nothing else', () => {
      // Reported ALONE. Once the count is wrong there is no alignment between
      // the parts found and the segments declared, so any per-part finding under
      // it would be a guess about which part was meant to be which.
      // ARRANGE
      const expected = [{ segment: 'file', value: 'aikb', violation: 'FILE_NAMES__TOO_FEW_SEGMENTS' }];
      // ACT
      const actual = violationsForName('docs/blocks/aikb.md', BLOCKS).map((one) => ({
        segment: one.segment,
        value: one.value,
        violation: one.violation,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a long name as too many segments', () => {
      // Two codes rather than one, on `exactlyOneOf`'s precedent: the repairs
      // are opposite and an agent should not have to compare two numbers.
      // ARRANGE
      const expected = ['FILE_NAMES__TOO_MANY_SEGMENTS'];
      // ACT
      const actual = violationsForName('docs/blocks/aikb__llm__wiki.md', BLOCKS).map((one) => one.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every failing part rather than stopping at the first', () => {
      // An agent told only about the category would have to run the check again
      // to discover the slug.
      // ARRANGE
      const expected = [
        { segment: 'file.category', violation: 'FILE_NAMES__VALUE_NOT_ALLOWED' },
        { segment: 'file.slug', violation: 'FILE_NAMES__FORMAT_MISMATCH' },
      ];
      // ACT
      const actual = violationsForName('docs/blocks/wiki__Bad_Slug.md', BLOCKS).map((one) => ({
        segment: one.segment,
        violation: one.violation,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('carries the derived roster on a segmented finding', () => {
      // The failing block VERBATIM beside a DERIVED roster of names — the second
      // capped exception in the response. Without the roster, an agent told only
      // that `file.slug` failed cannot see that the name it must produce is
      // `<category>__<slug>`.
      // ARRANGE
      const expected = ['category', 'slug'];
      // ACT
      const [violation] = violationsForName('docs/blocks/aikb__Bad-Slug.md', BLOCKS);
      // ASSERT
      expect(violation.requirement.segments).toEqual(expected);
    });

    it('omits the roster on a whole-stem finding, which is what marks it as one', () => {
      // ARRANGE
      const absent = undefined;
      const subjectAddress = 'file';
      // ACT
      const [violation] = violationsForName('docs/plain/Bad_Name.md', WHOLE);
      // ASSERT
      expect(violation.segment).toBe(subjectAddress);
      expect(violation.requirement.segments).toBe(absent);
    });

    it('reports the failing segment block verbatim, not a reworded copy', () => {
      // ARRANGE
      const expected = { name: 'slug', minLength: 3, maxLength: 20, format: 'kebab-case' };
      // ACT
      const [violation] = violationsForName('docs/blocks/aikb__Bad-Slug.md', BLOCKS);
      // ASSERT
      expect(violation.requirement.declared).toEqual(expected);
    });

    it('judges the stem and never the extension', () => {
      // `maxLength: 12` against `notes.md` measures `notes`, five characters. A
      // checker that measured the basename would count eight and still pass, so
      // the name below is chosen to make the two answers differ.
      // ARRANGE
      const expected: unknown[] = [];
      // ACT
      const actual = violationsForName('docs/plain/exactly12ch.md', WHOLE);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
