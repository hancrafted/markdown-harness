// Integration suite for the Antigravity provider path: a real minted root, the real built `mh`, the real pull
// command, and a hand-written stand-in for `agy` that takes the real argv and prints a stream shaped from R3's
// recorded envelope. No model, no account, no network. Build beside this run (trap 9): the minted root copies
// `dist/`, which may be a previous build.
//
// The stand-in's stream is UNVERIFIED AGAINST A LIVE SESSION, so a green here proves the wiring (argv reaches the
// process, the stream parses, the file is read back, failures are classified from fields) and not that `agy`
// still prints this shape.

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { deriveArm } from '../../arms/derive-arms.ts';
import { classifySession } from '../classify-session.ts';
import type { DeliverySurface } from '../delivery-surface.ts';
import type { ProbeRecord } from '../host-profile.ts';
import { sourcesFor } from '../mint-guards.ts';
import { runTrial } from '../run-trial.ts';
import { CREDENTIAL_FILES } from '../scratch-home.ts';

const CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SEED = 'evals/suites/steering/seed/research-note';
const STUB = join(CHECKOUT, 'evals/self-test/stub-host.mjs');
const PLACEHOLDER = 'STEERING_CLAUSE_PLACEHOLDER';
const STEERING_MARKER = 'QQ11-2222';
const TARGET = 'docs/research/feature-flags.md';
const PULL_LINE = 'Before you create a markdown file, run `bin/mh query <path>` and follow what it says.';
const MODEL = 'gemini-3.8-flash-low';
const PULL: DeliverySurface = { channel: 'pull', shell: 'query-only', encoding: 'json' };
const configText = readFileSync(join(CHECKOUT, SEED, 'markdown-harness.config.yaml'), 'utf8');

const scratch: string[] = [];
const realHome = process.env.HOME;
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
  process.env.HOME = realHome;
});

interface Options {
  readonly probes?: ProbeRecord;
  readonly home?: string;
}

/** A home that holds the stand-in credential files, which the stand-in reads from HOME as the real agy would. */
function homeWithCredentials(): string {
  const home = mkdtempSync(join(tmpdir(), 'agy-home-'));
  scratch.push(home);
  for (const file of CREDENTIAL_FILES) {
    mkdirSync(dirname(join(home, file)), { recursive: true });
    writeFileSync(join(home, file), 'stand-in token\n');
  }
  return home;
}

const scratchHomes = (): string[] => readdirSync(tmpdir()).filter((name) => name.startsWith('mh-scratch-home-'));

function trial(mode: string, wallClockMs = 20_000, options: Options = {}) {
  const clause = `Put the reference code ${STEERING_MARKER} on its own line.`;
  const derived = deriveArm({ configText, arm: 'steered', substitutes: [{ placeholder: PLACEHOLDER, clause }] });
  const under = mkdtempSync(join(tmpdir(), 'agy-trial-'));
  scratch.push(under);
  return runTrial({
    arm: 'steered',
    surface: PULL,
    pullLine: PULL_LINE,
    sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
    heldOut: [join(CHECKOUT, 'evals/suites/steering/cases')],
    derivedConfig: derived.configText,
    host: {
      name: 'antigravity',
      command: ['node', STUB, '--mode', mode, '--stub-host', 'agy'],
      model: MODEL,
      maxTurns: 4,
      wallClockMs,
      tools: [],
      probes: options.probes ?? {},
      home: options.home ?? '',
    },
    task: `Write a note in ${TARGET}.`,
    steeringMarkers: [
      {
        steeringMarker: STEERING_MARKER,
        sweepExpectation: { kind: 'exactly', occurrences: derived.occurrences[0] ?? 0 },
      },
    ],
    targetPath: TARGET,
    under,
  });
}

const EXPECTATION = {
  apiKeySource: 'unknown',
  expectedPlugins: [],
  permissionMode: 'always-proceed',
  model: MODEL,
};

