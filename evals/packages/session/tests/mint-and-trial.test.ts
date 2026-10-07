// Integration suite for the session Package: entry points only. It mints real
// roots, runs the real built `mh`, the real hook script and a hand-written stub
// Host harness, and proves each guard red against an input constructed below the
// mint. The built `mh` is read from dist/, so build beside this run (trap 9).

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { deriveArm } from '../../arms/derive-arms.ts';
import { sourcesFor } from '../mint-guards.ts';
import { mintRoot } from '../mint-root.ts';
import { runTrial } from '../run-trial.ts';

const CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SEED = 'evals/suites/steering/seed/research-note';
const HELD_OUT = [join(CHECKOUT, 'evals/suites/steering/cases')];
const STUB = join(CHECKOUT, 'evals/self-test/stub-host.mjs');
const PLACEHOLDER = 'STEERING_CLAUSE_PLACEHOLDER';
const STEERING_MARKER = 'QQ11-2222';
const CLAUSE = `Put the reference code ${STEERING_MARKER} on its own line.`;
const TARGET = 'docs/research/feature-flags.md';

const configText = readFileSync(join(CHECKOUT, SEED, 'markdown-harness.config.yaml'), 'utf8');
const derived = (arm: 'steered' | 'neutralised') =>
  deriveArm({ configText, arm, substitutes: [{ placeholder: PLACEHOLDER, clause: CLAUSE }] });

const PUSH = { channel: 'push', shell: 'none', encoding: 'hook-prose' } as const;
const USER_TURN = { channel: 'user-turn', shell: 'none', encoding: 'none' } as const;
const PULL_LINE = 'Before you create a markdown file, run `bin/mh query <path>` and follow what it says.';
const surfaceOf = (arm: string) => (arm === 'control' ? USER_TURN : PUSH);

const scratch: string[] = [];
function sandbox(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mint-'));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function mint(arm: 'steered' | 'neutralised' | 'control', under?: string) {
  const config = derived(arm === 'steered' ? 'steered' : 'neutralised').configText;
  return mintRoot({
    sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
    arm,
    surface: surfaceOf(arm),
    pullLine: PULL_LINE,
    derivedConfig: config,
    heldOut: HELD_OUT,
    under,
  });
}

function host(mode: string, log?: string) {
  const command = ['node', STUB, '--mode', mode, ...(log === undefined ? [] : ['--log', log])];
  return { command, model: 'stub', maxTurns: 4, wallClockMs: 20_000, tools: ['Read', 'Write', 'Edit'] };
}

function trial(arm: 'steered' | 'neutralised' | 'control', mode = 'obey') {
  const { configText: derivedConfig, substitutions } = derived(arm === 'steered' ? 'steered' : 'neutralised');
  const task = arm === 'control' ? `Note: ${CLAUSE} Write a note in ${TARGET}.` : `Write a note in ${TARGET}.`;
  const sweepExpectation =
    arm === 'steered' ? ({ kind: 'exactly', occurrences: substitutions } as const) : ({ kind: 'none' } as const);
  return runTrial({
    arm,
    surface: surfaceOf(arm),
    pullLine: PULL_LINE,
    sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
    heldOut: HELD_OUT,
    derivedConfig,
    host: host(mode),
    task,
    steeringMarkers: [{ steeringMarker: STEERING_MARKER, sweepExpectation }],
    targetPath: TARGET,
  });
}

