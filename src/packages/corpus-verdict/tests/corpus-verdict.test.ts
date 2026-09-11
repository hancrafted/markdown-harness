// Integration suite for the composer, at the grain a caller sees.
//
// This is where `invisible` is decided and where the union count is made, so
// this is where both are asserted. It writes real files, because the composer
// has to pass the frontmatter Module's read edge through unchanged — including
// its refusal.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MarkdownHarnessConfig } from '../../config-contract/index.ts';
import { checkCorpus } from '../check-corpus.ts';
import { queryPath } from '../query-path.ts';

/**
 * Both Modules govern `docs/`, and each governs something the other does not:
 * `notes/` is frontmatter-only, `named/` is names-only, and `both/` is both.
 */
const CONFIG: MarkdownHarnessConfig = {
  frontmatter: {
    rules: [
      {
        ruleId: 'typed-docs',
        intent: 'Everything under docs/ says what it is',
        path: ['docs/notes/**/*.md', 'docs/both/**/*.md'],
        fields: { type: { presence: 'required' } },
      },
    ],
  },
  'file-names': {
    rules: [
      {
        ruleId: 'doc-names',
        intent: 'A doc is named for its subject',
        path: ['docs/named/**/*.md', 'docs/both/**/*.md'],
        file: { format: 'kebab-case' },
      },
    ],
  },
};

const TYPED = '---\ntype: note\n---\n';
const UNTYPED = '---\ntitle: no type here\n---\n';

let root = '';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mh-verdict-'));
  for (const folder of ['notes', 'named', 'both', 'loose']) {
    mkdirSync(join(root, 'docs', folder), { recursive: true });
  }
  writeFileSync(join(root, 'docs', 'notes', 'good.md'), TYPED);
  writeFileSync(join(root, 'docs', 'notes', 'bad.md'), UNTYPED);
  writeFileSync(join(root, 'docs', 'named', 'Bad_Name.md'), TYPED);
  writeFileSync(join(root, 'docs', 'named', 'good-name.md'), TYPED);
  writeFileSync(join(root, 'docs', 'both', 'Bad_Name.md'), UNTYPED);
  writeFileSync(join(root, 'docs', 'loose', 'anything.md'), UNTYPED);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const CORPUS = [
  'docs/both/Bad_Name.md',
  'docs/loose/anything.md',
  'docs/named/Bad_Name.md',
  'docs/named/good-name.md',
  'docs/notes/bad.md',
  'docs/notes/good.md',
];

/** The report, or nothing if the corpus was refused. */
function report() {
  const outcome = checkCorpus(root, CORPUS, CONFIG);
  return outcome.kind === 'checked' ? outcome.result : undefined;
}

describe('corpus verdict', () => {
  describe('success cases', () => {
    it('counts every file either Module governs, exactly once', () => {
      // The UNION. `docs/both/Bad_Name.md` is governed twice and counted once;
      // `docs/loose/anything.md` is governed by neither and not counted at all.
      // ARRANGE
      const governed = 5;
      // ACT
      const actual = report()?.summary.governedFiles;
      // ASSERT
      expect(actual).toBe(governed);
    });

    it('lists both Modules for a file that fails in each, in declared order', () => {
      // ARRANGE
      const expected = ['frontmatter', 'file-names'];
      // ACT
      const file = report()?.files.find((one) => one.path === 'docs/both/Bad_Name.md');
      const actual = file?.modules.map((block) => block.module);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists every governing Module for a query, even one already satisfied', () => {
      // Where `--check` shows only findings, `--query` shows everything that
      // governs — because the path may not exist yet.
      // ARRANGE
      const expected = ['frontmatter', 'file-names'];
      // ACT
      const answered = queryPath('docs/both/never-written.md', CONFIG);
      const actual = answered.governance === 'governed' ? answered.modules.map((one) => one.module) : [];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('answers invisible only when NO Module claims the path', () => {
      // The widening the second Module cost this word. It is now a claim about
      // every rule list at once, which is why no Module may reach it alone.
      // ARRANGE
      const expected = 'invisible';
      // ACT
      const actual = queryPath('docs/loose/anything.md', CONFIG).governance;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('answers governed for a path only the naming Module claims', () => {
      // A file the frontmatter Module ignores is still VISIBLE if a naming rule
      // names it — the half of the widening that is easy to get backwards.
      // ARRANGE
      const expected = ['file-names'];
      // ACT
      const answered = queryPath('docs/named/anything.md', CONFIG);
      const actual = answered.governance === 'governed' ? answered.modules.map((one) => one.module) : [];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the whole corpus when a governed file cannot be read', () => {
      // The frontmatter Module's refusal, passed through unchanged. A report
      // that quietly omitted the file would look complete.
      // ARRANGE
      const files = [...CORPUS, 'docs/notes/phantom.md'];
      const refused = join(root, 'docs', 'notes', 'phantom.md');
      // ACT
      const outcome = checkCorpus(root, files, CONFIG);
      const actual = outcome.kind === 'unreadable' ? outcome.path : undefined;
      // ASSERT
      expect(actual).toBe(refused);
    });
  });

  describe('edge cases', () => {
    it('never opens a file only the naming Module governs', () => {
      // The naming Module reads paths, so a file the frontmatter Module never
      // claimed is judged without being opened. `docs/named/Bad_Name.md` has
      // frontmatter that would fail `typed-docs`, and no such finding appears.
      // ARRANGE
      const expected = ['file-names'];
      // ACT
      const file = report()?.files.find((one) => one.path === 'docs/named/Bad_Name.md');
      const actual = file?.modules.map((block) => block.module);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists files in walker order rather than grouping them by Module', () => {
      // The naming Module answers the whole corpus after the frontmatter Module
      // does, so a naive concatenation would put every naming finding last.
      // ARRANGE
      const expected = ['docs/both/Bad_Name.md', 'docs/named/Bad_Name.md', 'docs/notes/bad.md'];
      // ACT
      const actual = report()?.files.map((one) => one.path);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps a clean governed file out of the report and inside the count', () => {
      // ARRANGE
      const clean = 'docs/notes/good.md';
      // ACT
      const listed = (report()?.files ?? []).map((one) => one.path);
      // ASSERT
      expect(listed).not.toContain(clean);
      expect(report()?.summary.invalidFiles).toBe(listed.length);
    });

    it('governs nothing at all when the config declares no Module', () => {
      // ARRANGE
      const expected = { summary: { governedFiles: 0, invalidFiles: 0, totalViolations: 0 }, files: [] };
      // ACT
      const outcome = checkCorpus(root, CORPUS, {});
      const actual = outcome.kind === 'checked' ? outcome.result : undefined;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
