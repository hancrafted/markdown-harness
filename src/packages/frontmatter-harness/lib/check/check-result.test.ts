// Colocated unit test for this Module's per-file outcomes.
//
// The arithmetic that used to be asserted here has moved to `corpus-verdict`,
// which is the only tier that can see every Module and therefore the only one
// entitled to a union count. What is left is the part this Module owns: which
// rule won each file, what it found, and that a CONFORMING governed file is
// still handed back — because the composer counts it and can only count what it
// is given.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import { frontmatterOutcomes } from './check-result.pure';

const PLAIN: FrontmatterRule = {
  ruleId: 'plain',
  intent: 'Everything under plain/ still has to say what it is',
  path: ['docs/plain/**/*.md'],
  fields: { type: { presence: 'required' } },
};

const CONFORMING = '---\ntype: plain\n---\n';
const UNTYPED = '---\ntitle: No type here\n---\n';

describe('frontmatter outcomes', () => {
  describe('success cases', () => {
    it('hands back a conforming governed file with no violations', () => {
      // The composer counts this file in `governedFiles` and drops it from the
      // report. Returning only the failures would make a clean governed file
      // and an unclaimed file indistinguishable one tier up, so this is the
      // assertion that keeps the union count honest.
      // ARRANGE
      const sources = [{ path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING }];
      const expected = [{ path: 'docs/plain/notes.md', violations: [] }];
      // ACT
      const actual = frontmatterOutcomes(sources).map((one) => ({
        path: one.path,
        violations: one.findings.violations,
      }));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names its own config key on every block, never its Package name', () => {
      // `frontmatter`, not `frontmatter-harness`. The config key is the word an
      // Operator already wrote and can grep for.
      // ARRANGE
      const sources = [{ path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING }];
      const expected = 'frontmatter';
      // ACT
      const [outcome] = frontmatterOutcomes(sources);
      // ASSERT
      expect(outcome.findings.module).toBe(expected);
    });

    it('carries the winning rule id and its intent on the block', () => {
      // Under first-match every violation in a file comes from the same rule —
      // WITHIN ONE MODULE — so these sit on the block rather than on each
      // violation.
      // ARRANGE
      const sources = [{ path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED }];
      const expected = { ruleId: 'plain', ruleIntent: 'Everything under plain/ still has to say what it is' };
      // ACT
      const [outcome] = frontmatterOutcomes(sources);
      // ASSERT
      expect({ ruleId: outcome.findings.ruleId, ruleIntent: outcome.findings.ruleIntent }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('keeps every governed file, failing or not, in the order given', () => {
      // ARRANGE
      const sources = [
        { path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
        { path: 'docs/plain/empty.md', rule: PLAIN, text: '---\ntype:\n---\n' },
      ];
      const expected = ['docs/plain/untyped.md', 'docs/plain/notes.md', 'docs/plain/empty.md'];
      // ACT
      const actual = frontmatterOutcomes(sources).map((one) => one.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports each file only the violations its own rule found', () => {
      // ARRANGE
      const sources = [
        { path: 'docs/plain/untyped.md', rule: PLAIN, text: UNTYPED },
        { path: 'docs/plain/notes.md', rule: PLAIN, text: CONFORMING },
      ];
      const oneFinding = 1;
      const expected = [oneFinding, 0];
      // ACT
      const actual = frontmatterOutcomes(sources).map((one) => one.findings.violations.length);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('gathers several findings from one file under one block', () => {
      // A file with three findings is one block carrying three, never three
      // blocks — the Module dimension groups by Module, not by violation.
      // ARRANGE
      const reference: FrontmatterRule = {
        ruleId: 'reference',
        intent: 'Reference pages say how far they can be trusted',
        path: ['docs/reference/**/*.md'],
        unknownKeys: 'forbidden',
        fields: {
          status: { allowed: [{ value: 'stable' }] },
          slug: { pattern: '^[a-z]+$', intent: 'lowercase words' },
        },
      };
      const text = '---\nstatus: retired\nslug: Legacy_Reference\nreviewedBy: nobody\n---\n';
      const sources = [{ path: 'docs/reference/legacy.md', rule: reference, text }];
      const findings = 3;
      // ACT
      const outcomes = frontmatterOutcomes(sources);
      // ASSERT
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0].findings.violations).toHaveLength(findings);
    });

    it('reports an empty corpus as no outcomes at all', () => {
      // ARRANGE
      const expected: unknown[] = [];
      // ACT
      const actual = frontmatterOutcomes([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
