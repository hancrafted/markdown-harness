// Integration suite for the platform gate: entry points only, real files and real
// child processes in a throwaway directory.

import { mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyTree, digestTree, readTextFiles, walkTree, writeExecutable } from '../host-files.ts';
import { runProcess } from '../host-process.ts';

const scratch: string[] = [];
function sandbox(): string {
  const dir = mkdtempSync(join(tmpdir(), 'plat-'));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('host files', () => {
  describe('success cases', () => {
    it('walks a tree without following links, naming a symlink as one', () => {
      // ARRANGE
      const dir = sandbox();
      writeFileSync(join(dir, 'a.txt'), 'a');
      symlinkSync(join(dir, 'a.txt'), join(dir, 'link'));
      const expected = [
        { path: 'a.txt', kind: 'file' },
        { path: 'link', kind: 'symlink' },
      ];
      // ACT
      const actual = walkTree(dir, []);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('copies a tree by content and keeps a symlink a symlink', () => {
      // ARRANGE
      const from = sandbox();
      const to = join(sandbox(), 'out');
      mkdirSync(join(from, 'd'));
      writeFileSync(join(from, 'd', 'x.txt'), 'x');
      symlinkSync('d/x.txt', join(from, 'ln'));
      const expected = [
        { path: 'd', kind: 'dir' },
        { path: 'd/x.txt', kind: 'file' },
        { path: 'ln', kind: 'symlink' },
      ];
      // ACT
      copyTree(from, to);
      // ASSERT
      expect(walkTree(to, [])).toEqual(expected);
    });

    it('writes an executable file the shell can run, creating the directory above it', () => {
      // ARRANGE
      const path = join(sandbox(), 'bin', 'tool');
      const expectedMode = 0o755;
      const permissionBits = 0o777;
      // ACT
      writeExecutable(path, '#!/bin/sh\necho hi\n');
      // ASSERT
      expect(statSync(path).mode & permissionBits).toBe(expectedMode);
    });

    it('digests by content, so an edit changes it and a skipped directory does not', () => {
      // ARRANGE
      const dir = sandbox();
      writeFileSync(join(dir, 'a.txt'), 'one');
      mkdirSync(join(dir, '.git'));
      const before = digestTree(dir, ['.git']);
      // ACT
      writeFileSync(join(dir, '.git', 'noise'), 'changes');
      const withNoise = digestTree(dir, ['.git']);
      writeFileSync(join(dir, 'a.txt'), 'two');
      const edited = digestTree(dir, ['.git']);
      // ASSERT
      expect(withNoise).toEqual(before);
      expect(edited).not.toEqual(before);
    });
  });

  describe('failure cases', () => {
    it('reads no text from a missing root, by throwing, so a sweep cannot pass over nothing', () => {
      // ARRANGE
      const missing = join(sandbox(), 'nowhere');
      // ACT
      const act = () => readTextFiles(missing, []);
      // ASSERT
      expect(act).toThrow();
    });
  });

  describe('edge cases', () => {
    it('hashes a symlink by its target, so retargeting changes the digest', () => {
      // ARRANGE
      const dir = sandbox();
      symlinkSync('one', join(dir, 'ln'));
      const before = digestTree(dir, []);
      rmSync(join(dir, 'ln'));
      symlinkSync('two', join(dir, 'ln'));
      // ACT
      const after = digestTree(dir, []);
      // ASSERT
      expect(after).not.toEqual(before);
    });
  });
});

describe('host process', () => {
  const NODE = process.execPath;

  describe('success cases', () => {
    it('runs a child with only the environment it was given', () => {
      // ARRANGE
      process.env.PARENT_ONLY = 'leak';
      const env = { GIVEN: 'yes' };
      const code =
        'process.stdout.write(Object.keys(process.env).filter((k) => k === "GIVEN" || k === "PARENT_ONLY").join(","))';
      const expected = 'GIVEN';
      // ACT
      const report = runProcess({ command: NODE, args: ['-e', code], cwd: tmpdir(), env, timeoutMs: 10_000 });
      delete process.env.PARENT_ONLY;
      // ASSERT
      expect(report.stdout).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a missing binary as a spawn error, not as an exit status', () => {
      // ARRANGE
      const expected = 'ENOENT';
      // ACT
      const report = runProcess({
        command: '/nonexistent/host-binary',
        args: [],
        cwd: tmpdir(),
        env: {},
        timeoutMs: 5_000,
      });
      // ASSERT
      expect(report.spawnError).toBe(expected);
    });

    it('reports a child that outlives its bound as a timeout', () => {
      // ARRANGE
      const code = 'setTimeout(() => {}, 30000)';
      // ACT
      const report = runProcess({ command: NODE, args: ['-e', code], cwd: tmpdir(), env: {}, timeoutMs: 300 });
      // ASSERT
      expect(report.timedOut).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('hands the child a closed standard input rather than waiting on one', () => {
      // ARRANGE
      const code = 'process.stdin.on("end", () => process.stdout.write("closed")); process.stdin.resume()';
      const expected = 'closed';
      // ACT
      const report = runProcess({ command: NODE, args: ['-e', code], cwd: tmpdir(), env: {}, timeoutMs: 5_000 });
      // ASSERT
      expect(report.stdout).toBe(expected);
    });
  });
});
