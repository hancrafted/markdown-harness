// Integration suite for the walker, through its entry point.
//
// The tree is planted in a tmpdir rather than committed. The kit ships
// `governs-everything-config.yaml` precisely to make the walker observable, but
// planting a `node_modules/` fixture anywhere under `docs/evals/ablation/kit/`
// would change `kit.sha256` and make `preflight.sh` refuse every future mint.
// A tmpdir also lets the suite plant the two things a repository cannot hold
// conveniently: a symlinked directory, and a symlinked document.

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listMarkdownFiles } from '../list-markdown-files.ts';

/** The planted corpus root, and a file to point a bad root at. */
let root = '';
let plainFile = '';

/**
 * Plant one tree holding every case the walker has to answer for: two refused
 * directories, a dot-directory, a non-markdown file, a dotfile, a symlinked
 * directory, and a symlinked document.
 */
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'markdown-file-tree-'));

  mkdirSync(join(root, 'docs', 'nested'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(root, 'empty'), { recursive: true });

  writeFileSync(join(root, 'README.md'), '');
  writeFileSync(join(root, 'notes.txt'), '');
  writeFileSync(join(root, '.hidden.md'), '');
  writeFileSync(join(root, 'docs', 'a.md'), '');
  writeFileSync(join(root, 'docs', 'b.md'), '');
  writeFileSync(join(root, 'docs', 'nested', 'c.md'), '');
  writeFileSync(join(root, 'node_modules', 'pkg', 'readme.md'), '');
  writeFileSync(join(root, '.git', 'x.md'), '');
  writeFileSync(join(root, '.claude', 'y.md'), '');

  symlinkSync(join(root, 'docs'), join(root, 'linked-docs'));
  symlinkSync(join(root, 'docs', 'a.md'), join(root, 'LINK.md'));

  plainFile = join(root, 'README.md');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('listMarkdownFiles', () => {
  describe('success cases', () => {
    it('returns every corpus member, root-relative and lexicographically sorted', () => {
      // ARRANGE
      const corpus = ['LINK.md', 'README.md', 'docs/a.md', 'docs/b.md', 'docs/nested/c.md'];
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).toEqual(corpus);
    });

    it('collects a symlinked document rather than dropping it', () => {
      // A repository that symlinks a document would otherwise have it silently
      // ungoverned, which is a false clean rather than a missing feature.
      // ARRANGE
      const linked = 'LINK.md';
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).toContain(linked);
    });

    it('answers an empty array for a root that holds no markdown', () => {
      // An empty corpus is a real answer, and a different one from a bad root.
      // ARRANGE
      const empty = join(root, 'empty');
      // ACT
      const actual = listMarkdownFiles(empty);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('refuses a root that does not exist, rather than answering empty', () => {
      // This is the answer `--check` must never turn into `invalidFiles: 0`.
      // ARRANGE
      const missing = join(root, 'no-such-directory');
      // ACT
      const actual = listMarkdownFiles(missing);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('refuses a root that is a file rather than a directory', () => {
      // ARRANGE
      const notADirectory = plainFile;
      // ACT
      const actual = listMarkdownFiles(notADirectory);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('refuses node_modules at any depth, which is the refusal no glob makes', () => {
      // ARRANGE
      const buried = 'node_modules/pkg/readme.md';
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).not.toContain(buried);
    });

    it('refuses .git and every other dot-directory', () => {
      // ARRANGE
      const inGit = '.git/x.md';
      const inDotDirectory = '.claude/y.md';
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).not.toContain(inGit);
      expect(actual).not.toContain(inDotDirectory);
    });

    it('does not follow a symlinked directory, so its files are not counted twice', () => {
      // ARRANGE
      const throughLink = 'linked-docs/a.md';
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).not.toContain(throughLink);
    });

    it('leaves a non-markdown file and a dotfile out of the corpus', () => {
      // ARRANGE
      const notMarkdown = 'notes.txt';
      const dotfile = '.hidden.md';
      // ACT
      const actual = listMarkdownFiles(root);
      // ASSERT
      expect(actual).not.toContain(notMarkdown);
      expect(actual).not.toContain(dotfile);
    });
  });
});
