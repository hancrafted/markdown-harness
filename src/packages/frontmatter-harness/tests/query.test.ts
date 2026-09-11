// Integration suite for this Module's half of `--query`, at the grain a caller sees.
//
// Every case runs against the committed conformance config rather than a rule
// written for the occasion, so the ordering assertions are made about the same
// file the rest of the suite calls a complete surface.
//
// `undefined` here means "no rule of THIS Module", never "invisible". Deciding
// a path is invisible is a claim about every Module at once, so it is asserted
// in `corpus-verdict/tests/` and deliberately not here.

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config-loader/load-config.ts';
import { queryFrontmatter } from '../query.ts';

const loaded = loadConfig('fixtures/conformance/valid-test-config.yaml');
if (loaded.config === undefined) throw new Error('the conformance config must load for this suite to mean anything');
const config = loaded.config;

describe('queryFrontmatter', () => {
  describe('success cases', () => {
    it('resolves a reference page to the reference rule, intent verbatim', () => {
      // ARRANGE
      const verbatim = 'Reference pages are looked up by slug and say how far they can be trusted';
      const expected = { ruleId: 'reference', intent: verbatim };
      // ACT
      const actual = queryFrontmatter('docs/reference/api-limits.md', config);
      // ASSERT
      expect(actual?.rule).toEqual(expected);
    });

    it('names its own config key, never its Package name', () => {
      // ARRANGE
      const expected = 'frontmatter';
      // ACT
      const actual = queryFrontmatter('docs/reference/api-limits.md', config);
      // ASSERT
      expect(actual?.module).toBe(expected);
    });

    it('answers a frontmatter-forbidden rule with nothing else to ask', () => {
      // ARRANGE
      const expected = { frontmatter: 'forbidden' };
      // ACT
      const actual = queryFrontmatter('index.md', config);
      // ASSERT
      expect(actual?.requirements).toEqual(expected);
    });

    it('matches the fileName sugar against a deeply nested file', () => {
      // The sugar this Module offers and the naming Module deliberately
      // withholds — selecting by an exact name is safe here because this Module
      // constrains the file's CONTENTS rather than its name.
      // ARRANGE
      const expected = 'log-files';
      // ACT
      const actual = queryFrontmatter('docs/datasets/log.md', config);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('answers nothing for a path no rule of this Module selects', () => {
      // ARRANGE
      const unclaimed = undefined;
      // ACT
      const actual = queryFrontmatter('README.md', config);
      // ASSERT
      expect(actual).toBe(unclaimed);
    });

    it('answers nothing for a path excluded with no later rule to catch it', () => {
      // `excludeFiles` removes a file from ONE rule. Nothing below claims it,
      // so this Module ends up with no answer rather than falling through.
      // ARRANGE
      const unclaimed = undefined;
      // ACT
      const actual = queryFrontmatter('docs/research/vendor/imported.md', config);
      // ASSERT
      expect(actual).toBe(unclaimed);
    });
  });

  describe('edge cases', () => {
    it('lets the narrower rule written first beat the broad one below it', () => {
      // The exemplar sits above `research` deliberately; this is the pair that
      // proves first-match on real files rather than asserting it.
      // ARRANGE
      const expected = 'provenance-exemplar';
      // ACT
      const actual = queryFrontmatter('docs/research/provenance.md', config);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('strips leading decoration and still selects the same rule', () => {
      // ARRANGE
      const decorated = './docs/reference/api-limits.md';
      const expected = 'reference';
      // ACT
      const actual = queryFrontmatter(decorated, config);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });

    it('answers about a path that does not exist', () => {
      // Nothing here touches the filesystem, which is the whole point: an agent
      // about to author a file cannot be asked to write it first.
      // ARRANGE
      const expected = 'reference';
      // ACT
      const actual = queryFrontmatter('docs/reference/never-written.md', config);
      // ASSERT
      expect(actual?.rule.ruleId).toBe(expected);
    });
  });
});
