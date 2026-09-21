// Integration suite for `--check`, at the grain a caller sees.
//
// Exercises the entry point against real files in a tmpdir, which is what makes
// the read edge observable: the pure units above it can be handed text, but only
// this level can show that a governed file is opened and an invisible one is not.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkCorpus } from '../check.ts';
import type { FrontmatterConfig } from '../section.ts';

/** Governs `docs/` alone, and deliberately nothing else, so invisibility is testable. */
const SECTION: FrontmatterConfig = {
  rules: [
    {
      ruleId: 'docs',
      intent: 'Everything in docs/ says what it is',
      folders: ['docs/'],
      fields: { type: { presence: 'required' } },
    },
  ],
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
      const governed = ['docs/typed.md', 'docs/untyped.md'];
      const reported = ['docs/untyped.md'];
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual?.governed).toEqual(governed);
      expect(actual?.files.map((finding) => finding.path)).toEqual(reported);
    });

    it('reports a conforming corpus as governed and clean', () => {
      // ARRANGE
      const files = ['docs/typed.md'];
      const expected = { governed: ['docs/typed.md'], files: [] };
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual).toEqual(expected);
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
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'unreadable' ? outcome.path : undefined;
      // ASSERT
      expect(actual).toBe(refused);
    });

    it('governs nothing when this Module has no section of its own', () => {
      // Reachable whenever another Module's key carries the config on its own:
      // the loader rejects a config naming no Module at all, so `undefined` here
      // never means "nothing governs" — it means "not this Module".
      // ARRANGE
      const files = ['docs/untyped.md'];
      const noSection = undefined;
      const expected = { governed: [], files: [] };
      // ACT
      const outcome = checkCorpus(root, files, noSection);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
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
      const expected = { governed: ['docs/typed.md'], files: [] };
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports paths in the shape the walker uses, not the shape it was handed', () => {
      // ARRANGE
      const files = ['./docs/untyped.md'];
      const expected = ['docs/untyped.md'];
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual?.files.map((finding) => finding.path)).toEqual(expected);
    });

    it('keeps the order it was given rather than sorting', () => {
      // ARRANGE
      const files = ['docs/untyped.md', 'docs/typed.md', 'docs/untyped.md'];
      const expected = ['docs/untyped.md', 'docs/untyped.md'];
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual?.files.map((finding) => finding.path)).toEqual(expected);
    });
  });
});
