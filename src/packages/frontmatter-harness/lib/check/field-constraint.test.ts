// Colocated unit test for evaluating one field's constraints.
//
// Uses `toStrictEqual` throughout the failure cases on purpose: `toEqual`
// treats an explicit `value: undefined` as equal to an absent `value` key, and
// the difference between those two is contract here — absence is the key's
// omission, so that `null` keeps its literal meaning.

import { describe, expect, it } from 'vitest';
import { fieldViolations } from './field-constraint.pure';

describe('field constraints', () => {
  describe('success cases', () => {
    it('reports nothing for a value that satisfies every constraint', () => {
      // ARRANGE
      const constraints = { presence: 'required', maxLength: 200 } as const;
      const data = { description: 'A reference page.' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('description', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing for an absent field that was only ever optional', () => {
      // ARRANGE
      const constraints = { presence: 'optional' } as const;
      const data = { id: 'okf' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('usage_count', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing for a value inside the allowed set', () => {
      // ARRANGE
      const constraints = { allowed: [{ value: 'draft' }, { value: 'stable' }] };
      const data = { status: 'stable' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('status', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing for an optional field written empty under string constraints', () => {
      // The presence tier owns emptiness. An optional field left blank reports no
      // violation, and must not collide with constraints naming strings.
      // ARRANGE
      const constraints = { presence: 'optional', maxLength: 200 } as const;
      const data = { description: null };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('description', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('reports nothing for an optional field written empty under list constraints', () => {
      // ARRANGE
      const constraints = { minItems: 1, maxItems: 5 } as const;
      const data = { tags: null };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('tags', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });
  });

  describe('failure cases', () => {
    it('reports a required field that was never written, with no value key', () => {
      // ARRANGE
      const constraints = { presence: 'required' } as const;
      const data = { title: 'No type here' };
      const expected = [{ field: 'type', violation: 'MISSING_REQUIRED_FIELD', requirement: constraints }];
      // ACT
      const actual = fieldViolations('type', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a required field written and blank as empty, not missing', () => {
      // Two mistakes, two repairs, two codes. Collapsed into one, the author of
      // this file would be told to add a key they can see is already present.
      // ARRANGE
      const constraints = { presence: 'required' } as const;
      const data = { type: null };
      const expected = [{ field: 'type', value: null, violation: 'EMPTY_REQUIRED_FIELD', requirement: constraints }];
      // ACT
      const actual = fieldViolations('type', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a required field written empty under string constraints once, as empty', () => {
      // Emptiness belongs to presence alone: no second report for `CONSTRAINT_SHAPE_MISMATCH`.
      // ARRANGE
      const constraints = { presence: 'required', maxLength: 200 } as const;
      const data = { description: null };
      const expected = [
        { field: 'description', value: null, violation: 'EMPTY_REQUIRED_FIELD', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('description', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a required field written empty under list constraints once, as empty', () => {
      // ARRANGE
      const constraints = { presence: 'required', minItems: 1 } as const;
      const data = { tags: null };
      const expected = [{ field: 'tags', value: null, violation: 'EMPTY_REQUIRED_FIELD', requirement: constraints }];
      // ACT
      const actual = fieldViolations('tags', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a forbidden field that is present, because the fix is deletion', () => {
      // ARRANGE
      const constraints = { presence: 'forbidden', intent: 'Reference material ships finished' } as const;
      const data = { draft: true };
      const expected = [
        { field: 'draft', value: true, violation: 'FORBIDDEN_FIELD_PRESENT', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('draft', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a value outside the allowed set', () => {
      // ARRANGE
      const constraints = { allowed: [{ value: 'draft' }, { value: 'stable' }] };
      const data = { status: 'retired' };
      const expected = [
        { field: 'status', value: 'retired', violation: 'VALUE_NOT_ALLOWED', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('status', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a malformed named format', () => {
      // ARRANGE
      const constraints = { format: 'actor' } as const;
      const data = { generated: { by: 'human/hancrafted' } };
      const expected = [
        { field: 'generated.by', value: 'human/hancrafted', violation: 'FORMAT_MISMATCH', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('generated.by', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a pattern mismatch carrying the mandatory intent', () => {
      // The whole reason the sibling intent is mandatory: the regex alone tells
      // an agent to satisfy a regex, and the intent tells it what the repo wants.
      // ARRANGE
      const constraints = {
        pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
        intent: 'Slugs are lowercase words joined by single hyphens',
      } as const;
      const data = { slug: 'Legacy_Reference' };
      const expected = [
        { field: 'slug', value: 'Legacy_Reference', violation: 'PATTERN_MISMATCH', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('slug', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports the two string-length bounds as opposite codes', () => {
      // Separate codes rather than one range violation, because the repairs are
      // opposite and an agent should not have to compare value against bound.
      // ARRANGE
      const constraints = { minLength: 3, maxLength: 8 } as const;
      const short = [{ field: 'title', value: 'ci', violation: 'VALUE_TOO_SHORT', requirement: constraints }];
      const long = [
        { field: 'title', value: 'a much longer title', violation: 'VALUE_TOO_LONG', requirement: constraints },
      ];
      // ACT
      const tooShort = fieldViolations('title', constraints, { title: 'ci' });
      const tooLong = fieldViolations('title', constraints, { title: 'a much longer title' });
      // ASSERT
      expect(tooShort).toStrictEqual(short);
      expect(tooLong).toStrictEqual(long);
    });

    it('reports the two entry-count bounds as opposite codes, with the count as evidence', () => {
      // ARRANGE
      const constraints = { minItems: 2, maxItems: 3 } as const;
      const few = [{ field: 'tags', value: { items: 1 }, violation: 'TOO_FEW_ITEMS', requirement: constraints }];
      const many = [{ field: 'tags', value: { items: 4 }, violation: 'TOO_MANY_ITEMS', requirement: constraints }];
      // ACT
      const tooFew = fieldViolations('tags', constraints, { tags: ['a'] });
      const tooMany = fieldViolations('tags', constraints, { tags: ['a', 'b', 'c', 'd'] });
      // ASSERT
      expect(tooFew).toStrictEqual(few);
      expect(tooMany).toStrictEqual(many);
    });

    it('reports an overlong entry at its own indexed address', () => {
      // ARRANGE
      const constraints = { itemMaxLength: 5 } as const;
      const data = { tags: ['okf', 'far-too-long'] };
      const expected = [
        { field: 'tags[1]', value: 'far-too-long', violation: 'ITEM_TOO_LONG', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('tags', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports nothing at all for an absent field carrying only size constraints', () => {
      // `presence` is the only key that may make a field mandatory. A `minItems`
      // that fired on absence would quietly turn every size constraint into
      // `required`.
      // ARRANGE
      const constraints = { minItems: 1, maxItems: 5, itemMaxLength: 20 } as const;
      const data = { type: 'research' };
      const clean: readonly unknown[] = [];
      // ACT
      const actual = fieldViolations('tags', constraints, data);
      // ASSERT
      expect(actual).toEqual(clean);
    });

    it('collides once when three list constraints meet a string', () => {
      // The Operator's mistake, not the author's, and the one file in the kit
      // corpus that is. Three collided constraints at one address are ONE
      // finding: the violation carries the whole fragment verbatim, so
      // reporting it three times would print the same fragment three times.
      // ARRANGE
      const constraints = { minItems: 1, maxItems: 5, itemMaxLength: 20 } as const;
      const data = { tags: 'okf, provenance, frontmatter' };
      const expected = [
        {
          field: 'tags',
          value: 'okf, provenance, frontmatter',
          violation: 'CONSTRAINT_SHAPE_MISMATCH',
          requirement: constraints,
        },
      ];
      // ACT
      const actual = fieldViolations('tags', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('never reports a length violation on a list', () => {
      // An agent told `VALUE_TOO_LONG` on a list would shorten it by characters.
      // ARRANGE
      const constraints = { maxLength: 3 } as const;
      const data = { title: ['a', 'b', 'c', 'd'] };
      const expected = [
        { field: 'title', value: { items: 4 }, violation: 'CONSTRAINT_SHAPE_MISMATCH', requirement: constraints },
      ];
      // ACT
      const actual = fieldViolations('title', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports an entry address over a non-list once, at the address as written', () => {
      // Not silence, and no per-entry violations: the config asked a question
      // the data cannot answer.
      //
      // `value` is absent although `sources` itself is present, which is the
      // point of pinning it here: the reported address is `sources[].id`, and
      // nothing is at it. Reporting the container's `'text'` under this field
      // would claim `sources[].id` holds it.
      // ARRANGE
      const constraints = { presence: 'required' } as const;
      const data = { sources: 'text' };
      const expected = [{ field: 'sources[].id', violation: 'CONSTRAINT_SHAPE_MISMATCH', requirement: constraints }];
      // ACT
      const actual = fieldViolations('sources[].id', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports a per-entry format failure at the concrete index only', () => {
      // ARRANGE
      const constraints = { presence: 'required', format: 'uri' } as const;
      const data = { sources: [{ resource: 'docs/a.md' }, { resource: 'has a space in it' }] };
      const expected = [
        {
          field: 'sources[1].resource',
          value: 'has a space in it',
          violation: 'FORMAT_MISMATCH',
          requirement: constraints,
        },
      ];
      // ACT
      const actual = fieldViolations('sources[].resource', constraints, data);
      // ASSERT
      expect(actual).toStrictEqual(expected);
    });

    it('reports every value constraint a single field breaks', () => {
      // Two failures on one field, which is the point of reporting each value
      // constraint rather than stopping at the first.
      // ARRANGE
      const constraints = { minItems: 1, maxItems: 5, itemMaxLength: 20 } as const;
      const data = {
        tags: ['okf', 'provenance', 'frontmatter', 'governance', 'steering', 'a-tag-far-longer-than-twenty'],
      };
      const expected = ['TOO_MANY_ITEMS', 'ITEM_TOO_LONG'];
      // ACT
      const actual = fieldViolations('tags', constraints, data).map((violation) => violation.violation);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
