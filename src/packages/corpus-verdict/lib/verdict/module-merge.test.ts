// Colocated unit test for the one place that knows a corpus has two Modules.
//
// The arithmetic here is the arithmetic no Module could do for itself, so these
// cases are all about the JOIN: which files merge, in what order, and what the
// union count means.

import { describe, expect, it } from 'vitest';
import type { FieldViolation, ModuleFindings, SegmentViolation } from '../../../response-contract/index.ts';
import { checkResultFrom } from './module-merge.pure';

/** A frontmatter block with `count` findings, hand-built so the shape is visible. */
function frontmatter(count: number): ModuleFindings {
  return {
    module: 'frontmatter',
    ruleId: 'docs',
    ruleIntent: 'Everything under docs/ says what it is',
    violations: Array.from({ length: count }, (): FieldViolation => ({
      field: 'type',
      violation: 'MISSING_REQUIRED_FIELD',
      requirement: { presence: 'required' },
    })),
  };
}

/** A naming block with `count` findings. */
function names(count: number): ModuleFindings {
  return {
    module: 'file-names',
    ruleId: 'doc-names',
    ruleIntent: 'A doc is named for its subject',
    violations: Array.from({ length: count }, (): SegmentViolation => ({
      segment: 'file',
      value: 'Bad_Name',
      violation: 'FILE_NAMES__FORMAT_MISMATCH',
      requirement: { declared: { format: 'kebab-case' } },
    })),
  };
}

describe('module merge', () => {
  describe('success cases', () => {
    it('merges two Modules reporting on one file into one entry', () => {
      // ONE ENTRY PER FILE STILL. The consumer's question is "what is wrong with
      // this file", and an envelope split by Module would make them join two
      // lists to answer it.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(1) },
        { path: 'docs/a.md', findings: names(1) },
      ];
      const expected = ['frontmatter', 'file-names'];
      // ACT
      const result = checkResultFrom(corpus, outcomes);
      // ASSERT
      expect(result.files).toHaveLength(1);
      expect(result.files[0].modules.map((block) => block.module)).toEqual(expected);
    });

    it('keeps the Modules in the order they were concatenated, not the order they reported', () => {
      // The caller concatenates in the order `MarkdownHarnessConfig` declares its
      // keys, so two adopters' reports cannot differ merely because they typed
      // their configs in a different order.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(1) },
        { path: 'docs/a.md', findings: names(1) },
      ];
      const expected = ['frontmatter', 'file-names'];
      // ACT
      const actual = checkResultFrom(corpus, outcomes).files[0].modules.map((block) => block.module);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts a file governed by both Modules ONCE', () => {
      // `governedFiles` is the UNION of paths, not the sum of per-Module tallies.
      // Summing would double-count every cross-Module file and make the
      // denominator meaningless.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(0) },
        { path: 'docs/a.md', findings: names(0) },
      ];
      const governed = 1;
      // ACT
      const actual = checkResultFrom(corpus, outcomes).summary.governedFiles;
      // ASSERT
      expect(actual).toBe(governed);
    });
  });

  describe('failure cases', () => {
    it('drops a Module that governed the file and found nothing', () => {
      // `--check` lists only Modules WITH FINDINGS. A satisfied Module is absent
      // for the same reason a conforming file is absent from `files`.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(0) },
        { path: 'docs/a.md', findings: names(2) },
      ];
      const expected = ['file-names'];
      // ACT
      const actual = checkResultFrom(corpus, outcomes).files[0].modules.map((block) => block.module);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts a governed file that every Module was satisfied by, and does not list it', () => {
      // The pair that makes the denominator honest: counted, not reported.
      // ARRANGE
      const corpus = ['docs/a.md', 'docs/b.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(0) },
        { path: 'docs/b.md', findings: frontmatter(1) },
      ];
      const expected = { governedFiles: 2, invalidFiles: 1, totalViolations: 1 };
      // ACT
      const actual = checkResultFrom(corpus, outcomes).summary;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('sums violations across Modules rather than counting blocks', () => {
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [
        { path: 'docs/a.md', findings: frontmatter(3) },
        { path: 'docs/a.md', findings: names(2) },
      ];
      const total = 5;
      // ACT
      const actual = checkResultFrom(corpus, outcomes).summary.totalViolations;
      // ASSERT
      expect(actual).toBe(total);
    });
  });

  describe('edge cases', () => {
    it('lists files in walker order rather than the order Modules answered', () => {
      // The naming Module answers the whole corpus after the frontmatter Module
      // has, so a naive concatenation would group by Module instead of by file.
      // ARRANGE
      const corpus = ['docs/a.md', 'docs/b.md', 'docs/c.md'];
      const outcomes = [
        { path: 'docs/c.md', findings: frontmatter(1) },
        { path: 'docs/a.md', findings: names(1) },
      ];
      const expected = ['docs/a.md', 'docs/c.md'];
      // ACT
      const actual = checkResultFrom(corpus, outcomes).files.map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('normalises the corpus order so a decorated path still finds its findings', () => {
      // Without this, a caller passing `./docs/a.md` would list findings under a
      // path the Modules spelled differently — and the file would silently
      // vanish from the report. A clean-looking report is the one failure this
      // tool must never produce.
      // ARRANGE
      const corpus = ['./docs/a.md'];
      const outcomes = [{ path: 'docs/a.md', findings: frontmatter(1) }];
      const expected = ['docs/a.md'];
      // ACT
      const actual = checkResultFrom(corpus, outcomes).files.map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('appends a finding whose path is not in the corpus rather than dropping it', () => {
      // The straggler branch. Dropping would be a VACUOUS GREEN: a Module whose
      // paths were spelled differently would contribute nothing and the report
      // would look clean for the one reason a report must never look clean.
      // ARRANGE
      const corpus = ['docs/a.md'];
      const outcomes = [{ path: 'docs/elsewhere.md', findings: names(1) }];
      const expected = ['docs/elsewhere.md'];
      // ACT
      const actual = checkResultFrom(corpus, outcomes).files.map((file) => file.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports an empty corpus as nothing governed and nothing wrong', () => {
      // ARRANGE
      const expected = { summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = checkResultFrom([], []);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
