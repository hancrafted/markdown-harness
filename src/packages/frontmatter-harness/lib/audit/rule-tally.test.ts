// Colocated unit test for the per-rule tallies.
//
// Every expected number below is worked out by hand against the file list and
// the rule list in the same block, because the whole value of `--audit` is that
// a reader can disagree with it.
//
// The matcher is hand-written, as it is for the resolver: what is under test is
// the bookkeeping across rules, not whether the platform agrees about a glob.

import { describe, expect, it } from 'vitest';
import type { FrontmatterRule } from '../../../config-contract/index.ts';
import type { RuleAudit } from '../../../response-contract/index.ts';
import { tallyRules } from './rule-tally.pure';

/**
 * A hand-written stand-in covering the four glob shapes these cases use:
 * `**\/<name>` sugar, a `<dir>/**\/*.md` subtree, a `<dir>/**` prefix, and an
 * exact path.
 */
function matches(glob: string, path: string): boolean {
  if (glob.startsWith('**/')) {
    const tail = glob.slice(3);
    return path === tail || path.endsWith(`/${tail}`);
  }
  if (glob.endsWith('/**/*.md')) {
    return path.startsWith(glob.slice(0, -7)) && path.endsWith('.md');
  }
  if (glob.endsWith('/**')) return path.startsWith(glob.slice(0, -2));
  return glob === path;
}

const indexFiles: FrontmatterRule = {
  ruleId: 'index-files',
  intent: 'An index enumerates a directory',
  fileName: 'index.md',
};

const exemplar: FrontmatterRule = {
  ruleId: 'exemplar',
  intent: 'The exemplar carries full provenance',
  path: ['docs/research/provenance.md'],
};

const research: FrontmatterRule = {
  ruleId: 'research',
  intent: 'Research cites what it drew on',
  path: ['docs/research/**/*.md'],
  excludeFiles: ['docs/research/vendor/**'],
};

const inert: FrontmatterRule = {
  ruleId: 'inert',
  intent: 'A rule whose glob reaches nothing in this corpus',
  path: ['docs/nothing/**/*.md'],
};

const RULES: readonly FrontmatterRule[] = [indexFiles, exemplar, research, inert];

/**
 * The corpus, in walker order.
 *
 * `docs/research/vendor/upstream.md` is reached by `research`'s glob and taken
 * back by its own `excludeFiles`, so it is governed by nothing at all.
 * `docs/plain/notes.md` is reached by no rule.
 */
const FILES: readonly string[] = [
  'docs/plain/notes.md',
  'docs/research/index.md',
  'docs/research/nested/index.md',
  'docs/research/provenance.md',
  'docs/research/survey.md',
  'docs/research/vendor/upstream.md',
];

/** The counts alone, so a table of them reads as a table. */
function countsOf(row: RuleAudit): Record<string, unknown> {
  return {
    ruleId: row.rule.ruleId,
    won: row.won,
    shadowed: row.shadowed,
    shadowedBy: row.shadowedBy,
    excluded: row.excluded,
  };
}

