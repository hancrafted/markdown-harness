// Integration suite for `--check`, at the grain a caller sees.
//
// Exercises the entry point against real files in a tmpdir, which makes the
// read edge observable: the pure units below are handed text, but only this
// level can show that a file a Rule reaches is opened, that its `type` is read
// out of it, and that a file no Rule reaches is never opened.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkCorpus } from '../check.ts';
import type { BodyStructureConfig } from '../section.ts';

/** A typed Rule ahead of an untyped one, both under `docs/`; nothing else is reached. */
const SECTION: BodyStructureConfig = {
  rules: [
    {
      ruleId: 'reports',
      intent: 'A report opens with one title and says what it found.',
      folders: ['docs/'],
      types: ['report'],
      headings: [{ purpose: 'heading', level: 2, pattern: '^Findings$' }],
    },
    {
      ruleId: 'pages',
      intent: 'Every page carries exactly one title.',
      folders: ['docs/'],
      headings: [{ purpose: 'heading', level: 1 }],
    },
  ],
};

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mh-body-check-'));
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'report.md'), '---\ntype: report\n---\n\n# Report\n\n## Findings\n');
  writeFileSync(join(root, 'docs', 'thin-report.md'), '---\ntype: report\n---\n\n# Report\n');
  // A `# comment` inside the frontmatter block is YAML, not a title, so this
  // page has none and the untyped Rule finds its one title missing.
  writeFileSync(join(root, 'docs', 'page.md'), '---\n# comment\ntitle: Page\n---\n\nNo heading here.\n');
  // DIRECTORIES carrying a markdown name. Reading one fails `EISDIR` for every
  // user, root included, so a refusal or its absence proves what was opened
  // without depending on the file permissions the runner has.
  mkdirSync(join(root, 'docs', 'locked.md'), { recursive: true });
  mkdirSync(join(root, 'unreached.md'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('checkCorpus', () => {
  describe('success cases', () => {
    it('judges each file by the Rule its own type selects, from the bytes on disk', () => {
      // ARRANGE
      const files = ['docs/report.md', 'docs/thin-report.md', 'docs/page.md'];
      const expected = {
        governed: ['docs/report.md', 'docs/thin-report.md', 'docs/page.md'],
        files: [
          {
            path: 'docs/thin-report.md',
            ruleId: 'reports',
            ruleIntent: 'A report opens with one title and says what it found.',
            violations: [
              {
                violation: 'BODY_STRUCTURE__HEADING_MISSING',
                entry: [0],
                requirement: { purpose: 'heading', level: 2, pattern: '^Findings$' },
              },
            ],
          },
          {
            path: 'docs/page.md',
            ruleId: 'pages',
            ruleIntent: 'Every page carries exactly one title.',
            violations: [
              {
                violation: 'BODY_STRUCTURE__HEADING_MISSING',
                entry: [0],
                requirement: { purpose: 'heading', level: 1 },
              },
            ],
          },
        ],
      };
      // ACT
      const outcome = checkCorpus(root, files, SECTION);
      const actual = outcome.kind === 'checked' ? outcome.result : outcome;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses the whole corpus, naming the file, when a file a Rule reaches cannot be read', () => {
      // A report quietly missing a file looks complete, so there is no
      // partial answer. The refusal carries the path as the caller wrote it.
      // ARRANGE
      const files = ['docs/report.md', 'docs/locked.md', 'docs/page.md'];
      const expected = { kind: 'unreadable', path: join(root, 'docs', 'locked.md') };
      // ACT
      const actual = checkCorpus(root, files, SECTION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a file a Rule reaches that is not there at all', () => {
      // ARRANGE
      const files = ['docs/phantom.md'];
      const expected = { kind: 'unreadable', path: join(root, 'docs', 'phantom.md') };
      // ACT
      const actual = checkCorpus(root, files, SECTION);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('never opens a file no Rule reaches', () => {
      // `unreached.md` is a directory, so opening it would refuse the corpus.
      // A result coming back at all is the proof that nothing read it.
      // ARRANGE
      const files = ['docs/report.md', 'unreached.md'];
      const expected = { kind: 'checked', result: { governed: ['docs/report.md'], files: [] } };
      // ACT
      const actual = checkCorpus(root, files, SECTION);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('opens nothing and governs nothing when this Module has no section of its own', () => {
      // ARRANGE
      const files = ['docs/locked.md', 'docs/page.md'];
      const noSection = undefined;
      const expected = { kind: 'checked', result: { governed: [], files: [] } };
      // ACT
      const actual = checkCorpus(root, files, noSection);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
