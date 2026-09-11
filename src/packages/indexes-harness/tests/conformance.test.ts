// The indexes Conformance suite, under `fixtures/indexes-conformance/`, doing
// both of its jobs.
//
// COVERAGE: every key the `indexes:` vocabulary defines is exercised somewhere,
// and the config loads through the real loader. When the vocabulary grows, this
// fails until the suite grows with it.
//
// SPECIFICATION: `expected/` holds the exact bytes the generator must write,
// one golden file per index, plus `expected/outcomes.yaml` for the five refused
// directories that have no file to state an outcome for them. A golden is a
// CONTRACT, not a test fixture: a failure here is answered by reading the
// corpus and deciding which of the two is wrong, never by regenerating the
// golden to agree with the code.
//
// NOTHING WRITES. The whole suite runs off `planIndexes`, which is a dry run,
// so a run leaves the corpus exactly as it found it — which is also the only
// way this suite can be run twice.
//
// PROTOTYPE. This is a separate synthetic root from `fixtures/conformance/`,
// and that divergence from issue #92's Worked example B is deliberate and
// argued in `docs/workshop/prototype/index-generator/findings.md`. It is the
// first thing a reviewer should disagree with.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadConfig } from '../../config-loader/load-config.ts';
import { listMarkdownFiles } from '../../markdown-file-tree/list-markdown-files.ts';
import { planIndexes, type PlannedIndex } from '../plan-indexes.ts';

/** The synthetic repo root the config's paths are written relative to. */
const CORPUS_ROOT = fileURLToPath(new URL('../../../../fixtures/indexes-conformance', import.meta.url));
const CONFIG_PATH = `${CORPUS_ROOT}/indexes-test-config.yaml`;

/** Every key the `indexes:` section may carry, and every key one directory may. */
const SECTION_KEYS = ['descriptionSource', 'directories'] as const;
const SETTINGS_KEYS = ['descriptionSource', 'excludeFiles'] as const;

const loaded = loadConfig(CONFIG_PATH);
const config = loaded.config;
const indexes = config?.indexes;
const directories = indexes?.directories ?? {};

const corpus = listMarkdownFiles(CORPUS_ROOT) ?? [];
const plan = config === undefined ? { indexes: [] } : planIndexes(CORPUS_ROOT, corpus, config);

/** Every setting object actually written in the config, bare keys excluded. */
function everySettings(): Record<string, unknown>[] {
  return Object.values(directories).filter((value): value is Record<string, unknown> => value !== null);
}

/** One golden file's bytes, or `undefined` when the suite states none. */
function golden(index: string): string | undefined {
  try {
    return readFileSync(`${CORPUS_ROOT}/expected/${index}`, 'utf8');
  } catch {
    return undefined;
  }
}

/** The stated outcome for every declared directory. */
const outcomes = parse(readFileSync(`${CORPUS_ROOT}/expected/outcomes.yaml`, 'utf8')) as Record<
  string,
  { outcome?: string; refusal?: string; refusedAt?: string; warnings?: string[] }
>;

/**
 * What the plan actually said about one directory, reduced to the stated shape.
 *
 * Absent keys are dropped rather than written as `undefined`, so the YAML a
 * human maintains stays as short as the thing it describes: a directory that
 * was simply regenerated states one key and nothing else.
 */
function statedShape(planned: PlannedIndex): Record<string, unknown> {
  const stated = {
    outcome: planned.outcome,
    refusal: planned.refusal,
    refusedAt: planned.refusedAt,
    warnings: planned.warnings.length > 0 ? [...planned.warnings] : undefined,
  };
  return Object.fromEntries(Object.entries(stated).filter(([, value]) => value !== undefined));
}

/** Those directories whose plan produced bytes, so a golden must exist for each. */
const written = plan.indexes.filter((one) => one.text !== undefined);
const refused = plan.indexes.filter((one) => one.text === undefined);

