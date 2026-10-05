// The `integrated` tier's runner, under `fixtures/conformance/integrated/`.
//
// The one tier where two Modules govern one tree, and so the one place
// composition is a contract rather than a demo: a file both Modules govern
// counts once, findings nest in DECLARED Module order whatever order the config
// wrote its sections in, a file one Module governs is passed by the other, and a
// missing `type` is reported by the Module that constrains it and silently
// selects nothing in the Module that selects on it.
//
// A PROCESS-BOUNDARY test by specification (#221): it spawns the compiled `mh`
// with `--root` and `--config` written exactly as below, because the response
// echoes both as typed, and compares the response with `expected-check.json`.
// It then asks `--query` for every path `expected-query.json` freezes, which is
// composition seen from the Steering side.
// Parsed and deep-compared rather than byte-compared: the listing states that key
// order inside an object is not part of the contract. Build before running this
// file alone (trap 9 in docs/agents/verification.md).
//
// The response alone cannot tell a PASSES file from an UNGOVERNED one, so the
// markers carry that half: the response's files are exactly the FAILS cases,
// and its governed count is the PASSES plus FAILS tally.

import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { readTextIn } from '../../foundation/read-text.ts';
import { casesIn, tierRoot } from '../case-corpus.ts';
import { casesStating, FAILS, PASSES, UNGOVERNED } from '../case-marker.ts';
import { tierForRunner } from '../tier-record.ts';
import type { ToolEnvelope, ToolRun } from '../tool-answer.ts';
import { envelopeOf, refusalOf, toolEntry } from '../tool-answer.ts';

const TIER = tierForRunner(import.meta.url);
if (TIER.caseKind !== 'markdown') throw new Error(`${TIER.name} is not a markdown tier`);

const CORPUS_ROOT = tierRoot(TIER.name);
const TYPED_ROOT = `fixtures/conformance/${TIER.name}`;
const TYPED_CONFIG = `${TYPED_ROOT}/${TIER.configFile}`;
const FROZEN_FILE = 'expected-check.json';
const QUERY_FILE = 'expected-query.json';

const frozenText = readTextIn(CORPUS_ROOT, FROZEN_FILE);
if (frozenText.kind !== 'text') throw new Error(`${FROZEN_FILE} in the ${TIER.name} tier is ${frozenText.kind}`);
const frozen = JSON.parse(frozenText.text) as ToolEnvelope;

const queryText = readTextIn(CORPUS_ROOT, QUERY_FILE);
if (queryText.kind !== 'text') throw new Error(`${QUERY_FILE} in the ${TIER.name} tier is ${queryText.kind}`);
const frozenQueries = JSON.parse(queryText.text) as Record<string, ToolEnvelope>;

const corpus = casesIn(TIER.name);
const stated = (verdict: string): string[] => [...casesStating(TIER.name, verdict)];

const spawned = spawnSync(process.execPath, [toolEntry(), '--check', '--root', TYPED_ROOT, '--config', TYPED_CONFIG], {
  encoding: 'utf8',
});
const run: ToolRun = { stdout: spawned.stdout, stderr: spawned.stderr, code: spawned.status };

/** Stdout parsed, or an empty envelope when there is nothing to parse. */
function answered(): ToolEnvelope {
  return envelopeOf(run);
}

