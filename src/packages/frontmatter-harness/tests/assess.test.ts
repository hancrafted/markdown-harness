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

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../foundation/load-config.ts';
import { assessPath } from '../assess.ts';
import { frontmatterModule } from '../module.ts';

// Loaded through this Module's own descriptor, which is also what makes the
// section below typed: `sectionFor` keys on the descriptor, so what comes back
// is the section this Module's own validation earned and nothing else.
const loaded = loadConfig('fixtures/conformance/frontmatter/valid-test-config.yaml', [frontmatterModule]);
if (loaded.config === undefined) throw new Error('the conformance config must load for this suite to mean anything');
const section = loaded.config.sectionFor(frontmatterModule);
if (section === undefined)
  throw new Error('the conformance config must name this Module for this suite to mean anything');

/** The synthetic repo root the config's paths are written relative to: the tier. */
const CORPUS_ROOT = fileURLToPath(new URL('../../../../fixtures/conformance/frontmatter', import.meta.url));

/** Written by hand, never read from a clock. */
const NOW = '2026-12-01T00:00:00Z';

const STALE = 'docs/freshness/stale.md';
const FRESH = 'docs/freshness/fresh.md';

let unreadableRoot = '';

beforeAll(() => {
  unreadableRoot = mkdtempSync(join(tmpdir(), 'mh-assess-unreadable-'));
  mkdirSync(join(unreadableRoot, 'docs', 'freshness', 'unreadable.md'), { recursive: true });
});

afterAll(() => {
  rmSync(unreadableRoot, { recursive: true, force: true });
});

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
      const actual = assessPath({ root: CORPUS_ROOT, path: STALE }, section, NOW);
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
      const actual = assessPath({ root: CORPUS_ROOT, path: FRESH }, section, NOW);
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
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/undated.md' }, section, NOW);
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
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness/not-written-yet.md' }, section, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('keeps an unreadable governed file distinct from a file with no freshness claim', () => {
      // A directory with a markdown name is readable only as an error, so this
      // reaches the gate's third answer without relying on permission bits.
      // ARRANGE
      const expected = {
        agentAction: 'FIX_FILE',
        state: 'unreadable',
        rule: { ruleId: 'freshness', intent: 'A page that goes out of date says when to stop trusting it' },
      };
      // ACT
      const actual = assessPath({ root: unreadableRoot, path: 'docs/freshness/unreadable.md' }, section, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('passes by a path no rule selects, without opening anything', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/research/vendor/upstream.md' }, section, NOW);
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
        assessPath({ root: CORPUS_ROOT, path: STALE }, section, beforeExpiry)?.agentAction,
        assessPath({ root: CORPUS_ROOT, path: STALE }, section, afterExpiry)?.agentAction,
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('never opens an ungoverned directory, because governance is decided before the read', () => {
      // Measured, not assumed: `docs/freshness` is a directory, and it is
      // UNGOVERNED — the config names markdown paths only. The failure case
      // plants a directory called `unreadable.md`, so the gate's third answer
      // is covered without making a permanent Conformance case from a
      // non-document.
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = assessPath({ root: CORPUS_ROOT, path: 'docs/freshness' }, section, NOW);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