describe('tallyRules', () => {
  describe('success cases', () => {
    it('tallies every rule in config order', () => {
      // `index-files` wins both index files; `exemplar` wins provenance.md;
      // `research` wins only survey.md, is shadowed for the other three it
      // reached, and loses vendor/upstream.md to its own exclude.
      // ARRANGE
      const table = [
        { ruleId: 'index-files', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
        { ruleId: 'exemplar', won: 1, shadowed: 0, shadowedBy: [], excluded: 0 },
        { ruleId: 'research', won: 1, shadowed: 3, shadowedBy: ['index-files', 'exemplar'], excluded: 1 },
        { ruleId: 'inert', won: 0, shadowed: 0, shadowedBy: [], excluded: 0 },
      ];
      // ACT
      const actual = tallyRules(FILES, RULES, matches).map(countsOf);
      // ASSERT
      expect(actual).toEqual(table);
    });

    it('carries each rule id, selector and intent onto its own row', () => {
      // ARRANGE
      const expected = {
        rule: { ruleId: 'index-files', selector: { fileName: 'index.md' }, intent: 'An index enumerates a directory' },
        won: 2,
        shadowed: 0,
        shadowedBy: [],
        excluded: 0,
      };
      // ACT
      const actual = tallyRules(FILES, RULES, matches);
      // ASSERT
      expect(actual[0]).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('still reports a rule that governed nothing, which is the point', () => {
      // A rule that wins no file reports nothing anywhere else, so a glob typo
      // is invisible in exactly the direction a trust tool cannot afford.
      // ARRANGE
      const governedNothing = { ruleId: 'inert', won: 0, shadowed: 0, shadowedBy: [], excluded: 0 };
      // ACT
      const actual = tallyRules(FILES, RULES, matches).map(countsOf);
      // ASSERT
      expect(actual).toContainEqual(governedNothing);
    });

    it('shows an ordering mistake as a rule that won nothing it reached', () => {
      // The broad rule written FIRST takes everything, and the narrow rule
      // below it wins zero files while reporting what shadowed it.
      // ARRANGE
      const broad: FrontmatterRule = { ruleId: 'broad', intent: 'Everything', path: ['docs/**/*.md'] };
      const narrow: FrontmatterRule = { ruleId: 'narrow', intent: 'One file', path: ['docs/a.md'] };
      const reversed = [
        { ruleId: 'broad', won: 1, shadowed: 0, shadowedBy: [], excluded: 0 },
        { ruleId: 'narrow', won: 0, shadowed: 1, shadowedBy: ['broad'], excluded: 0 },
      ];
      // ACT
      const actual = tallyRules(['docs/a.md'], [broad, narrow], matches).map(countsOf);
      // ASSERT
      expect(actual).toEqual(reversed);
    });

    it('counts an excluded file as neither won nor shadowed', () => {
      // ARRANGE
      const onlyExcluded = { ruleId: 'research', won: 0, shadowed: 0, shadowedBy: [], excluded: 1 };
      // ACT
      const actual = tallyRules(['docs/research/vendor/upstream.md'], [research], matches).map(countsOf);
      // ASSERT
      expect(actual).toEqual([onlyExcluded]);
    });
  });

  describe('edge cases', () => {
    it('dedupes shadowedBy rather than naming a winner once per file', () => {
      // `index-files` wins two of the files `research` reached, and must appear
      // once.
      // ARRANGE
      const named = ['index-files', 'exemplar'];
      const researchRow = RULES.findIndex((rule) => rule.ruleId === 'research');
      // ACT
      const actual = tallyRules(FILES, RULES, matches);
      // ASSERT
      expect(actual[researchRow].shadowedBy).toEqual(named);
    });

    it('orders shadowedBy by config position, not by the order files met it', () => {
      // The discriminating case: provenance.md is met FIRST and is won by
      // `exemplar`, the LATER of the two winners. Discovery order would report
      // exemplar first; config order must not.
      // ARRANGE
      const metExemplarFirst = ['docs/research/provenance.md', 'docs/research/index.md'];
      const byConfigPosition = ['index-files', 'exemplar'];
      const researchRow = RULES.findIndex((rule) => rule.ruleId === 'research');
      // ACT
      const actual = tallyRules(metExemplarFirst, RULES, matches);
      // ASSERT
      expect(actual[researchRow].shadowedBy).toEqual(byConfigPosition);
    });

    it('reports a row per rule for an empty corpus', () => {
      // Enumerating nothing is not the same as having no rules, and `--audit`
      // over an empty corpus is how an Operator sees that.
      // ARRANGE
      const noFiles: readonly string[] = [];
      const ruleCount = RULES.length;
      // ACT
      const actual = tallyRules(noFiles, RULES, matches);
      // ASSERT
      expect(actual).toHaveLength(ruleCount);
      expect(actual.map((row) => row.won)).toEqual([0, 0, 0, 0]);
    });

    it('reports no rows at all when the config holds no rules', () => {
      // ARRANGE
      const noRules: readonly FrontmatterRule[] = [];
      // ACT
      const actual = tallyRules(FILES, noRules, matches);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});