describe('the integrated tier at the process boundary', () => {
  describe('success cases', () => {
    it('answers --check with the frozen whole-corpus response and exits 1', () => {
      // ARRANGE
      const expected = { code: 1, refusal: undefined, response: frozen };
      // ACT
      const actual = { code: run.code, refusal: refusalOf(run), response: answered() };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each(Object.keys(frozenQueries))('answers --query %s with the frozen response and exits 0', (path) => {
      // ARRANGE
      const expected = { code: 0, refusal: undefined, response: frozenQueries[path] };
      // ACT
      const asked = spawnSync(process.execPath, [toolEntry(), '--query', path, '--config', TYPED_CONFIG], {
        encoding: 'utf8',
      });
      const queried: ToolRun = { stdout: asked.stdout, stderr: asked.stderr, code: asked.status };
      const actual = { code: queried.code, refusal: refusalOf(queried), response: envelopeOf(queried) };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports exactly the cases whose marker says FAILS', () => {
      // ARRANGE
      const expected = { refusal: undefined, files: [...stated(FAILS)].sort() };
      // ACT
      const actual = { refusal: refusalOf(run), files: (answered().result?.files ?? []).map((file) => file.path) };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts every PASSES and FAILS case as governed, and no UNGOVERNED one', () => {
      // `governedFiles` is a UNION across Modules, so a file both govern counts
      // once — the one claim a single-Module tier could not tell from a sum.
      // ARRANGE
      const expected = {
        refusal: undefined,
        governedFiles: stated(PASSES).length + stated(FAILS).length,
        invalidFiles: stated(FAILS).length,
      };
      // ACT
      const summary = answered().result?.summary;
      const actual = {
        refusal: refusalOf(run),
        governedFiles: summary?.governedFiles,
        invalidFiles: summary?.invalidFiles,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('enumerates every Conformance case the suite declares', () => {
      // ARRANGE
      const declaredCases = TIER.caseCount;
      // ACT
      const enumerated = corpus.length;
      // ASSERT
      expect(enumerated).toBe(declaredCases);
    });

    it('writes no two case paths that differ only by case', () => {
      // A case-insensitive checkout would fold two such files into one.
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const folded = corpus.map((path) => path.toLowerCase());
      const colliding = corpus.filter((_, index) => folded.indexOf(folded[index]) !== index);
      // ASSERT
      expect(colliding).toEqual(none);
    });

    it('tallies the verdicts the spec states', () => {
      // #221: 18 cases, of which 5 PASSES, 12 FAILS and 1 UNGOVERNED; #225 extends it to 25 cases,
      // of which 7 PASSES, 16 FAILS and 2 UNGOVERNED; #227 extends it to 29 cases, of which 9 PASSES,
      // 18 FAILS and 2 UNGOVERNED.
      // ARRANGE
      const expected = { passes: 9, fails: 18, ungoverned: 2 };
      // ACT
      const actual = {
        passes: stated(PASSES).length,
        fails: stated(FAILS).length,
        ungoverned: stated(UNGOVERNED).length,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('freezes a response that agrees with the markers, so the spec holds together before any tool is asked', () => {
      // The frozen response and the markers were written apart. Held to each
      // other here, tool-free, so the tool-asking tests above are red for the
      // tool's sake and never because the spec contradicts itself.
      // ARRANGE
      const expected = {
        root: TYPED_ROOT,
        config: TYPED_CONFIG,
        files: [...stated(FAILS)].sort(),
        governedFiles: stated(PASSES).length + stated(FAILS).length,
        invalidFiles: stated(FAILS).length,
      };
      // ACT
      const actual = {
        root: frozen.root,
        config: frozen.config,
        files: (frozen.result?.files ?? []).map((file) => file.path),
        governedFiles: frozen.result?.summary?.governedFiles,
        invalidFiles: frozen.result?.summary?.invalidFiles,
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('exercises all three verdicts and both Modules, so no claim above is vacuous', () => {
      // ARRANGE
      const everyVerdict = [PASSES, FAILS, UNGOVERNED];
      const bothModules = ['body-structure', 'frontmatter'];
      // ACT
      const exercised = everyVerdict.filter((verdict) => stated(verdict).length > 0);
      const modules = [
        ...new Set((frozen.result?.files ?? []).flatMap((file) => file.modules.map((block) => block.module))),
      ].sort();
      // ASSERT
      expect(exercised).toEqual(everyVerdict);
      expect(modules).toEqual(bothModules);
    });
  });
});
