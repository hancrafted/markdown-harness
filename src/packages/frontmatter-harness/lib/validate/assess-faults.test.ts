// Colocated unit test for the `assess:` vocabulary.
//
// This file is where the Module-wide tier is actually exercised. The Conformance
// suite reaches the RULE-level `assess:` block and deliberately does not reach
// the Module-wide one — adopting a Module-wide prompt forces
// `stale_after: { presence: required }` onto every constraining rule in that
// config, which would mean rewriting the whole corpus to satisfy one key.
// ARCH-002 records that as a named exception to its coverage duty and points
// here, so these cases are what makes that pointer true.

import { describe, expect, it } from 'vitest';
import { assessBlockFaults, hasStalePrompt, unfireableAssessFaults } from './assess-faults.pure';

const AT = 'frontmatter.rules[0]';
const BLOCK_AT = 'frontmatter.assess';
const SENTENCE = 'Re-verify this against the source before quoting it.';

/** A Module-wide block carrying a usable prompt. */
const moduleBlock = { stale: SENTENCE };

/** A rule that requires the field the prompt is answered from. */
const requiring = {
  ruleId: 'freshness',
  intent: 'A page that goes out of date says when to stop trusting it',
  path: ['docs/**/*.md'],
  fields: { stale_after: { presence: 'required' } },
};

/** The same rule, requiring nothing — so a prompt reaching it could never fire. */
const silent = { ruleId: 'notes', intent: 'Notes say what they are', path: ['docs/**/*.md'] };

describe('assessBlockFaults', () => {
  describe('success cases', () => {
    it('accepts a block naming the one condition', () => {
      // ARRANGE
      const block = moduleBlock;
      // ACT
      const actual = assessBlockFaults(block, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts an absent block, because the key is optional at both tiers', () => {
      // ARRANGE
      const unwritten = undefined;
      // ACT
      const actual = assessBlockFaults(unwritten, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports a condition the vocabulary does not define, at the key as written', () => {
      // ARRANGE
      const block = { stale: SENTENCE, unverified: 'Nobody has signed this off.' };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: `${BLOCK_AT}.unverified` }];
      // ACT
      const actual = assessBlockFaults(block, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports `assess:` written with nothing after it, which YAML parses as null', () => {
      // ARRANGE
      const written = null;
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: BLOCK_AT }];
      // ACT
      const actual = assessBlockFaults(written, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports a prompt that is present and unusable, once rather than twice', () => {
      // An empty sentence is one mistake and earns one fault. It must not also
      // count as a prompt, or the same key would earn an unrelated second.
      // ARRANGE
      const block = { stale: '' };
      const expected = [{ code: 'CONFIG_INVALID_VALUE', location: `${BLOCK_AT}.stale` }];
      // ACT
      const actual = assessBlockFaults(block, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves an explicitly empty block legal and silent', () => {
      // Under whole-block replacement this is the only way a rule can decline
      // the Module-wide default without the default being deleted for everyone.
      // ARRANGE
      const declining = {};
      // ACT
      const actual = assessBlockFaults(declining, BLOCK_AT);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('does not treat a non-string prompt as a prompt', () => {
      // ARRANGE
      const block = { stale: ['a sentence in a list'] };
      const expected = false;
      // ACT
      const actual = hasStalePrompt(block);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('unfireableAssessFaults', () => {
  describe('success cases', () => {
    it('accepts a rule that requires the field its own prompt is answered from', () => {
      // ARRANGE
      const rule = { ...requiring, assess: { stale: SENTENCE } };
      const noModuleBlock = undefined;
      // ACT
      const actual = unfireableAssessFaults(rule, AT, noModuleBlock);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a rule that requires the field when the MODULE carries the prompt', () => {
      // THE MODULE-WIDE TIER. The rule wrote no block of its own, so the
      // Module's prompt reaches it — and this rule can answer it.
      // ARRANGE
      const rule = requiring;
      // ACT
      const actual = unfireableAssessFaults(rule, AT, moduleBlock);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports a Module-wide prompt reaching a rule that could never fire it', () => {
      // This is what makes a Module-wide default expensive to adopt: it forces
      // the discipline onto every constraining rule, and an Operator is better
      // told at validation than left with a sentence that stays silent forever.
      // ARRANGE
      const rule = silent;
      const expected = [{ code: 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD', location: AT }];
      // ACT
      const actual = unfireableAssessFaults(rule, AT, moduleBlock);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it("reports a rule's own prompt that could never fire", () => {
      // ARRANGE
      const rule = { ...silent, assess: { stale: SENTENCE } };
      const noModuleBlock = undefined;
      const expected = [{ code: 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD', location: AT }];
      // ACT
      const actual = unfireableAssessFaults(rule, AT, noModuleBlock);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not accept `presence: optional`, which is the accidental case', () => {
      // ARRANGE
      const rule = { ...silent, fields: { stale_after: { presence: 'optional' } } };
      const expected = [{ code: 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD', location: AT }];
      // ACT
      const actual = unfireableAssessFaults(rule, AT, moduleBlock);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exempts a frontmatter-forbidden rule, which has no field to require', () => {
      // ARRANGE
      const rule = {
        ruleId: 'index-files',
        intent: 'An index carries no frontmatter',
        fileName: 'index.md',
        frontmatter: 'forbidden',
      };
      // ACT
      const actual = unfireableAssessFaults(rule, AT, moduleBlock);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('lets an empty rule block decline a Module default that would otherwise be unfireable', () => {
      // Whole-block replacement, seen from the fault's side: the rule declines
      // the Module prompt, so there is no prompt to be unfireable.
      // ARRANGE
      const rule = { ...silent, assess: {} };
      // ACT
      const actual = unfireableAssessFaults(rule, AT, moduleBlock);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
