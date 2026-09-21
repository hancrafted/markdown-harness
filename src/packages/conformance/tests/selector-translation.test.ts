// The two-sided guard over the `frontmatter` tier's selector translation.
//
// NOT a tier runner, and deliberately not named like one: `tierOfRunnerFile`
// answers `undefined` for anything that does not end in `-tier.test.ts`, so
// this file sits beside the runners without claiming a tier of its own. The
// tier it reads already has exactly one runner.
//
// The two halves are two assertions that must be able to fail INDEPENDENTLY,
// which is the whole demonstration. Mistranslate one selector by file name
// alone where a folder list was exact, and the witness half goes red while the
// corpus half stays green — the asymmetry the guard exists for. A probe that
// turned both red would have shown nothing.
//
// `folderOf` below deliberately restates the production helper rather than
// importing it. It is private to `frontmatter-harness`, so importing it would
// breach the entry-point boundary — and a guard that derived its expectation
// from the code under test could not disagree with it.
//
// Both halves are frozen from the glob grammar this config was migrated FROM.
// ARCH-002 §3.1 makes a changed expectation a contract change rather than a
// test fix: a failure here is answered by reading the config and deciding which
// of the two is wrong, never by rewriting the frozen file to agree with the code.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config-loader/load-config.ts';
import { queryPath } from '../../frontmatter-harness/query.ts';
import { listMarkdownFiles } from '../../markdown-file-tree/list-markdown-files.ts';
import { corpusComparisons, translationTierRoot, witnessComparisons } from '../selector-translation.ts';

const TIER_ROOT = translationTierRoot();
const CONFIG = `${TIER_ROOT}valid-test-config.yaml`;

const corpus = corpusComparisons();
const witnesses = witnessComparisons();

/**
 * The tier's config, loaded once.
 *
 * Through the real loader rather than a YAML parse, so a translation that no
 * longer validates fails here rather than silently resolving against a config
 * the tool would refuse.
 */
function tierConfig() {
  const load = loadConfig(CONFIG);
  if (load.config === undefined) throw new Error(`the tier config was refused: ${JSON.stringify(load.faults)}`);
  return load.config;
}

const config = tierConfig();

/** The folder token a tier-relative path sits in, root included. */
function folderOf(path: string): string {
  const lastSeparator = path.lastIndexOf('/');
  return lastSeparator === -1 ? './' : path.slice(0, lastSeparator + 1);
}

/**
 * Every folder the tier actually has, as folder tokens.
 *
 * Read off DIRECTORIES rather than off the files inside them, because a folder
 * holding no markdown is still a folder a witness may sit in — `docs/skills/`
 * and the tier root are both of those, and both carry witnesses that matter.
 */
function tierFolders(directory: string, prefix: string): readonly string[] {
  const here = prefix === '' ? './' : prefix;
  const below = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => tierFolders(join(directory, entry.name), `${prefix}${entry.name}/`));
  return [here, ...below];
}

/** What the steering command answers for one path, reduced to what the halves compare. */
function answerFor(path: string): { path: string; governance: string; ruleId: string | null } {
  const answer = queryPath(path, config);
  return {
    path,
    governance: answer.governance,
    ruleId: answer.governance === 'governed' ? answer.rule.ruleId : null,
  };
}

