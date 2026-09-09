// Integration suite for `--assess`, at the grain a caller sees.
//
// Every case runs against the committed Conformance config, anchored at the
// Conformance root, so what is asserted here is the same surface the
// specification half of that suite freezes.
//
// It holds one case the Conformance suite CANNOT hold: a path with nothing at
// it. A Conformance case IS a document, and this case is the absence of one, so
// there is nothing to put a marker on. ARCH-002 records the gap; this is where
// it is covered.

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../config-loader/load-config.ts';
import { assessPath } from '../assess.ts';

const loaded = loadConfig('fixtures/conformance/valid-test-config.yaml');
if (loaded.config === undefined) throw new Error('the conformance config must load for this suite to mean anything');
const config = loaded.config;

/** The synthetic repo root the config's paths are written relative to. */
const CORPUS_ROOT = fileURLToPath(new URL('../../../../fixtures/conformance', import.meta.url));

/** Written by hand, never read from a clock. */
const NOW = '2026-12-01T00:00:00Z';

const STALE = 'docs/freshness/stale.md';
const FRESH = 'docs/freshness/fresh.md';

describe('assessPath', () => {
  describe('success cases', () => {
    it('answers a stale file in full: the action, the sentence, the evidence and the rule', () => {
      // ARRANGE
      const expected = {
        agentAction: 'REVIEW',
        instruction: 'Re-verify this against the source before quoting it, then move stale_after.',
        state: 'stale',
        source: 'rule',
        evidence: { field: 'stale_after', value: '2026-11-24T00:00:00Z' },
        rule: { ruleId: 'freshness', intent: 'A page that goes out of date says when to stop trusting it' },
      };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: STALE }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers a fresh file with the evidence but no sentence of anyones', () => {
      // `PROCEED` carries the evidence so a reader can check the judgement, and
      // carries no `instruction`: the Operator's sentence belongs to `REVIEW`
      // alone, and this tool writes no prose of its own.
      // ARRANGE
      const expected = {
        agentAction: 'PROCEED',
        state: 'fresh',
        evidence: { field: 'stale_after', value: '2027-06-01T00:00:00Z' },
        rule: { ruleId: 'freshness', intent: 'A page that goes out of date says when to stop trusting it' },
      };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: FRESH }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('asks for a repair when a governed file never said when it goes stale', () => {
      // ARRANGE
      const expected = {
        agentAction: 'FIX_FILE',
        state: 'unassessable',
        rule: { ruleId: 'freshness', intent: 'A page that goes out of date says when to stop trusting it' },
      };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/undated.md' }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('answers about a governed path with nothing at it, naming the rule that will judge it', () => {
      // THE CASE THE CONFORMANCE SUITE CANNOT HOLD. An agent about to create a
      // governed file is told to proceed and told what will judge it, which is
      // the same courtesy `--query` extends to a path that does not exist yet.
      // ARRANGE
      const expected = {
        agentAction: 'PROCEED',
        state: 'absent',
        rule: { ruleId: 'freshness', intent: 'A page that goes out of date says when to stop trusting it' },
      };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/not-written-yet.md' }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('says nothing whatever about a path no rule selects, without opening anything', () => {
      // ARRANGE
      const expected = { agentAction: 'PROCEED', state: 'ungoverned' };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/research/vendor/upstream.md' }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('uses the instant it was given, so the same file answers both ways', () => {
      // The determinism claim, stated as a test: the file does not change
      // between these two calls, and the answer does. Nothing here reads a
      // clock, so both answers are reproducible by hand.
      // ARRANGE
      const beforeExpiry = '2026-01-01T00:00:00Z';
      const afterExpiry = '2027-01-01T00:00:00Z';
      const expected = ['PROCEED', 'REVIEW'];
      // ACT
      const actual = [
        assessPath({ root: CORPUS_ROOT, path: STALE }, config, beforeExpiry).agentAction,
        assessPath({ root: CORPUS_ROOT, path: STALE }, config, afterExpiry).agentAction,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('never opens a directory, because governance is decided before the read', () => {
      // Measured, not assumed: `docs/freshness` is the directory holding three
      // governed documents, and it is itself UNGOVERNED — every glob in the
      // config names `*.md`, so the directory matches nothing and no read is
      // attempted. This is why `readAssessedFile`'s `unreadable` branch cannot
      // be reached from a committed fixture: the only causes left are a
      // permissionless file and a directory named `*.md`, and neither is
      // committable. The branch stays because a permissions failure must not
      // crash the process, and it is honestly uncovered rather than faked.
      // ARRANGE
      const expected = { agentAction: 'PROCEED', state: 'ungoverned' };
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness' }, config, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
