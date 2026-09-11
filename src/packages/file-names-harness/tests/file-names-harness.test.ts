// Integration suite for the `file-names` Module, at the grain a caller sees.
//
// NO TMPDIR, and that absence is the point: this Module never opens a file, so
// there is nothing to write to disk and nothing to clean up. Every case below
// is answered from a path string and a config, including cases for files that
// do not exist — which is the situation an agent choosing a name is in.

import { describe, expect, it } from 'vitest';
import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { checkNames } from '../check.ts';
import { queryNames } from '../query.ts';
import { validateFileNamesSection } from '../validate-config.ts';

const CONFIG: MarkdownHarnessConfig = {
  'file-names': {
    rules: [
      {
        ruleId: 'content-block-names',
        intent: 'A content block leads with its category',
        path: ['docs/blocks/**/*.md'],
        excludeFiles: ['**/index.md'],
        file: {
          segments: [
            { name: 'category', allowed: [{ value: 'aikb' }] },
            { name: 'slug', format: 'kebab-case' },
          ],
        },
      },
      {
        ruleId: 'archive-stem-names',
        intent: 'An archived page keeps whatever name it arrived with',
        path: ['docs/archive/**/*.md'],
        file: { maxLength: 12 },
      },
    ],
  },
};

/** The paths this Module found something wrong with. */
function failing(files: readonly string[]): readonly string[] {
  return checkNames(files, CONFIG)
    .filter((one) => one.findings.violations.length > 0)
    .map((one) => one.path);
}

describe('file-names harness', () => {
  describe('success cases', () => {
    it('governs and clears a conforming name', () => {
      // ARRANGE
      const files = ['docs/blocks/aikb__llm-wiki.md'];
      const expected = { governed: ['docs/blocks/aikb__llm-wiki.md'], wrong: [] };
      // ACT
      const actual = { governed: checkNames(files, CONFIG).map((one) => one.path), wrong: failing(files) };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers a query for a file that does not exist', () => {
      // The whole reason this Module matters to `--query`: by the time `--check`
      // can answer, the file already has the wrong name and renaming it is a
      // second commit.
      // ARRANGE
      const expected = 'content-block-names';
      // ACT
      const actual = queryNames('docs/blocks/not-written-yet.md', CONFIG);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('hands the subject back whole, so an agent can construct a conforming name', () => {
      // Flattening `segments:` into a sentence would put a word in the
      // Operator's mouth. The shape an agent reads is the shape an Operator
      // would have to write.
      // ARRANGE
      const expected = ['category', 'slug'];
      // ACT
      const answered = queryNames('docs/blocks/not-written-yet.md', CONFIG);
      const actual = (answered?.requirements.file.segments ?? []).map((segment) => segment.name);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a malformed name at its own segment', () => {
      // ARRANGE
      const files = ['docs/blocks/aikb__Bad_Slug.md'];
      const expected = [{ segment: 'file.slug', violation: 'FILE_NAMES__FORMAT_MISMATCH' }];
      // ACT
      const [outcome] = checkNames(files, CONFIG);
      const actual = outcome.findings.violations.map((one) => ({ segment: one.segment, violation: one.violation }));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('governs nothing when the config declares no naming section', () => {
      // Governance is opt-in. A fresh install reports zero violations against a
      // corpus it has never seen.
      // ARRANGE
      const files = ['docs/blocks/Whatever_Name.md'];
      const expected: string[] = [];
      // ACT
      const actual = checkNames(files, {}).map((one) => one.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a section whose rule carries no subject', () => {
      // ARRANGE
      const section = { rules: [{ ruleId: 'inert', intent: 'Asserts nothing', path: ['docs/**/*.md'] }] };
      const expected = ['CONFIG_EMPTY_CONSTRAINT'];
      // ACT
      const actual = validateFileNamesSection(section).faults.map((fault) => fault.code);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves an excluded file to fall through to whatever claims it next', () => {
      // `excludeFiles` removes a file from ONE rule, never from the list. Here
      // nothing else claims it, so this Module simply has no answer — which is
      // not the same as the file being invisible.
      // ARRANGE
      const unclaimed = undefined;
      const excluded = 'docs/blocks/index.md';
      // ACT
      const answered = queryNames(excluded, CONFIG);
      const checked = checkNames([excluded], CONFIG);
      // ASSERT
      expect(answered).toBe(unclaimed);
      expect(checked).toEqual([]);
    });

    it('normalises a decorated path before matching and reports the normalised one', () => {
      // ARRANGE
      const expected = ['docs/blocks/aikb__Bad_Slug.md'];
      // ACT
      const actual = failing(['./docs/blocks/aikb__Bad_Slug.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads `__` as ordinary characters under a rule that declares no segments', () => {
      // The decision that scopes the delimiter, at the grain a caller sees.
      // `legacy__x` is 9 characters and the rule asks only for 12 or fewer.
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = failing(['docs/archive/legacy__x.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the corpus order it was given rather than sorting', () => {
      // ARRANGE
      const files = ['docs/blocks/zz__last.md', 'docs/blocks/aa__first.md'];
      const expected = ['docs/blocks/zz__last.md', 'docs/blocks/aa__first.md'];
      // ACT
      const actual = checkNames(files, CONFIG).map((one) => one.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
