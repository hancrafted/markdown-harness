// Integration suite for the Core's one-read-one-parse corpus reader, through
// its entry point. Every case plants a real tree (ARCH-003 Decision 1.2) under
// a root of its own, because the read memo outlives every case in the suite.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readCorpus } from '../read-corpus.ts';

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'foundation-read-corpus-'));
  mkdirSync(join(root, 'docs', 'a-directory.md'), { recursive: true });
  writeFileSync(join(root, 'docs', 'typed.md'), '---\ntype: research\n---\n# Report\n');
  writeFileSync(join(root, 'docs', 'plain.md'), '# Plain\n');
  writeFileSync(join(root, 'docs', 'open.md'), '---\ntype: research\n\n# Never closed\n');
  writeFileSync(join(root, 'docs', 'broken.md'), '---\ntype: [research\n---\n# Broken\n');
  writeFileSync(join(root, 'docs', 'shared.md'), '---\ntype: shared\n---\nbody\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('the corpus reader', () => {
  describe('success cases', () => {
    it('answers each file parsed, in the order asked', () => {
      // ARRANGE
      const expected = {
        kind: 'read',
        documents: [
          { path: 'docs/plain.md', frontmatter: { kind: 'absent' }, body: '# Plain\n' },
          { path: 'docs/typed.md', frontmatter: { kind: 'mapping', data: { type: 'research' } }, body: '# Report\n' },
        ],
      };
      // ACT
      const actual = readCorpus(root, ['docs/plain.md', 'docs/typed.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers an empty read for no paths', () => {
      // ARRANGE
      const expected = { kind: 'read', documents: [] };
      // ACT
      const actual = readCorpus(root, []);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('keeps a block that never closes and a block that will not parse apart', () => {
      // ARRANGE
      const expected = {
        kind: 'read',
        documents: [
          { path: 'docs/open.md', frontmatter: { kind: 'unterminated' }, body: '' },
          { path: 'docs/broken.md', frontmatter: { kind: 'unparseable' }, body: '# Broken\n' },
        ],
      };
      // ACT
      const actual = readCorpus(root, ['docs/open.md', 'docs/broken.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the first file that will not open, and reads no further', () => {
      // ARRANGE
      const expected = { kind: 'unreadable', path: join(root, 'docs', 'a-directory.md') };
      // ACT
      const actual = readCorpus(root, ['docs/plain.md', 'docs/a-directory.md', 'docs/missing.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats a file that is not there as unreadable, not as an empty document', () => {
      // ARRANGE
      const expected = { kind: 'unreadable', path: join(root, 'docs', 'missing.md') };
      // ACT
      const actual = readCorpus(root, ['docs/missing.md']);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('hands a second asker the very parse the first one got', () => {
      // Two Modules governing one file must not each split and parse it. The
      // parse is observable only by identity: the same mapping object comes back.
      // ARRANGE
      const frontmatterOf = (path: string) => {
        const read = readCorpus(root, [path]);
        return read.kind === 'read' ? read.documents[0]?.frontmatter : undefined;
      };
      const first = frontmatterOf('docs/shared.md');
      // ACT
      const second = frontmatterOf('docs/shared.md');
      // ASSERT
      expect(second).toBe(first);
    });
  });
});
