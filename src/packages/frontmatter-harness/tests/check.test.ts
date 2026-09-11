// Integration suite for this Module's half of `--check`, at the grain a caller sees.
//
// Exercises the entry point against real files in a tmpdir, which is what makes
// the read edge observable: the pure units above it can be handed text, but only
// this level can show that a governed file is opened and an invisible one is not.
//
// The COMPOSED report — the union count, the merged per-file blocks, the
// ordering across Modules — is asserted in `corpus-verdict/tests/`, because it
// is that Package's answer and not this one's.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { checkFrontmatterCorpus } from '../check.ts';

/** Governs `docs/`, and deliberately nothing else, so invisibility is testable. */
const CONFIG: MarkdownHarnessConfig = {
  frontmatter: {
    rules: [
      {
        ruleId: 'docs',
        intent: 'Everything under docs/ says what it is',
        path: ['docs/**/*.md'],
        fields: { type: { presence: 'required' } },
      },
    ],
  },
};

/** The paths this Module governed, in the order it answered them. */
function governed(root: string, files: readonly string[], config: MarkdownHarnessConfig): readonly string[] {
  const outcome = checkFrontmatterCorpus(root, files, config);
  return outcome.kind === 'checked' ? outcome.outcomes.map((one) => one.path) : [];
}

/** The paths this Module actually found something wrong with. */
function failing(root: string, files: readonly string[], config: MarkdownHarnessConfig): readonly string[] {
  const outcome = checkFrontmatterCorpus(root, files, config);
  if (outcome.kind !== 'checked') return [];
  return outcome.outcomes.filter((one) => one.findings.violations.length > 0).map((one) => one.path);
}

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mh-check-'));
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'typed.md'), '---\ntype: note\n---\n\n# Fine\n');
  writeFileSync(join(root, 'docs', 'untyped.md'), '---\ntitle: No type here\n---\n');

  // A DIRECTORY carrying a markdown name. Reading it throws `EISDIR` for every
  // user, root included, so it proves invisibility without depending on file
  // permissions the test runner may or may not have.
  mkdirSync(join(root, 'ungoverned.md'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('checkFrontmatterCorpus', () => {
  describe('success cases', () => {
    it('reports the governed file that has a violation', () => {
      // ARRANGE
      const files = ['docs/typed.md', 'docs/untyped.md'];
      const expected = ['docs/untyped.md'];
      // ACT
      const actual = failing(root, files, CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('hands back a conforming governed file too, so the composer can count it', () => {
      // The count `--check` reports is the UNION across Modules, so this Module
      // has to say which files it reached even where it had nothing to report.
      // ARRANGE
      const files = ['docs/typed.md'];
      const reached = ['docs/typed.md'];
      const wrong: string[] = [];
      // ACT
      const actual = { reached: governed(root, files, CONFIG), wrong: failing(root, files, CONFIG) };
      // ASSERT
      expect(actual).toEqual({ reached, wrong });
    });
  });

  describe('failure cases', () => {
    it('refuses the whole corpus when a governed file cannot be read', () => {
      // A governed file the report would have to be silent about makes an
      // incomplete verdict look like a clean one, so there is no partial answer.
      //
      // The refusal CARRIES the path. A bare absence tells the caller only that
      // something failed, and the caller's only channel is a sentence for a
      // human — so the path is the whole of what makes that sentence actionable.
      // ARRANGE
      const files = ['docs/typed.md', 'docs/phantom.md'];
      const refused = join(root, 'docs', 'phantom.md');
      // ACT
      const outcome = checkFrontmatterCorpus(root, files, CONFIG);
      const actual = outcome.kind === 'unreadable' ? outcome.path : undefined;
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('governs nothing when the config holds no rules at all', () => {
      // ARRANGE
      const files = ['docs/untyped.md'];
      const expected: string[] = [];
      // ACT
      const actual = governed(root, files, {});
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('never opens a file no rule selects', () => {
      // `ungoverned.md` is a directory, so reading it would throw and the whole
      // corpus would be refused. An answer coming back at all is the proof that
      // nothing read it.
      // ARRANGE
      const files = ['docs/typed.md', 'ungoverned.md'];
      const expected = ['docs/typed.md'];
      // ACT
      const actual = governed(root, files, CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports paths in the shape the walker uses, not the shape it was handed', () => {
      // ARRANGE
      const files = ['./docs/untyped.md'];
      const expected = ['docs/untyped.md'];
      // ACT
      const actual = failing(root, files, CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps the order it was given rather than sorting', () => {
      // ARRANGE
      const files = ['docs/untyped.md', 'docs/typed.md'];
      const expected = ['docs/untyped.md', 'docs/typed.md'];
      // ACT
      const actual = governed(root, files, CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
