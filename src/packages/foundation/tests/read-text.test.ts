// Integration suite for the gate's reader, through its entry points.
//
// Every case plants a real file. There is no other way to prove this: ARCH-003
// Decision 1.2 forbids `vi.mock` and `vi.spyOn`, and a mocked filesystem would
// prove that the mock was called rather than that a directory answers
// `unreadable` — which is the exact distinction this suite exists to pin.
//
// MEMOISATION IS PROVEN BY CHANGING THE TREE. A memo cannot be observed by
// counting calls without a spy, so it is observed by the only other means
// available: plant, read, CHANGE THE FILE ON DISK, read again, and assert the
// first answer comes back. A reader without a memo returns the new bytes, so
// the assertion fails for exactly the reason it should. The mirror case does
// the same to a failure — read an absent path, create the file, read again —
// which is what proves a failure is cached as well as a success.
//
// Every case therefore reads a path NO OTHER CASE READS, and the whole suite
// plants under one root of its own. Two cases sharing a path would be answered
// from the memo the first one filled.

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readTextAt, readTextIn } from '../read-text.ts';

/** This suite's own root. Unique, because the memo outlives every case in it. */
let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'foundation-read-'));
  mkdirSync(join(root, 'docs'), { recursive: true });

  writeFileSync(join(root, 'docs', 'plain.md'), 'original\n');
  writeFileSync(join(root, 'docs', 'memoised.md'), 'first\n');
  writeFileSync(join(root, 'at-a-location.yaml'), 'key: value\n');
  mkdirSync(join(root, 'docs', 'a-directory.md'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('the gate reader', () => {
  describe('success cases', () => {
    it('answers the bytes of a file inside a tree', () => {
      // ARRANGE
      const expected = { kind: 'text', text: 'original\n' };
      // ACT
      const actual = readTextIn(root, 'docs/plain.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers the bytes of a file named by one location', () => {
      // The config is named by the Operator on the command line, so the gate
      // takes the path as written rather than a root and a relative path.
      // ARRANGE
      const expected = { kind: 'text', text: 'key: value\n' };
      // ACT
      const actual = readTextAt(join(root, 'at-a-location.yaml'));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers absent for a path with nothing at it, rather than throwing', () => {
      // ARRANGE
      const expected = { kind: 'absent', location: join(root, 'docs', 'never-written.md') };
      // ACT
      const actual = readTextIn(root, 'docs/never-written.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers unreadable for a directory standing where a file was expected', () => {
      // NOT absent. Something is demonstrably there, and reporting it missing
      // is the false negative that would collapse the rejected-config tier's
      // not-found case and its unreadable case into one.
      // ARRANGE
      const expected = { kind: 'unreadable', location: join(root, 'docs', 'a-directory.md') };
      // ACT
      const actual = readTextIn(root, 'docs/a-directory.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps its first answer after the file changes on disk', () => {
      // ARRANGE
      const planted = join(root, 'docs', 'memoised.md');
      const expected = { kind: 'text', text: 'first\n' };
      const rewritten = 'second\n';
      // ACT
      const before = readTextIn(root, 'docs/memoised.md');
      writeFileSync(planted, rewritten);
      const after = readTextIn(root, 'docs/memoised.md');
      // ASSERT
      expect(before).toEqual(expected);
      expect(after).toEqual(expected);
    });

    it('keeps its first answer after an absent file is created', () => {
      // The mirror of the case above, and the one that proves a FAILURE is
      // cached too: a second ask about a broken path costs nothing and gives
      // the same answer.
      // ARRANGE
      const planted = join(root, 'docs', 'appears-later.md');
      const expected = { kind: 'absent', location: planted };
      const written = 'now it exists\n';
      // ACT
      const before = readTextIn(root, 'docs/appears-later.md');
      writeFileSync(planted, written);
      const after = readTextIn(root, 'docs/appears-later.md');
      // ASSERT
      expect(before).toEqual(expected);
      expect(after).toEqual(expected);
    });

    it('answers unreadable for a symlink chain that closes on itself', () => {
      // The host raises ELOOP here rather than reporting absence, and an
      // uncaught ELOOP is the stack trace the gate exists to replace.
      // ARRANGE
      const first = join(root, 'docs', 'loop-a.md');
      const second = join(root, 'docs', 'loop-b.md');
      const expected = { kind: 'unreadable', location: first };
      // ACT
      symlinkSync(second, first);
      symlinkSync(first, second);
      const actual = readTextIn(root, 'docs/loop-a.md');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps one answer for host-path spellings that normalise to the same file', () => {
      // ARRANGE
      const planted = join(root, 'docs', 'one-answer.md');
      const equivalent = `${root}/docs/./one-answer.md`;
      const expected = { kind: 'text', text: 'first answer\n' };
      writeFileSync(planted, expected.text);
      // ACT
      const before = readTextAt(planted);
      writeFileSync(planted, 'second answer\n');
      const after = readTextAt(equivalent);
      // ASSERT
      expect(before).toEqual(expected);
      expect(after).toEqual(expected);
    });
  });
});
