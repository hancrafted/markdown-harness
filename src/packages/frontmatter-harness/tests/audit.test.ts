// Integration suite for `--audit`'s tallies, through the entry point.
//
// The unit suite hands the bookkeeping a matcher it wrote itself; this one runs
// on the platform matcher, so what it adds is whether real globs agree about
// the corpus. The config is built here rather than read from a file: what is
// under test is resolution against paths, and the loader has its own suite.

import { describe, expect, it } from 'vitest';
import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { auditRules } from '../audit.ts';

/**
 * A config shaped like a real one: narrow rules first, broad last, with one
 * rule excluding a vendored subtree and one rule that reaches nothing.
 */
const CONFIG: MarkdownHarnessConfig = {
  frontmatter: {
    rules: [
      { ruleId: 'index-files', intent: 'An index enumerates a directory', fileName: 'index.md' },
      {
        ruleId: 'research',
        intent: 'Research cites what it drew on',
        path: ['docs/research/**/*.md'],
        excludeFiles: ['docs/research/vendor/**'],
      },
      { ruleId: 'everything', intent: 'The catch-all, written last', path: ['docs/**/*.md'] },
      { ruleId: 'inert', intent: 'Reaches nothing in this corpus', path: ['docs/nothing/**/*.md'] },
    ],
  },
};

const CORPUS: readonly string[] = [
  'docs/index.md',
  'docs/plain/notes.md',
  'docs/research/index.md',
  'docs/research/survey.md',
  'docs/research/vendor/upstream.md',
];

/** The counts alone, so a table of them reads as a table. */
function counts(result: {
  rules: readonly {
    rule: { ruleId: string };
    won: number;
    shadowed: number;
    shadowedBy: readonly string[];
    excluded: number;
  }[];
}) {
  return result.rules.map((row) => ({
    ruleId: row.rule.ruleId,
    won: row.won,
    shadowed: row.shadowed,
    shadowedBy: row.shadowedBy,
    excluded: row.excluded,
  }));
}

describe('auditRules', () => {
  describe('success cases', () => {
    it('tallies the corpus against real globs, one row per rule in config order', () => {
      // Worked out by hand. `index-files` wins both index files. `research`
      // wins survey.md, is shadowed once by index-files, and its own exclude
      // removes vendor/upstream.md. `everything` wins the two files left over
      // -- plain/notes.md, and vendor/upstream.md, which fell THROUGH
      // research's exclude to the broader rule, which is the only use exclusion
      // has under first-match.
      // ARRANGE
      const table = [
        { ruleId: 'index-files', won: 2, shadowed: 0, shadowedBy: [], excluded: 0 },
        { ruleId: 'research', won: 1, shadowed: 1, shadowedBy: ['index-files'], excluded: 1 },
        { ruleId: 'everything', won: 2, shadowed: 3, shadowedBy: ['index-files', 'research'], excluded: 0 },
        { ruleId: 'inert', won: 0, shadowed: 0, shadowedBy: [], excluded: 0 },
      ];
      // ACT
      const actual = counts(auditRules(CORPUS, CONFIG));
      // ASSERT
      expect(actual).toEqual(table);
    });

    it('reports a fileName selector as sugar and a path selector as written', () => {
      // ARRANGE
      const sugar = {
        ruleId: 'index-files',
        selector: { fileName: 'index.md' },
        intent: 'An index enumerates a directory',
      };
      const written = {
        ruleId: 'inert',
        selector: { path: ['docs/nothing/**/*.md'] },
        intent: 'Reaches nothing in this corpus',
      };
      // ACT
      const actual = auditRules(CORPUS, CONFIG).rules.map((row) => row.rule);
      // ASSERT
      expect(actual).toContainEqual(sugar);
      expect(actual).toContainEqual(written);
    });
  });

  describe('failure cases', () => {
    it('still reports the rule that reached nothing, and it is the only silent one', () => {
      // ARRANGE
      const governedNothing = { ruleId: 'inert', won: 0, shadowed: 0, shadowedBy: [], excluded: 0 };
      // ACT
      const actual = counts(auditRules(CORPUS, CONFIG)).filter((row) => row.won === 0 && row.shadowed === 0);
      // ASSERT
      expect(actual).toEqual([governedNothing]);
    });

    it('reports no rows for a config that names no module', () => {
      // A config naming no module governs nothing, and says so as an empty
      // table rather than as an error.
      // ARRANGE
      const noModule: MarkdownHarnessConfig = {};
      // ACT
      const actual = auditRules(CORPUS, noModule);
      // ASSERT
      expect(actual.rules).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('keeps every row for an empty corpus, so the rules stay visible', () => {
      // ARRANGE
      const empty: readonly string[] = [];
      const ruleCount = CONFIG.frontmatter?.rules.length;
      const noRuleWon = [0, 0, 0, 0];
      // ACT
      const actual = auditRules(empty, CONFIG);
      // ASSERT
      expect(actual.rules).toHaveLength(ruleCount ?? 0);
      expect(actual.rules.map((row) => row.won)).toEqual(noRuleWon);
    });

    it('normalises a decorated path before resolving it', () => {
      // A caller-written `./` must not change which rule wins, or the same
      // corpus would tally differently depending on how it was spelled.
      // ARRANGE
      const decorated = ['./docs/index.md'];
      const wonByIndexFiles = 1;
      // ACT
      const actual = auditRules(decorated, CONFIG);
      // ASSERT
      expect(actual.rules[0].won).toBe(wonByIndexFiles);
    });

    it('counts a file no rule reached against no rule at all', () => {
      // ARRANGE
      const outsideDocs = ['README.md'];
      const nothingWon = 0;
      // ACT
      const actual = auditRules(outsideDocs, CONFIG);
      // ASSERT
      expect(actual.rules.reduce((sum, row) => sum + row.won, nothingWon)).toBe(nothingWon);
    });
  });
});
