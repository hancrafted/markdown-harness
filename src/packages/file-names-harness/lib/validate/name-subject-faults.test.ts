// Colocated unit test for the subject, segment and allowed-set validator.
//
// This is the tier that holds the two decisions a Conformance corpus cannot
// state, because a Conformance config must be VALID: `segments:` is exclusive
// of its siblings, and an `allowed` value may not carry the delimiter. Both are
// refused at LOAD, so the only place they can be exercised is here.

import { describe, expect, it } from 'vitest';
import { subjectFaults } from './name-subject-faults.pure';

const AT = 'file-names.rules[0].file';

/** Every code the subject reports, so a case names outcomes rather than indexes. */
function codesFor(subject: unknown): readonly string[] {
  return subjectFaults(subject, AT).map((fault) => fault.code);
}

describe('file subject faults', () => {
  describe('success cases', () => {
    it('accepts a segmented subject', () => {
      // ARRANGE
      const subject = { segments: [{ name: 'category', allowed: [{ value: 'aikb' }] }, { name: 'slug' }] };
      const expected: string[] = [];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a whole-stem subject carrying the cap a segmented one may not', () => {
      // The narrowing "no whole-name cap COEXISTS WITH segments:" — it reasoned
      // from `segments:` eating its siblings, so it was only ever true of an
      // object carrying one.
      // ARRANGE
      const subject = { minLength: 3, maxLength: 24, format: 'kebab-case' };
      const expected: string[] = [];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a segmented subject carrying an intent beside its segments', () => {
      // `intent` is the ONE sibling `segments:` admits, because `pattern`
      // mandates one and the subject tier has to be able to carry it.
      // ARRANGE
      const subject = { segments: [{ name: 'slug' }], intent: 'Why this shape exists' };
      const expected: string[] = [];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a constraint sitting beside segments', () => {
      // Reported as `CONFIG_INVALID_VALUE` at the offending sibling because that
      // is literally what the contract says: `SegmentedSubject` types every one
      // of those keys as `never`, so any value at all is outside its type.
      // ARRANGE
      const subject = { segments: [{ name: 'slug' }], maxLength: 60 };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.maxLength` }];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an allowed value carrying the fixed delimiter', () => {
      // THE BACKSTOP, and it reaches `allowed[].value` and nothing else. The
      // guard is TOTAL here because the value is a string and single-spelled.
      // An unreachable entry would otherwise fail silently, while
      // `VALUE_NOT_ALLOWED` printed it back to a Contributor as permitted.
      // ARRANGE
      const subject = { allowed: [{ value: 'aikb__llm-wiki' }] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.allowed[0].value` }];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a non-string allowed value', () => {
      // YAML hands a bare `0006` over as a NUMBER, and a numeric value is a
      // closed set that can never match the strings it is compared against.
      // ARRANGE
      const subject = { allowed: [{ value: 6 }] };
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a segment with no name, and one whose name is not kebab-case', () => {
      // The reported address is dotted — `file.slug` — so a name carrying a `.`
      // would be unsplittable by the consumer reading it.
      // ARRANGE
      const missing = { segments: [{ maxLength: 4 }] };
      const dotted = { segments: [{ name: 'the.slug' }] };
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const withoutName = codesFor(missing);
      const withDot = codesFor(dotted);
      // ASSERT
      expect(withoutName).toEqual(expected);
      expect(withDot).toEqual(expected);
    });

    it('refuses a pattern with no sibling intent', () => {
      // Without it the raw regex leaks into the violation message.
      // ARRANGE
      const subject = { pattern: '^[a-z]+$' };
      const expected = [{ code: 'CONFIG_MISSING_PATTERN_INTENT', location: `${AT}.pattern` }];
      // ACT
      const actual = subjectFaults(subject, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a nested segments list', () => {
      // Under a fixed `__` a nested segment has nothing left to split on, so
      // `segments` is absent from a segment's own vocabulary and lands here as
      // an unrecognised key.
      // ARRANGE
      const subject = { segments: [{ name: 'slug', segments: [{ name: 'inner' }] }] };
      const expected = ['CONFIG_UNRECOGNISED_KEY'];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a format outside the named vocabulary', () => {
      // ARRANGE
      const subject = { format: 'datetiem' };
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('refuses a subject that asks for nothing at all', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: AT }];
      // ACT
      const actual = subjectFaults({}, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an empty segments list', () => {
      // Distinguished from an absent one: writing the key and leaving it empty
      // is a half-finished edit rather than the whole-stem shape.
      // ARRANGE
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const actual = codesFor({ segments: [] });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses two segments answering to the same address', () => {
      // ARRANGE
      const subject = { segments: [{ name: 'slug' }, { name: 'slug' }] };
      const expected = ['CONFIG_INVALID_VALUE'];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('accepts a single underscore in an allowed value, because only a doubled one splits', () => {
      // The other half of the backstop. A single `_` is an ordinary character
      // inside a part, and refusing it would make the guard wider than the
      // decision it enforces.
      // ARRANGE
      const subject = { allowed: [{ value: 'acme_corp' }] };
      const expected: string[] = [];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an intent written and left empty', () => {
      // Writing the key and saying nothing is worse than omitting it.
      // ARRANGE
      const subject = { maxLength: 4, intent: '' };
      const expected = ['CONFIG_EMPTY_INTENT'];
      // ACT
      const actual = codesFor(subject);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
