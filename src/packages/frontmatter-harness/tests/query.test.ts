// Integration suite for `--query`, at the grain a caller sees.
//
// Every case runs against the committed conformance config rather than a rule
// written for the occasion, so the ordering assertions are made about the same
// file the rest of the suite calls a complete surface.

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config-loader/load-config.ts';
import { queryPath } from '../query.ts';

const loaded = loadConfig('fixtures/conformance/valid-test-config.yaml');
if (loaded.config === undefined) throw new Error('the conformance config must load for this suite to mean anything');
const config = loaded.config;

const GOVERNED = 'governed';
const INVISIBLE = 'invisible';

describe('queryPath', () => {
  describe('success cases', () => {
    it('resolves a reference page to the reference rule, intent verbatim', () => {
      // ARRANGE
      const verbatim = 'Reference pages are looked up by slug and say how far they can be trusted';
      const expected = { ruleId: 'reference', intent: verbatim };
      // ACT
      const actual = queryPath('docs/reference/api-limits.md', config);
      // ASSERT
      expect(actual.governance).toBe(GOVERNED);
      expect(actual.governance === GOVERNED ? actual.rule : undefined).toEqual(expected);
    });

    it('answers a frontmatter-forbidden rule with nothing else to ask', () => {
      // ARRANGE
      const expected = { frontmatter: 'forbidden' };
      // ACT
      const actual = queryPath('index.md', config);
      // ASSERT
      expect(actual.governance === GOVERNED ? actual.requirements : undefined).toEqual(expected);
    });

    it('matches the fileName sugar against a deeply nested file', () => {
      // ARRANGE
      const expected = 'log-files';
      // ACT
      const actual = queryPath('docs/datasets/log.md', config);
      // ASSERT
      expect(actual.governance === GOVERNED ? actual.rule.ruleId : undefined).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('answers invisible for a path no rule selects', () => {
      // ARRANGE
      const expected = INVISIBLE;
      // ACT
      const actual = queryPath('README.md', config);
      // ASSERT
      expect(actual.governance).toBe(expected);
    });

    it('answers invisible for a path excluded with no later rule to catch it', () => {
      // `excludeFiles` removes a file from ONE rule. Nothing below claims it,
      // so the file ends up ungoverned rather than falling through.
      // ARRANGE
      const expected = INVISIBLE;
      // ACT
      const actual = queryPath('docs/research/vendor/imported.md', config);
      // ASSERT
      expect(actual.governance).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('lets the narrower rule written first beat the broad one below it', () => {
      // The exemplar sits above `research` deliberately; this is the pair that
      // proves first-match on real files rather than asserting it.
      // ARRANGE
      const expected = 'provenance-exemplar';
      // ACT
      const actual = queryPath('docs/research/provenance.md', config);
      // ASSERT
      expect(actual.governance === GOVERNED ? actual.rule.ruleId : undefined).toBe(expected);
    });

    it('strips leading decoration and still selects the same rule', () => {
      // The expected values are written out by hand rather than taken from a
      // second `queryPath` call: comparing two outputs of the subject would
      // pass just as happily if both were wrong in the same way.
      // ARRANGE
      const decorated = './docs/reference/api-limits.md';
      const normalised = 'docs/reference/api-limits.md';
      const expected = 'reference';
      // ACT
      const actual = queryPath(decorated, config);
      // ASSERT
      expect(actual.path).toBe(normalised);
      expect(actual.governance === GOVERNED ? actual.rule.ruleId : undefined).toBe(expected);
    });

    it('answers about a path that does not exist', () => {
      // Nothing here touches the filesystem, which is the whole point: an agent
      // about to author a file cannot be asked to write it first.
      // ARRANGE
      const expected = 'reference';
      // ACT
      const actual = queryPath('docs/reference/never-written.md', config);
      // ASSERT
      expect(actual.governance === GOVERNED ? actual.rule.ruleId : undefined).toBe(expected);
    });
  });
});
