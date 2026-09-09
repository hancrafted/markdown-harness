// Colocated unit test for which `assess:` block answers.
//
// The edge cases are the whole point of this file: whole-block replacement and
// a per-key merge behave identically while one condition ships, so what is
// asserted here is the REPLACEMENT reading — a rule's own block answers alone,
// and an empty one answers with nothing.

import { describe, expect, it } from 'vitest';
import type { AssessConditions, FrontmatterRule } from '../../../config-contract/index.ts';
import { effectivePrompt } from './assess-prompt.pure';

const MODULE_SENTENCE = 'This file is past its freshness date. Tell the user and offer to re-verify it.';
const RULE_SENTENCE = 'Re-verify by web research before quoting this.';

const moduleBlock: AssessConditions = { stale: MODULE_SENTENCE };

/** A rule with no `assess:` block of its own. */
const bare: FrontmatterRule = { ruleId: 'research', intent: 'Research is indexed', path: ['docs/research/**'] };

/** The same rule, answering for itself. */
const speaking: FrontmatterRule = { ...bare, assess: { stale: RULE_SENTENCE } };

describe('effectivePrompt', () => {
  describe('success cases', () => {
    it("takes the rule's own sentence, and names the rule as its source", () => {
      // ARRANGE
      const expected = { prompt: RULE_SENTENCE, source: 'rule' };
      // ACT
      const actual = effectivePrompt(speaking, moduleBlock);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('falls back to the Module-wide sentence, and names the module as its source', () => {
      // ARRANGE
      const expected = { prompt: MODULE_SENTENCE, source: 'module' };
      // ACT
      const actual = effectivePrompt(bare, moduleBlock);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers with nothing when no block was written at all', () => {
      // ARRANGE
      const noModuleBlock = undefined;
      // ACT
      const actual = effectivePrompt(bare, noModuleBlock);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('answers with nothing when the sentence was written empty', () => {
      // ARRANGE
      const emptied: AssessConditions = { stale: '' };
      // ACT
      const actual = effectivePrompt(bare, emptied);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('replaces the Module block whole, so an empty rule block declines the default', () => {
      // The replacement reading, stated. Under a per-key merge this would
      // inherit the Module's sentence, which is exactly the silent
      // reactivation whole-block replacement exists to prevent.
      // ARRANGE
      const declining = { ...bare, assess: {} } as FrontmatterRule;
      // ACT
      const actual = effectivePrompt(declining, moduleBlock);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});
