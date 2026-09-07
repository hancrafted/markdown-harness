// Integration suite for `--check`, at the grain a caller sees.
//
// Exercises the entry point against real files in a tmpdir, which is what makes
// the read edge observable: the pure units above it can be handed text, but only
// this level can show that a governed file is opened and an invisible one is not.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { checkCorpus } from '../check.ts';

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

describe('checkCorpus', () => {
  describe('success cases', () => {
    it('reports the governed file that has a violation', () => {
      // ARRANGE
      const files = ['docs/typed.md', 'docs/untyped.md'];
      const expected = { governedFiles: 2, invalidFiles: 1, totalViolations: 1 };
      const reported = ['docs/untyped.md'];
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual?.summary).toEqual(expected);
      expect(actual?.files.map((file) => file.path)).toEqual(reported);
    });

    it('reports a conforming corpus as governed and clean', () => {
      // ARRANGE
      const files = ['docs/typed.md'];
      const expected = { summary: { governedFiles: 1, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses the whole corpus when a governed file cannot be read', () => {
      // A governed file the report would have to be silent about makes an
      // incomplete verdict look like a clean one, so there is no partial answer.
      // ARRANGE
      const files = ['docs/typed.md', 'docs/phantom.md'];
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('governs nothing when the config holds no rules at all', () => {
      // ARRANGE
      const files = ['docs/untyped.md'];
      const expected = { summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const actual = checkCorpus(root, files, {});
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('never opens a file no rule selects', () => {
      // `ungoverned.md` is a directory, so reading it would throw and the whole
      // corpus would be refused. A result coming back at all is the proof that
      // nothing read it.
      // ARRANGE
      const files = ['docs/typed.md', 'ungoverned.md'];
      const expected = { governedFiles: 1, invalidFiles: 0, totalViolations: 0 };
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual?.summary).toEqual(expected);
    });

    it('reports paths in the shape the walker uses, not the shape it was handed', () => {
      // ARRANGE
      const files = ['./docs/untyped.md'];
      const expected = ['docs/untyped.md'];
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual?.files.map((file) => file.path)).toEqual(expected);
    });

    it('keeps the order it was given rather than sorting', () => {
      // ARRANGE
      const files = ['docs/untyped.md', 'docs/typed.md', 'docs/untyped.md'];
      const expected = ['docs/untyped.md', 'docs/untyped.md'];
      // ACT
      const actual = checkCorpus(root, files, CONFIG);
      // ASSERT
      expect(actual?.files.map((file) => file.path)).toEqual(expected);
    });
  });
});
