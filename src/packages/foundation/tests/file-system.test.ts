// Integration test for foundation filesystem gate: tri-state, memoisation, containment, and ELOOP.

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listMarkdownFiles } from '../list-markdown-files.ts';
import { readFile, resetReadCache } from '../read-file.ts';

let root = '';
let outsideDir = '';
let outsideFile = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'foundation-fs-'));
  outsideDir = mkdtempSync(join(tmpdir(), 'foundation-fs-outside-'));

  outsideFile = join(outsideDir, 'secret.md');
  writeFileSync(outsideFile, 'secret outside');

  mkdirSync(join(root, 'docs', 'nested'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
  mkdirSync(join(root, '.git'), { recursive: true });

  writeFileSync(join(root, 'README.md'), '# Readme');
  writeFileSync(join(root, 'docs', 'a.md'), '# Doc A');
  writeFileSync(join(root, 'docs', 'nested', 'b.md'), '# Doc B');
  writeFileSync(join(root, 'notes.txt'), 'text file');
  writeFileSync(join(root, '.hidden.md'), 'hidden');
  writeFileSync(join(root, 'node_modules', 'pkg', 'ignored.md'), 'ignored');

  symlinkSync(join(root, 'docs', 'a.md'), join(root, 'LINK.md'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outsideDir, { recursive: true, force: true });
});

describe('foundation file-system gate', () => {
  describe('success cases', () => {
    it('reads existing file as text and memoises the outcome', () => {
      // ARRANGE
      resetReadCache();
      const path = join(root, 'README.md');
      const expected = { kind: 'text', text: '# Readme' };
      // ACT
      const first = readFile(path);
      const second = readFile(path);
      // ASSERT
      expect(first).toEqual(expected);
      expect(second).toBe(first);
    });

    it('collects internal corpus members including valid internal symlinks', () => {
      // ARRANGE
      const expected = ['LINK.md', 'README.md', 'docs/a.md', 'docs/nested/b.md'];
      // ACT
      const files = listMarkdownFiles(root);
      // ASSERT
      expect(files).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers absent for a non-existent path and memoises failure', () => {
      // ARRANGE
      resetReadCache();
      const missing = join(root, 'does-not-exist.md');
      const expected = { kind: 'absent' };
      // ACT
      const first = readFile(missing);
      const second = readFile(missing);
      // ASSERT
      expect(first).toEqual(expected);
      expect(second).toBe(first);
    });

    it('answers unreadable when reading a directory', () => {
      // ARRANGE
      const dirPath = join(root, 'docs');
      const expected = { kind: 'unreadable' };
      // ACT
      const outcome = readFile(dirPath);
      // ASSERT
      expect(outcome).toEqual(expected);
    });

    it('refuses the tree when a symlink escapes the corpus root', () => {
      // ARRANGE
      const badTree = mkdtempSync(join(tmpdir(), 'foundation-bad-symlink-'));
      writeFileSync(join(badTree, 'doc.md'), '# Doc');
      symlinkSync(outsideFile, join(badTree, 'escape.md'));
      // ACT
      const result = listMarkdownFiles(badTree);
      rmSync(badTree, { recursive: true, force: true });
      // ASSERT
      expect(result).toBeUndefined();
    });

    it('catches ELOOP cycles and refuses the tree instead of crashing', () => {
      // ARRANGE
      const loopTree = mkdtempSync(join(tmpdir(), 'foundation-eloop-'));
      const loopA = join(loopTree, 'loopA.md');
      const loopB = join(loopTree, 'loopB.md');
      symlinkSync(loopB, loopA);
      symlinkSync(loopA, loopB);
      // ACT
      const result = listMarkdownFiles(loopTree);
      rmSync(loopTree, { recursive: true, force: true });
      // ASSERT
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('clears memoised cache when resetReadCache is called', () => {
      // ARRANGE
      const path = join(root, 'README.md');
      const first = readFile(path);
      // ACT
      resetReadCache();
      const second = readFile(path);
      // ASSERT
      expect(first).toEqual(second);
      expect(second).not.toBe(first);
    });

    it('ignores dotfiles and node_modules during tree walk', () => {
      // ARRANGE
      const hiddenFile = '.hidden.md';
      const nmDir = 'node_modules';
      // ACT
      const files = listMarkdownFiles(root) ?? [];
      const hidden = files.includes(hiddenFile);
      const nm = files.some((f) => f.includes(nmDir));
      // ASSERT
      expect(hidden).toBe(false);
      expect(nm).toBe(false);
    });
  });
});