describe('indexes-test-config.yaml is a complete test surface', () => {
  describe('success cases', () => {
    it('loads through the real loader, with both module sections recognised', () => {
      // The config is not merely parsed here: it goes through `loadConfig`, so
      // a top-level key the loader does not recognise fails this rather than
      // being silently ignored by a direct `parse`.
      // ARRANGE
      const expected = { faults: [], hasIndexes: true };
      // ACT
      const actual = { faults: loaded.faults, hasIndexes: indexes !== undefined };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each(SECTION_KEYS)('exercises the section key %s', (key) => {
      // ARRANGE
      const section = indexes ?? {};
      // ACT
      const seen = Object.keys(section);
      // ASSERT
      expect(seen).toContain(key);
    });

    it.each(SETTINGS_KEYS)('exercises the per-directory key %s', (key) => {
      // ARRANGE
      const settings = everySettings();
      // ACT
      const seen = settings.flatMap((one) => Object.keys(one));
      // ASSERT
      expect(seen).toContain(key);
    });

    it('reaches the repo root, a bare key, and an overriding key', () => {
      // Three shapes a directory entry can take, and a suite reaching only two
      // of them leaves the third unguarded. The root spelling is the one that
      // could not exist at all without the trailing-slash rule.
      // ARRANGE
      const root = './';
      const bare = 'docs/';
      const overriding = 'docs/skills/';
      const override = 'SKILL.md';
      // ACT
      const keys = Object.keys(directories);
      const overridden = directories[overriding]?.descriptionSource;
      // ASSERT
      expect(keys).toContain(root);
      expect(directories[bare]).toBeNull();
      expect(overridden).toBe(override);
    });
  });

  describe('failure cases', () => {
    it('carries no section key outside the vocabulary', () => {
      // Closure, not coverage. Coverage proves the SUITE complete; closure
      // proves the CONFIG is.
      // ARRANGE
      const known: readonly string[] = SECTION_KEYS;
      // ACT
      const unknown = Object.keys(indexes ?? {}).filter((key) => !known.includes(key));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('carries no per-directory key outside the vocabulary', () => {
      // ARRANGE
      const known: readonly string[] = SETTINGS_KEYS;
      // ACT
      const unknown = everySettings().flatMap((one) => Object.keys(one).filter((key) => !known.includes(key)));
      // ASSERT
      expect(unknown).toEqual([]);
    });

    it('spells every directory key with a trailing slash', () => {
      // What makes YAML's textual key uniqueness actually semantic. Without it
      // `docs/research/` and `docs/research` are two keys naming one directory,
      // which leaks straight through the protection the mapping was chosen for.
      // ARRANGE
      const slash = '/';
      // ACT
      const unslashed = Object.keys(directories).filter((key) => !key.endsWith(slash));
      // ASSERT
      expect(unslashed).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('declares a directory that exists on disk and one that deliberately does not appear', () => {
      // The declared/undeclared split is the whole of `Governance is opt-in by
      // path` for this Module, so the suite has to hold both halves at once.
      // ARRANGE
      const declared = 'docs/research/';
      const undeclared = 'docs/undeclared/';
      const orphan = 'docs/undeclared/orphan.md';
      // ACT
      const keys = Object.keys(directories);
      // ASSERT
      expect(keys).toContain(declared);
      expect(keys).not.toContain(undeclared);
      expect(corpus).toContain(orphan);
    });
  });
});

describe('the generator writes the bytes each golden file states', () => {
  describe('success cases', () => {
    it.each(written.map((one) => one.index))('writes %s exactly as its golden states', (index) => {
      // ARRANGE
      const expected = golden(index);
      // ACT
      const actual = written.find((one) => one.index === index)?.text;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it.each(refused.map((one) => one.directory))('writes nothing at all for %s', (directory) => {
      // A refusal is not a partial write. The file stays exactly as it was, and
      // for the three ENTRY_ refusals it never existed in the first place.
      // ARRANGE
      const nothing = undefined;
      // ACT
      const planned = refused.find((one) => one.directory === directory);
      // ASSERT
      expect(planned?.text).toBe(nothing);
      expect(planned?.refusal).toBeDefined();
    });

    it('states an outcome for every declared directory and no others', () => {
      // Fails with a diff of every directory that disagrees, which is what a
      // reader needs when one change moves several outcomes together.
      // ARRANGE
      const expected = outcomes;
      // ACT
      const actual = Object.fromEntries(plan.indexes.map((one) => [one.directory, statedShape(one)]));
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('plans one index per declared directory, and states how many that is', () => {
      // Stated by hand rather than counted back off the config it is checking.
      // Adding or removing a declared directory is a contract change, so this
      // number belongs to that review — and `plan.indexes.length` compared
      // against anything derived from the config could not fail at all.
      // ARRANGE
      const declaredDirectories = 14;
      // ACT
      const planned = plan.indexes.length;
      // ASSERT
      expect(planned).toBe(declaredDirectories);
    });

    it('exercises every outcome and every refusal, so no branch of this suite is vacuous', () => {
      // An `it.each` over an empty list is a passing suite that asserted
      // nothing. This is what stops a whole state going silent.
      // ARRANGE
      const everyState = [
        'created',
        'appended',
        'regenerated',
        'healed',
        'REGION_PAIR_REPEATED',
        'REGION_START_UNTERMINATED',
        'ENTRY_TEXT_HOLDS_UNBALANCED_BRACKET',
        'ENTRY_TEXT_HOLDS_LINE_BREAK',
        'ENTRY_TEXT_HOLDS_REGION_MARKER',
      ];
      // ACT
      const reached = plan.indexes.map((one) => one.refusal ?? one.outcome);
      // ASSERT
      for (const state of everyState) expect(reached).toContain(state);
    });

    it('regenerates byte-identically from identical input, which is B4', () => {
      // Two runs over an unchanged tree. Stated against a SECOND PLAN rather
      // than against the first plan's own output, because comparing a value to
      // itself is the shape of an assertion that cannot fail.
      // ARRANGE
      const expected = plan.indexes.map((one) => one.text);
      // ACT
      const again = planIndexes(CORPUS_ROOT, corpus, config ?? {}).indexes.map((one) => one.text);
      // ASSERT
      expect(again).toEqual(expected);
    });

    it('leaves an already-generated region unchanged on the next run', () => {
      // B4 has a second half the first test cannot see: a region that already
      // holds what the generator would write must report no change at all.
      // `docs/research/index.md` is committed in its generated form, so this
      // fails the moment the canonical bytes move.
      // ARRANGE
      const settled = 'docs/research/index.md';
      // ACT
      const planned = plan.indexes.find((one) => one.index === settled);
      // ASSERT
      expect(planned?.changed).toBe(false);
    });

    it('writes a region Prettier does not rewrite, with one stated exception', async () => {
      // MEASURED, not assumed. `npm run verify` runs `prettier --check .` over
      // a governed tree, so a region this repo's own gate would rewrite breaks
      // B4 on the first run after it is written.
      //
      // The exception is real and is the honest cost of the healing rule:
      // deleting a lone marker line leaves the blank line that sat above it, so
      // the healed file carries two consecutive blank lines and Prettier
      // collapses them. Healing is specified as non-destructive — it deletes
      // the marker and nothing else — and normalising an adopter's whitespace
      // would be touching bytes outside the region.
      // ARRANGE
      const healed = 'docs/reference/index.md';
      const fixedPoints = written.filter((one) => one.index !== healed);
      const unchanged = fixedPoints.map((one) => one.text);
      // ACT
      const formatted = await Promise.all(
        fixedPoints.map((one) => format(one.text as string, { filepath: one.index })),
      );
      // ASSERT
      expect(formatted).toEqual(unchanged);
      expect(written.map((one) => one.index)).toContain(healed);
    });
  });
});