describe('mintRoot', () => {
  describe('success cases', () => {
    it('mints an opaque, copied root with AGENTS.md alone, no symlink and no cases directory', () => {
      // ARRANGE
      const result = mint('steered');
      const present = 'AGENTS.md';
      const absent = ['CLAUDE.md', 'cases'];
      // ACT
      const names = result.ok ? readdirSync(result.root) : [];
      if (result.ok) scratch.push(result.root);
      // ASSERT
      expect(result.ok).toBe(true);
      expect(names).toContain(present);
      for (const name of absent) expect(names).not.toContain(name);
    });

    it('wires the unmodified hook script for a hook arm and nothing for the trusted-prompt control', () => {
      // ARRANGE
      const steered = mint('steered');
      const control = mint('control');
      for (const result of [steered, control]) if (result.ok) scratch.push(result.root);
      const settings = (result: ReturnType<typeof mint>) =>
        result.ok && existsSync(join(result.root, '.claude/settings.json'));
      const script = (result: ReturnType<typeof mint>) =>
        result.ok && existsSync(join(result.root, '.agents/skills/markdown-harness/scripts/query-hook.mjs'));
      // ACT
      const actual = [settings(steered), script(steered), settings(control), script(control)];
      // ASSERT
      expect(actual).toEqual([true, true, false, false]);
    });
  });

  describe('failure cases', () => {
    it('refuses to mint when a parent directory holds an instruction file (red by a stray one)', () => {
      // ARRANGE
      const parent = sandbox();
      writeFileSync(join(parent, 'AGENTS.md'), 'stray');
      const under = join(parent, 'inner');
      mkdirSync(under);
      const expected = /instruction file in a parent/;
      const separator = '; ';
      // ACT
      const result = mint('steered', under);
      // ASSERT
      expect(result.ok).toBe(false);
      expect(result.ok ? '' : result.refusals.join(separator)).toMatch(expected);
    });

    it('mints cleanly under the same parent once the stray file is gone (the control for the red case)', () => {
      // ARRANGE
      const parent = sandbox();
      const under = join(parent, 'inner');
      mkdirSync(under);
      // ACT
      const result = mint('steered', under);
      // ASSERT
      expect(result.ok).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('copies the built mh by content, so no link into the checkout survives', () => {
      // ARRANGE
      const result = mint('steered');
      if (result.ok) scratch.push(result.root);
      const entry = result.ok
        ? join(result.root, 'node_modules/@hancrafted/markdown-harness/dist/packages/cli/cli.js')
        : '';
      // ACT
      const linked = result.ok && existsSync(entry) && resolve(entry) !== entry;
      // ASSERT
      expect(existsSync(entry)).toBe(true);
      expect(linked).toBe(false);
    });
  });
});

describe('runTrial', () => {
  describe('success cases', () => {
    it('steered: the hook delivers, the stub revises, and the final file holds the steering marker', () => {
      // ARRANGE
      const expected = { declared: undefined, hasSteeringMarker: true };
      // ACT
      const outcome = trial('steered');
      // ASSERT
      expect({ declared: outcome.declared, hasSteeringMarker: outcome.finalFile?.includes(STEERING_MARKER) }).toEqual(
        expected,
      );
    });

    it('intent-neutralised: nothing to follow, so the final file lacks the steering marker', () => {
      // ARRANGE
      const expected = { declared: undefined, hasSteeringMarker: false };
      // ACT
      const outcome = trial('neutralised');
      // ASSERT
      expect({ declared: outcome.declared, hasSteeringMarker: outcome.finalFile?.includes(STEERING_MARKER) }).toEqual(
        expected,
      );
    });

    it('trusted-prompt control: the steering marker comes from the user turn with no hook at all', () => {
      // ARRANGE
      const expected = { declared: undefined, hasSteeringMarker: true };
      // ACT
      const outcome = trial('control');
      // ASSERT
      expect({ declared: outcome.declared, hasSteeringMarker: outcome.finalFile?.includes(STEERING_MARKER) }).toEqual(
        expected,
      );
    });
  });

  describe('failure cases', () => {
    it('declares rung 1 failed, naming no model spent, when the steering marker is not where the arm needs it', () => {
      // ARRANGE
      const wrong = { ...derived('neutralised') };
      const expected = 'rung-1-failed';
      // ACT
      const outcome = runTrial({
        arm: 'steered',
        surface: PUSH,
        pullLine: PULL_LINE,
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        heldOut: HELD_OUT,
        derivedConfig: wrong.configText,
        host: host('obey'),
        task: 'x',
        steeringMarkers: [{ steeringMarker: STEERING_MARKER, sweepExpectation: { kind: 'none' } }],
        targetPath: TARGET,
      });
      // ASSERT
      expect(outcome.declared?.kind).toBe(expected);
      expect(outcome.raw).toBeUndefined();
    });

    it('declares the leak sweep failed when the root holds the steering marker where it must not (neutralised arm)', () => {
      // ARRANGE
      const leaking = derived('steered').configText;
      const expected = 'mint-refused';
      // ACT
      const outcome = runTrial({
        arm: 'neutralised',
        surface: PUSH,
        pullLine: PULL_LINE,
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        heldOut: HELD_OUT,
        derivedConfig: leaking,
        host: host('obey'),
        task: 'x',
        steeringMarkers: [{ steeringMarker: STEERING_MARKER, sweepExpectation: { kind: 'none' } }],
        targetPath: TARGET,
      });
      // ASSERT
      expect(outcome.declared?.kind).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps an authentication failure as a raw record for the classifier, with exit code 0 read as nothing', () => {
      // ARRANGE
      const expected = 'api_error';
      // ACT
      const outcome = trial('steered', 'auth-fail');
      // ASSERT
      expect(outcome.raw?.parsed.result?.terminalReason).toBe(expected);
    });
  });
});