describe('an Antigravity trial through the stand-in', () => {
  describe('success cases', () => {
    it('reads the stand-in as agy: parses its stream, finds the pull and the write, and reads the file back with the steering marker', () => {
      // ARRANGE
      const kind = 'tool-call';
      const expectedTools = ['Bash', 'Write'];
      // ACT
      const outcome = trial('obey');
      const events = outcome.raw?.parsed.events ?? [];
      const tools = events.flatMap((event) => (event.kind === kind ? [event.tool] : []));
      // ASSERT
      expect(outcome.declared).toBeUndefined();
      expect(tools).toEqual(expectedTools);
      expect(outcome.finalFile).toContain(STEERING_MARKER);
    });

    it('classifies the stand-in session as graded, from the init model and permission mode', () => {
      // ARRANGE
      const expected = { outcome: 'graded' };
      // ACT
      const outcome = trial('obey');
      const verdict = outcome.raw === undefined ? undefined : classifySession(outcome.raw, EXPECTATION);
      // ASSERT
      expect(verdict).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('classifies a sign-in wall as an authentication failure though the process exited 0 and left no result', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'authentication-failure' };
      // ACT
      const outcome = trial('auth-fail');
      const verdict = outcome.raw === undefined ? undefined : classifySession(outcome.raw, EXPECTATION);
      // ASSERT
      expect(verdict).toMatchObject(expected);
    });

    it('classifies an auto-denied write as a permission denial though the stream ended SUCCESS and the exit was 0', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'permission-denied' };
      // ACT
      const outcome = trial('denied');
      const verdict = outcome.raw === undefined ? undefined : classifySession(outcome.raw, EXPECTATION);
      // ASSERT
      expect(verdict).toMatchObject(expected);
      expect(outcome.finalFile).toBeUndefined();
    });

    it('classifies a session that outlives the wall-clock bound as a timeout, the only limit agy has', () => {
      // ARRANGE
      const expected = { outcome: 'instrument-failure', kind: 'wall-clock-timeout' };
      // ACT
      const outcome = trial('slow', 150);
      const verdict = outcome.raw === undefined ? undefined : classifySession(outcome.raw, EXPECTATION);
      // ASSERT
      expect(verdict).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('shows no hook event, because agy hook firing is unprobed and the stand-in runs no hook', () => {
      // ARRANGE
      const forbidden = ['hook-start', 'hook-response'];
      // ACT
      const kinds = (trial('obey').raw?.parsed.events ?? []).map((event) => event.kind);
      // ASSERT
      for (const kind of forbidden) expect(kinds).not.toContain(kind);
    });
  });
});

const SCOPED: ProbeRecord = {
  'scoped-permission-mode': {
    status: 'works',
    detail: 'd',
    recordedAt: 't',
    mode: 'accept-edits',
    permissionMode: 'accept-edits',
  },
};
const SCRATCH: ProbeRecord = { 'scratch-home-credentials': { status: 'works', detail: 'd', recordedAt: 't' } };
const FAILED_SCOPED: ProbeRecord = { 'scoped-permission-mode': { status: 'fails', detail: 'd', recordedAt: 't' } };
const FAILED_SCRATCH: ProbeRecord = { 'scratch-home-credentials': { status: 'fails', detail: 'd', recordedAt: 't' } };

describe('an Antigravity trial under recorded probes', () => {
  describe('success cases', () => {
    it('starts the session under the scoped mode the probe found, so the init event reports it and nothing is skipped', () => {
      // ARRANGE
      const expected = 'accept-edits';
      // ACT
      const outcome = trial('obey', 20_000, { probes: SCOPED });
      // ASSERT
      expect(outcome.raw?.parsed.init?.permissionMode).toBe(expected);
      expect(outcome.finalFile).toContain(STEERING_MARKER);
    });

    it('runs under a scratch home holding the copied credentials when the scratch home probe works, and deletes it', () => {
      // ARRANGE
      process.env.HOME = mkdtempSync(join(tmpdir(), 'agy-empty-'));
      scratch.push(process.env.HOME);
      const before = scratchHomes().length;
      // ACT
      const outcome = trial('needs-credentials', 20_000, { probes: SCRATCH, home: homeWithCredentials() });
      // ASSERT
      expect(outcome.raw?.parsed.result?.isError).toBe(false);
      expect(scratchHomes().length).toBe(before);
    });
  });

  describe('failure cases', () => {
    it('keeps skip-all when the scoped mode probe did not work', () => {
      // ARRANGE
      const expected = 'always-proceed';
      // ACT
      const outcome = trial('obey', 20_000, { probes: FAILED_SCOPED });
      // ASSERT
      expect(outcome.raw?.parsed.init?.permissionMode).toBe(expected);
    });

    it('is not authenticated under a scratch home when the credential files are not there to copy', () => {
      // ARRANGE
      process.env.HOME = homeWithCredentials();
      const empty = mkdtempSync(join(tmpdir(), 'agy-nohome-'));
      scratch.push(empty);
      const expected = { kind: 'authentication-failure' };
      // ACT
      const outcome = trial('needs-credentials', 20_000, { probes: SCRATCH, home: empty });
      const verdict = outcome.raw === undefined ? undefined : classifySession(outcome.raw, EXPECTATION);
      // ASSERT
      expect(verdict).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('runs under the real home when the scratch home probe did not work, so no credential is copied', () => {
      // ARRANGE
      process.env.HOME = homeWithCredentials();
      const before = scratchHomes().length;
      // ACT
      const outcome = trial('needs-credentials', 20_000, { probes: FAILED_SCRATCH, home: '/nowhere' });
      // ASSERT
      expect(outcome.raw?.parsed.result?.isError).toBe(false);
      expect(scratchHomes().length).toBe(before);
    });
  });
});
