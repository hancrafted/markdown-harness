// Colocated unit test for validating one field constraint.
//
// The location string is the config's own notation, so every assertion names
// the address an Operator would use to find the fault.

import { describe, expect, it } from 'vitest';
import { constraintFaults } from './constraint-faults.pure';

const AT = 'frontmatter.rules[0].fields.slug';

describe('constraintFaults', () => {
  describe('success cases', () => {
    it('accepts a constraint stating something', () => {
      // ARRANGE
      const constraint = { presence: 'required', minLength: 3 };
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a pattern carrying its mandatory sibling intent', () => {
      // ARRANGE
      const constraint = { pattern: '^[a-z]+$', intent: 'Slugs are lowercase' };
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('rejects a constraint object stating nothing', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_EMPTY_CONSTRAINT', location: AT }];
      // ACT
      const actual = constraintFaults({}, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a pattern with no sibling intent', () => {
      // Without it the raw regex leaks into the message, which is the whole
      // failure `intent` exists to prevent.
      // ARRANGE
      const constraint = { pattern: '^[a-z]+$' };
      const expected = [{ code: 'CONFIG_MISSING_PATTERN_INTENT', location: AT }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a pattern that will not compile as a regex', () => {
      // ARRANGE
      const constraint = { pattern: '^[a-z', intent: 'unclosed class' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.pattern` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a key an allowed entry does not define', () => {
      // The shape an unquoted YAML flow scalar produces: `intent: A, B.` splits
      // on the comma, truncating the intent and leaving the tail as a null key.
      // Without this check the truncation is invisible and the Operator's
      // sentence is silently halved.
      // ARRANGE
      const constraint = {
        allowed: [{ value: 'log', intent: 'The update history of a scope', 'newest first.': null }],
      };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.allowed[0].newest first.` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an allowed entry carrying no value', () => {
      // ARRANGE
      const constraint = { allowed: [{ intent: 'why' }] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.allowed[0].value` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a key the constraint vocabulary does not define', () => {
      // ARRANGE
      const constraint = { presence: 'required', maxLenght: 3 };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.maxLenght` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('rejects an intent written and left empty', () => {
      // A written-and-blank intent is worse than an absent one: it passes a
      // presence check while steering nothing.
      // ARRANGE
      const constraint = { presence: 'required', intent: '' };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an empty intent on an allowed entry', () => {
      // ARRANGE
      const constraint = { allowed: [{ value: 'reference', intent: '' }] };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.allowed[0].intent` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects an allowed list that is not a list', () => {
      // ARRANGE
      const constraint = { allowed: 'reference' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.allowed` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a bare string where an allowed record belongs', () => {
      // ARRANGE
      const constraint = { allowed: ['reference'] };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${AT}.allowed[0]` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a blank pattern intent under one code, not two', () => {
      // §3.5 gives each condition exactly one code. `MISSING_PATTERN_INTENT`
      // means the sibling key is ABSENT; a key written and left blank is
      // `EMPTY_INTENT` and nothing else. Deciding this by truthiness rather
      // than presence reports one authoring mistake under two codes, one of
      // them wrong — and `intent: ""` beside a pattern is an ordinary slip.
      // ARRANGE
      const constraint = { pattern: '^[a-z]+$', intent: '' };
      const expected = [{ code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` }];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects a constraint that is not a mapping at all', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: AT }];
      // ACT
      const actual = constraintFaults('required', AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every fault in one constraint rather than the first', () => {
      // ARRANGE
      const constraint = { nope: 1, intent: '' };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: `${AT}.nope` },
        { code: 'CONFIG_EMPTY_INTENT', location: `${AT}.intent` },
      ];
      // ACT
      const actual = constraintFaults(constraint, AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