describe('the selector translation guard', () => {
  describe('success cases', () => {
    it('answers every corpus file with the rule the glob grammar gave it', () => {
      // The half a real tree CAN express. It proves the translation did not
      // narrow: every file that was governed still is, by the same rule.
      // ARRANGE
      const expected = corpus.map(({ path, ruleId }) => ({
        path,
        governance: ruleId === null ? 'invisible' : 'governed',
        ruleId,
      }));
      // ACT
      const actual = corpus.map(({ path }) => answerFor(path));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers every witness path with its frozen steering answer', () => {
      // The half a real tree CANNOT express. It proves the translation did not
      // widen: a path with no document behind it pins where a selector stops.
      // ARRANGE
      const expected = witnesses.map(({ path, governance, ruleId }) => ({ path, governance, ruleId }));
      // ACT
      const actual = witnesses.map(({ path }) => answerFor(path));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('freezes an attribution for every file the tier actually holds', () => {
      // A frozen half that has drifted from the tree proves nothing about the
      // files it stopped covering, and nothing says so — the corpus half would
      // pass over a shrinking list of paths, all of which still agree.
      // ARRANGE
      const frozen = corpus.map(({ path }) => path);
      // ACT
      const walked = listMarkdownFiles(TIER_ROOT);
      // ASSERT
      expect(walked).toEqual(frozen);
    });

    it('holds no witness whose path exists, which would make it an ordinary corpus file', () => {
      // A witness is the ABSENCE of a document. One that grew a file behind it
      // has quietly become a second, weaker copy of the corpus half.
      // ARRANGE
      const walked = new Set(listMarkdownFiles(TIER_ROOT) ?? []);
      // ACT
      const existing = witnesses.map(({ path }) => path).filter((path) => walked.has(path));
      // ASSERT
      expect(existing).toEqual([]);
    });

    it('holds no witness in a folder the tier does not have', () => {
      // Every approximation in this migration loses RECURSION and nothing else,
      // so a witness inside a folder that does not exist would be measuring a
      // divergence the note already accepted rather than the translation. A
      // witness names a file that does not exist, in a folder that does.
      // ARRANGE
      const folders = new Set(tierFolders(TIER_ROOT, ''));
      // ACT
      const orphaned = witnesses.map(({ path }) => path).filter((path) => !folders.has(folderOf(path)));
      // ASSERT
      expect(orphaned).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('states how many comparisons each half makes, by hand', () => {
      // Stated rather than counted off the files being checked, for the reason
      // every declared count in this Package is: a number derived from the
      // thing it measures cannot fail. These are the figures the migration
      // reports.
      // ARRANGE
      const declaredCorpus = 40;
      const declaredWitnesses = 28;
      // ACT
      const counts = { corpus: corpus.length, witnesses: witnesses.length };
      // ASSERT
      expect(counts).toEqual({ corpus: declaredCorpus, witnesses: declaredWitnesses });
    });

    it('reaches a path the corpus half can never reach, so the witness half is not a subset', () => {
      // If every witness sat on a file that exists, the second half would be
      // the first half with extra steps. This is the assertion that says the
      // two are measuring different things.
      // ARRANGE
      const walked = new Set(listMarkdownFiles(TIER_ROOT) ?? []);
      const none = 0;
      // ACT
      const beyond = witnesses.map(({ path }) => path).filter((path) => !walked.has(path));
      // ASSERT
      expect(beyond.length).toBeGreaterThan(none);
    });

    it('names the translation unit behind every deliberately changed answer', () => {
      // A witness whose answer the migration knowingly changed says so. Without
      // this, a divergence someone argued for and a divergence nobody noticed
      // are the same two lines of JSON.
      // ARRANGE
      const declaredDivergences = ['docs/SKILL.md', 'docs/plain/SKILL.md'];
      // ACT
      const diverging = witnesses.filter((witness) => witness.divergesFrom !== undefined).map(({ path }) => path);
      // ASSERT
      expect(diverging).toEqual(declaredDivergences);
    });

    it('keeps a witness for the path whose answer the extension decision settles', () => {
      // A selector carries no extension any more, so `notes.txt` and `notes.md`
      // in one governed folder are told apart by nothing in the config. This
      // witness is where that stays decided.
      // ARRANGE
      const markdown = 'docs/research/does-not-exist.md';
      const notMarkdown = 'docs/research/does-not-exist.txt';
      const expected = [
        { path: markdown, governance: 'governed', ruleId: 'research' },
        { path: notMarkdown, governance: 'invisible', ruleId: null },
      ];
      // ACT
      const answers = [answerFor(markdown), answerFor(notMarkdown)];
      // ASSERT
      expect(answers).toEqual(expected);
    });
  });
});
