// What a declared directory publishes: two kinds of entry, one order, two skips.

import { describe, expect, it } from 'vitest';
import { declaredDirectories, directoryListing, indexPathFor } from './directory-listing.pure.ts';

/**
 * A hand-written matcher, kept here where a reader can see what it does.
 *
 * It handles exactly the one glob shape these tests use — a trailing `*` —
 * because the real matcher is a platform builtin and substituting a framework
 * double would hide which behaviour is under test.
 */
function matches(glob: string, path: string): boolean {
  const star = glob.indexOf('*');
  return star === -1 ? glob === path : path.startsWith(glob.slice(0, star));
}

/** One file's frontmatter, as the bytes a real corpus would hold. */
function withFields(fields: Record<string, string>): string {
  return ['---', ...Object.entries(fields).map(([key, value]) => `${key}: ${value}`), '---', '', '# Body'].join('\n');
}

describe('directoryListing', () => {
  describe('success cases', () => {
    it('resolves link text through title, then name, then the file name', () => {
      // The chain is fixed, and the tie is live: a file carrying both renders
      // its title. The H1 is deliberately not a fallback.
      // ARRANGE
      const config = { directories: { 'docs/': null } };
      const files = ['docs/both.md', 'docs/named.md', 'docs/plain.md'];
      const sources = {
        'docs/both.md': withFields({ title: 'Both', name: 'both-name' }),
        'docs/named.md': withFields({ name: 'Named' }),
        'docs/plain.md': withFields({ description: 'No name at all.' }),
      };
      const expected = ['- [Both](both.md)', '- [Named](named.md)', '- [plain](plain.md) - No name at all.'];
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.entries).toEqual(expected);
    });

    it('interleaves folders and files by code unit, because the list is flat', () => {
      // The measured case from the record: `parts` sits BETWEEN
      // `okf-conformance.md` and `pathrule-precedence.md`, because the sort key
      // is the name on disk and `par` < `pat`.
      // ARRANGE
      const config = { directories: { 'docs/': null, 'docs/parts/': null } };
      const files = ['docs/okf-conformance.md', 'docs/pathrule-precedence.md', 'docs/parts/one.md'];
      const sources = {};
      const expected = [
        '- [okf-conformance](okf-conformance.md)',
        '- [parts](parts/index.md)',
        '- [pathrule-precedence](pathrule-precedence.md)',
      ];
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.entries).toEqual(expected);
    });

    it('reads a child folder description through the nearest declared source, walking up', () => {
      // The resolution order that reproduces BOTH of the record's worked
      // examples: a child declaring its own source uses it, and a child
      // declaring none inherits the nearest ancestor that does.
      // ARRANGE
      const config = {
        directories: {
          'docs/': null,
          'docs/skills/': { descriptionSource: 'SKILL.md' },
          'docs/skills/legacy/': null,
          'docs/reference/': { descriptionSource: 'labels.md' },
        },
      };
      const files = ['docs/skills/legacy/SKILL.md', 'docs/reference/labels.md'];
      const sources = {
        'docs/skills/legacy/SKILL.md': withFields({ description: 'From the parent setting.' }),
        'docs/reference/labels.md': withFields({ description: 'From its own setting.' }),
      };
      const inherited = ['- [legacy](legacy/index.md) - From the parent setting.'];
      // `skills/` is listed too, and it is name-only: its own declared source is
      // `SKILL.md`, and `docs/skills/SKILL.md` does not exist. That is the same
      // shape the record's worked example produces, and it is worth asserting
      // beside the two that do resolve.
      const declared = ['- [reference](reference/index.md) - From its own setting.', '- [skills](skills/index.md)'];
      // ACT
      const skills = directoryListing('docs/skills/', { config, files, sources, matches });
      const docs = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(skills.entries).toEqual(inherited);
      expect(docs.entries).toEqual(declared);
    });
  });

  describe('failure cases', () => {
    it('refuses the whole directory when one entry cannot be copied', () => {
      // A refusal aborts before the region is rendered, so a refused directory
      // never produces a region with one repaired line in it.
      // ARRANGE
      const config = { directories: { 'docs/': null } };
      const files = ['docs/fine.md', 'docs/broken.md'];
      const sources = { 'docs/broken.md': withFields({ title: "'Rules ]draft'" }) };
      const expected = 'ENTRY_TEXT_HOLDS_UNBALANCED_BRACKET';
      const at = 'docs/broken.md';
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.refusal).toBe(expected);
      expect(actual.refusedAt).toBe(at);
      expect(actual.entries).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('never lists the index it is writing into', () => {
      // The one skip OKF's own generator also makes.
      // ARRANGE
      const config = { directories: { 'docs/': null } };
      const files = ['docs/index.md', 'docs/other.md'];
      const sources = {};
      const expected = ['- [other](other.md)'];
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.entries).toEqual(expected);
    });

    it('omits an excluded file and says so, without naming it', () => {
      // A fact, not a list: the disclosure carries no names and no count, which
      // is what keeps it narrower than the trailing section that was rejected.
      // ARRANGE
      const config = { directories: { 'docs/': { excludeFiles: ['docs/draft-*.md'] } } };
      const files = ['docs/draft-one.md', 'docs/kept.md'];
      const sources = {};
      const expected = ['- [kept](kept.md)'];
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.entries).toEqual(expected);
      expect(actual.disclosed).toBe(true);
    });

    it('omits an undeclared child folder entirely, and discloses nothing about it', () => {
      // Not declaring a folder is the whole mechanism — no exclusion needed,
      // and no disclosure either, because publishing its absence would publish
      // precisely what the Operator chose not to.
      // ARRANGE
      const config = { directories: { 'docs/': null } };
      const files = ['docs/undeclared/orphan.md'];
      const sources = {};
      const nothing: string[] = [];
      // ACT
      const actual = directoryListing('docs/', { config, files, sources, matches });
      // ASSERT
      expect(actual.entries).toEqual(nothing);
      expect(actual.disclosed).toBe(false);
    });

    it('treats the root spelling as a prefix of nothing', () => {
      // `./` is the one key that could not exist without the trailing-slash
      // rule, because the slash-free spelling forces a quoted empty string.
      // ARRANGE
      const root = './';
      const config = { directories: { './': null, 'docs/': null } };
      const files = ['README.md', 'docs/deep.md'];
      const sources = {};
      const expected = ['- [README](README.md)', '- [docs](docs/index.md)'];
      const rootIndex = 'index.md';
      // ACT
      const actual = directoryListing(root, { config, files, sources, matches });
      const written = indexPathFor(root);
      // ASSERT
      expect(actual.entries).toEqual(expected);
      expect(written).toBe(rootIndex);
    });

    it('keeps the declared directories in config order, which nothing else depends on', () => {
      // Config order has no consumer: not resolution, because each directory is
      // claimed once by name, and not output, because the list is sorted. It
      // survives only so a report reads down the config as it was written.
      // ARRANGE
      const config = { directories: { 'docs/zulu/': null, './': null, 'docs/alpha/': null } };
      const expected = ['docs/zulu/', './', 'docs/alpha/'];
      // ACT
      const actual = declaredDirectories(config);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
