// Colocated unit test for the steering answer composed across Modules.
//
// The Modules are named `zulu` and `alpha` in that order throughout, so a
// composition that sorted the blocks or wrote a name as a literal fails here
// rather than at the second Module.

import { describe, expect, it } from 'vitest';
import type { ModuleClaim } from '../../../response-contract/index.ts';
import { pathGovernance } from './path-governance.pure';

/** What a Module asks of the path, kept to one required field throughout. */
const ASKS_FOR_TYPE: ModuleClaim = {
  rule: { ruleId: 'the-rule', intent: 'Everything under docs/ says what it is' },
  requirements: { fields: [{ field: 'type', presence: 'required' }] },
};

/** A second claim, distinguishable from the first by its rule. */
const ASKS_FOR_TITLE: ModuleClaim = {
  rule: { ruleId: 'other-rule', intent: 'Everything under docs/ names itself' },
  requirements: { fields: [{ field: 'title', presence: 'required' }] },
};

describe('pathGovernance', () => {
  describe('success cases', () => {
    it('mirrors the check shape: one requirements block per governing Module, in declared order', () => {
      // ARRANGE
      const path = 'docs/a.md';
      const expected = {
        governance: 'governed',
        path: 'docs/a.md',
        modules: [
          { module: 'zulu', ...ASKS_FOR_TYPE },
          { module: 'alpha', ...ASKS_FOR_TITLE },
        ],
      };
      // ACT
      const actual = pathGovernance(path, [
        { module: 'zulu', answer: [ASKS_FOR_TYPE] },
        { module: 'alpha', answer: [ASKS_FOR_TITLE] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists every governing Module, including one with nothing to complain about', () => {
      // The difference from the checking command, stated as a case. A Module
      // that governs the path belongs in this answer whether or not the file
      // would fail it — the whole point is to be asked BEFORE the file exists.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = ['zulu', 'alpha'];
      // ACT
      const answered = pathGovernance(path, [
        { module: 'zulu', answer: [ASKS_FOR_TYPE] },
        { module: 'alpha', answer: [ASKS_FOR_TITLE] },
      ]);
      const actual = answered.governance === 'governed' ? answered.modules.map((block) => block.module) : undefined;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names one block per candidate when a Module answers with several claims, in the order it gave them', () => {
      // A Module whose winner depends on file content cannot name one Rule
      // before the file exists, so it hands back every candidate (design-ADR
      // 0015 amending 0011), and each becomes a block under that Module's name.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = {
        governance: 'governed',
        path: 'docs/a.md',
        modules: [
          { module: 'zulu', ...ASKS_FOR_TYPE },
          { module: 'alpha', ...ASKS_FOR_TITLE },
          { module: 'alpha', ...ASKS_FOR_TYPE },
        ],
      };
      // ACT
      const actual = pathGovernance(path, [
        { module: 'zulu', answer: [ASKS_FOR_TYPE] },
        { module: 'alpha', answer: [ASKS_FOR_TITLE, ASKS_FOR_TYPE] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers invisible when the only Module asked hands back no candidate at all', () => {
      // An empty candidate list is a Module passing the path by, said the
      // other way, and must not read as governed with no blocks.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = { governance: 'invisible', path: 'docs/a.md' };
      // ACT
      const actual = pathGovernance(path, [{ module: 'alpha', answer: [] }]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers invisible when no Module claims the path', () => {
      // "Invisible" is a claim about the whole config rather than about a null
      // rule: not one declared Module selected this path.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = { governance: 'invisible', path: 'docs/a.md' };
      // ACT
      const actual = pathGovernance(path, [
        { module: 'zulu', answer: [] },
        { module: 'alpha', answer: [] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('answers governed when one Module claims the path and another passes by', () => {
      // One claim is enough. The Module that passed by is absent rather than
      // present and empty: an answer listing it would say the config asks
      // something of the path under a section that never mentioned it.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = { governance: 'governed', path: 'docs/a.md', modules: [{ module: 'alpha', ...ASKS_FOR_TITLE }] };
      // ACT
      const actual = pathGovernance(path, [
        { module: 'zulu', answer: [] },
        { module: 'alpha', answer: [ASKS_FOR_TITLE] },
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers invisible for a path no Module was even asked about', () => {
      // A declared set no config named is not a shape this command can reach —
      // the loader refuses a config naming no Module at all — but the answer is
      // still the honest one rather than a crash.
      // ARRANGE
      const path = 'docs/a.md';
      const expected = { governance: 'invisible', path: 'docs/a.md' };
      // ACT
      const actual = pathGovernance(path, []);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
