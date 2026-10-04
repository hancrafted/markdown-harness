// Integration suite for `--audit`, at the grain a caller sees.
//
// Unlike the first Module's, this audit opens files: whether a Rule writing
// `types` selected a file depends on its `type`. design-ADR 0015 makes a
// candidate that cannot be read refuse the audit at exit 2, as `--check`
// refuses, so this suite proves against real files which ones are candidates.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditRules } from '../audit.ts';
import type { BodyStructureConfig } from '../section.ts';

/** A typed Rule that excludes `scratch.md`, then an untyped Rule under `notes/` alone. */
const SECTION: BodyStructureConfig = {
  rules: [
    {
      ruleId: 'reports',
      intent: 'Reports.',
      folders: ['docs/'],
      types: ['report'],
      excludeFiles: [{ fileNames: ['scratch.md'] }],
      headings: [{ purpose: 'heading', level: 1 }],
    },
    {
      ruleId: 'notes',
      intent: 'Notes.',
      folders: ['notes/'],
      maxLevel: 1,
    },
  ],
};

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mh-body-audit-'));
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, 'notes'), { recursive: true });
  writeFileSync(join(root, 'docs', 'report.md'), '---\ntype: report\n---\n\n# Report\n');
  writeFileSync(join(root, 'docs', 'memo.md'), '---\ntype: memo\n---\n\n# Memo\n');
  writeFileSync(join(root, 'docs', 'scratch.md'), '---\ntype: report\n---\n');
  writeFileSync(join(root, 'notes', 'note.md'), '# Note\n');
  // DIRECTORIES carrying a markdown name: reading one fails `EISDIR` for every
  // user, root included.
  mkdirSync(join(root, 'notes', 'locked.md'), { recursive: true });
  mkdirSync(join(root, 'unreached.md'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('auditRules', () => {
  describe('success cases', () => {
    it('tallies each Rule over all three axes, with every type read from disk', () => {
      // `memo.md` is reached by `reports` on its path but its type is not
      // taken, so it counts nowhere; `scratch.md` matches all three axes and
      // is removed, so it counts as excluded.
      // ARRANGE
      const files = ['docs/report.md', 'docs/memo.md', 'docs/scratch.md', 'notes/note.md'];
      const expected = {
        rules: [
          {
            rule: { ruleId: 'reports', selector: { folders: ['docs/'], types: ['report'] }, intent: 'Reports.' },
            won: 1,
            shadowed: 0,
            shadowedBy: [],
            excluded: 1,
          },
          {
            rule: { ruleId: 'notes', selector: { folders: ['notes/'] }, intent: 'Notes.' },
            won: 1,
            shadowed: 0,
            shadowedBy: [],
            excluded: 0,
          },
        ],
      };
      // ACT
      const actual = auditRules(root, files, SECTION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses, naming the file, when a file only a Rule without types reaches cannot be read', () => {
      // `--check` opens `notes/locked.md` and refuses over it, so the audit
      // must too, although no `type` could change the `notes` row.
      // ARRANGE
      const files = ['docs/report.md', 'notes/locked.md', 'notes/note.md'];
      const expected = { kind: 'unreadable', path: join(root, 'notes', 'locked.md') };
      // ACT
      const actual = auditRules(root, files, SECTION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses when a file a typed Rule excludes is not there to read', () => {
      // No Rule reaches `docs/scratch.md`, so `--check` never opens it, but
      // the `excluded` count needs its type.
      // ARRANGE
      const files = ['docs/report.md', 'docs/phantom-scratch.md'];
      const excluding: BodyStructureConfig = {
        rules: [{ ...SECTION.rules[0], excludeFiles: [{ fileNames: ['phantom-scratch.md'] }] }],
      };
      const expected = { kind: 'unreadable', path: join(root, 'docs', 'phantom-scratch.md') };
      // ACT
      const actual = auditRules(root, files, excluding);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('never opens a file no Rule matches on its path axes', () => {
      // `unreached.md` is a directory, so opening it would refuse the audit.
      // ARRANGE
      const files = ['notes/note.md', 'unreached.md'];
      const expectedWins = [0, 1];
      // ACT
      const audit = auditRules(root, files, SECTION);
      const actual = 'rules' in audit ? audit.rules.map((row) => row.won) : audit;
      // ASSERT
      expect(actual).toEqual(expectedWins);
    });

    it('opens nothing and answers no rows when this Module has no section of its own', () => {
      // ARRANGE
      const files = ['notes/locked.md'];
      const noSection = undefined;
      const expected = { rules: [] };
      // ACT
      const actual = auditRules(root, files, noSection);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
