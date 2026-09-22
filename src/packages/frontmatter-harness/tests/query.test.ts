// Integration suite for this Module's half of `--query`, at the grain a caller sees.
//
// Every case runs against the committed conformance config rather than a rule
// written for the occasion, so the ordering assertions are made about the same
// file the rest of the suite calls a complete surface.
//
// What this entry point answers is a CLAIM: what this Module asks of the path,
// or nothing when it passes the path by. `invisible` is not here to be asserted
// — it is a statement about the whole config, so it is composed by `cli` once
// no declared Module has claimed the path.

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../foundation/load-config.ts';
import { fileNameOf, folderOf } from '../../foundation/selector-grammar.ts';
import { frontmatterModule } from '../module.ts';
import { queryPath } from '../query.ts';
import { validateFrontmatterSection } from '../validate-config.ts';

// Loaded through this Module's own descriptor, which is also what makes the
// section below typed: `sectionFor` keys on the descriptor, so what comes back
// is the section this Module's own validation earned and nothing else.
const loaded = loadConfig('fixtures/conformance/frontmatter/valid-test-config.yaml', [frontmatterModule]);
if (loaded.config === undefined) throw new Error('the conformance config must load for this suite to mean anything');
const section = loaded.config.sectionFor(frontmatterModule);
if (section === undefined)
  throw new Error('the conformance config must name this Module for this suite to mean anything');

/** What this Module answers for a path it passes by. */
const UNCLAIMED = undefined;

describe('queryPath', () => {
  describe('success cases', () => {
    it('resolves a reference page to the reference rule, intent verbatim', () => {
      // ARRANGE
      const verbatim = 'Reference pages are looked up by slug and say how far they can be trusted';
      const expected = { ruleId: 'reference', intent: verbatim };
      // ACT
      const actual = queryPath('docs/reference/api-limits.md', section);
      // ASSERT
      expect(actual?.rule).toEqual(expected);
    });

    it('answers a frontmatter-forbidden rule with nothing else to ask', () => {
      // ARRANGE
      const expected = { frontmatter: 'forbidden' };
      // ACT
      const actual = queryPath('index.md', section);
      // ASSERT
      expect(actual?.requirements).toEqual(expected);
    });

    it('matches a name-only selector against a deeply nested file', () => {
      // ARRANGE
      const expected = 'log-files';
      // ACT
      const actual = queryPath('docs/datasets/log.md', section);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('claims nothing about which Module made the claim', () => {
      // The Module name reaches the report from the descriptor at composition,
      // never from here: a Module that spelled its own config key would drift
      // from the key the loader recognises the moment either changed.
      // ARRANGE
      const expected = ['rule', 'requirements'];
      // ACT
      const actual = queryPath('docs/reference/api-limits.md', section);
      // ASSERT
      expect(Object.keys(actual ?? {})).toEqual(expected);
    });

    it('matches every folder and file-name token the validator admits from a normalised path', () => {
      // ARRANGE
      const paths = [
        { path: 'README.md', ruleId: 'root-file' },
        { path: 'docs/vision/product.md', ruleId: 'nested-file' },
      ];
      const expected = paths.map(({ ruleId }) => ({ faults: [], ruleId }));
      // ACT
      const actual = paths.map(({ path, ruleId }) => {
        const validation = validateFrontmatterSection({
          rules: [
            {
              ruleId,
              intent: 'A round-trip token reaches the path that emitted it',
              folders: [folderOf(path)],
              fileNames: [fileNameOf(path)],
              frontmatter: 'forbidden',
            },
          ],
        });

        return {
          faults: validation.faults,
          ruleId: queryPath(path, validation.section)?.rule.ruleId,
        };
      });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('passes by a path no rule selects', () => {
      // ARRANGE
      const unnamed = 'README.md';
      // ACT
      const actual = queryPath(unnamed, section);
      // ASSERT
      expect(actual).toBe(UNCLAIMED);
    });

    it('passes by a path excluded with no later rule to catch it', () => {
      // `excludeFiles` removes a file from ONE rule. Nothing below claims it,
      // so the file ends up unclaimed rather than falling through.
      // ARRANGE
      const excluded = 'docs/research/vendor/imported.md';
      // ACT
      const actual = queryPath(excluded, section);
      // ASSERT
      expect(actual).toBe(UNCLAIMED);
    });

    it('passes by a path this Module was never given a section for', () => {
      // Reachable whenever a second Module's key carries the config on its own.
      // ARRANGE
      const noSection = undefined;
      // ACT
      const actual = queryPath('docs/reference/api-limits.md', noSection);
      // ASSERT
      expect(actual).toBe(UNCLAIMED);
    });
  });

  describe('edge cases', () => {
    it('lets the narrower rule written first beat the broad one below it', () => {
      // The exemplar sits above `research` deliberately; this is the pair that
      // proves first-match on real files rather than asserting it.
      // ARRANGE
      const expected = 'provenance-exemplar';
      // ACT
      const actual = queryPath('docs/research/provenance.md', section);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('strips leading decoration and still selects the same rule', () => {
      // The normalised spelling is no longer answered here — the response
      // echoes it and `cli` composes the response — but the DECORATION still
      // has to be off before a selector is asked, or `./docs/...` would select
      // nothing.
      // ARRANGE
      const decorated = './docs/reference/api-limits.md';
      const expected = 'reference';
      // ACT
      const actual = queryPath(decorated, section);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('answers about a path that does not exist', () => {
      // Nothing here touches the filesystem, which is the whole point: an agent
      // about to author a file cannot be asked to write it first.
      // ARRANGE
      const expected = 'reference';
      // ACT
      const actual = queryPath('docs/reference/never-written.md', section);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('passes by a path the corpus walk would never have collected', () => {
      // A selector carries no extension any more, so `folders: [docs/reference/]`
      // reaches this path as readily as the `.md` beside it. What tells them
      // apart is the same predicate the walk uses, asked here because there is
      // no walk on this command to have filtered one out — and claiming a file
      // `--check` will never report on is the one way this command can mislead
      // an agent about to create one.
      // ARRANGE
      const notMarkdown = 'docs/reference/never-written.txt';
      // ACT
      const actual = queryPath(notMarkdown, section);
      // ASSERT
      expect(actual).toBe(UNCLAIMED);
    });
  });
});
