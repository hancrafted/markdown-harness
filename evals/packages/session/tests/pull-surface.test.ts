// Integration suite for the pull surface: the pull command is written and run for
// real, over a hand-built answer, so each encoding is shown to differ. The pull
// trial tests below mint real roots, so build beside this run (trap 9).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { deriveArm } from '../../arms/derive-arms.ts';
import { localiseRung } from '../../grading/localise-rung.ts';
import type { DeliverySurface } from '../delivery-surface.ts';
import { pullShimSource } from '../delivery-surface.ts';
import { sourcesFor } from '../mint-guards.ts';
import { mintRoot } from '../mint-root.ts';
import { observeSession } from '../observe-session.ts';
import { runTrial } from '../run-trial.ts';

const CHECKOUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SEED = 'evals/suites/steering/seed/research-note';
const STUB = join(CHECKOUT, 'evals/self-test/stub-host.mjs');
const PLACEHOLDER = 'STEERING_CLAUSE_PLACEHOLDER';
const STEERING_MARKER = 'QQ11-2222';
const TARGET = 'docs/research/feature-flags.md';
const PULL_LINE = 'Before you create a markdown file, run `bin/mh query <path>` and follow what it says.';
const configText = readFileSync(join(CHECKOUT, SEED, 'markdown-harness.config.yaml'), 'utf8');

const scratch: string[] = [];
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const ANSWER = JSON.stringify({
  result: {
    modules: [{ rule: { intent: 'Rule words.' }, requirements: { headings: [{ intent: 'Heading words.' }] } }],
  },
});

/** A root holding a fake `mh` CLI that prints a fixed answer, and the shim under test beside it. */
function rootWithShim(encoding: Parameters<typeof pullShimSource>[0]): string {
  const root = mkdtempSync(join(tmpdir(), 'shim-'));
  scratch.push(root);
  const cli = join(root, 'node_modules/@hancrafted/markdown-harness/dist/packages/cli/cli.js');
  mkdirSync(join(cli, '..'), { recursive: true });
  writeFileSync(cli, `process.stdout.write(${JSON.stringify(ANSWER)});`);
  mkdirSync(join(root, 'bin'));
  writeFileSync(join(root, 'bin/mh'), pullShimSource(encoding));
  return root;
}

function runShim(encoding: Parameters<typeof pullShimSource>[0], args: string[]): string {
  const root = rootWithShim(encoding);
  return spawnSync(process.execPath, [join(root, 'bin/mh'), ...args], { cwd: root, encoding: 'utf8' }).stdout;
}

describe('pullShimSource', () => {
  describe('success cases', () => {
    it('json: prints the answer untouched', () => {
      // ARRANGE
      const expected = ANSWER;
      // ACT
      const actual = runShim('json', ['query', 'docs/a.md']);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('intent-only: prints every intent in the answer and nothing of its structure', () => {
      // ARRANGE
      const expected = 'Rule words.\nHeading words.\n';
      // ACT
      const actual = runShim('intent-only', ['query', 'docs/a.md']);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('prose: says there is nothing to render when the hook script is absent, rather than printing the JSON', () => {
      // ARRANGE
      const expected = 'No steering content for this path.\n';
      // ACT
      const actual = runShim('prose', ['query', 'docs/a.md']);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('passes any command other than query through untouched, whatever the encoding', () => {
      // ARRANGE
      const expected = ANSWER;
      // ACT
      const actual = runShim('intent-only', ['check']);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

const pull = (encoding: 'json' | 'prose' | 'intent-only'): DeliverySurface => ({
  channel: 'pull',
  shell: 'query-only',
  encoding,
});
const PUSH_WIDENED: DeliverySurface = { channel: 'push', shell: 'widened', encoding: 'hook-prose' };

function derived(arm: 'steered' | 'neutralised') {
  const clause = `Put the reference code ${STEERING_MARKER} on its own line.`;
  return deriveArm({ configText, arm, substitutes: [{ placeholder: PLACEHOLDER, clause }] });
}

function trialOn(surface: DeliverySurface, arm: 'steered' | 'neutralised', mode: string) {
  const { configText: derivedConfig, occurrences } = derived(arm);
  return runTrial({
    arm,
    surface,
    pullLine: PULL_LINE,
    sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
    heldOut: [join(CHECKOUT, 'evals/suites/steering/cases')],
    derivedConfig,
    host: {
      command: ['node', STUB, '--mode', mode],
      model: 'stub',
      maxTurns: 4,
      wallClockMs: 20_000,
      tools: ['Read', 'Write', 'Edit'],
    },
    task: `Write a note in ${TARGET}.`,
    steeringMarkers: [
      {
        steeringMarker: STEERING_MARKER,
        sweepExpectation: arm === 'steered' ? { kind: 'exactly', occurrences: occurrences[0] ?? 0 } : { kind: 'none' },
      },
    ],
    targetPath: TARGET,
  });
}

function observed(surface: DeliverySurface, outcome: ReturnType<typeof trialOn>) {
  return observeSession({
    arm: 'steered',
    surface,
    events: outcome.raw?.parsed.events ?? [],
    steeringMarkers: [STEERING_MARKER],
    targetPath: TARGET,
    root: outcome.root ?? '',
    finalFile: outcome.finalFile,
    injectionPattern: /prompt injection/i,
  });
}

describe('minting a pull root', () => {
  describe('success cases', () => {
    it('writes an executable pull command and the instruction line, wires no hook, and ships no hook script for raw JSON', () => {
      // ARRANGE
      const result = mintRoot({
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        arm: 'steered',
        surface: pull('json'),
        pullLine: PULL_LINE,
        derivedConfig: derived('steered').configText,
        heldOut: [],
      });
      if (result.ok) scratch.push(result.root);
      const root = result.ok ? result.root : '';
      const executableBits = 0o111;
      // ACT
      const actual = {
        executable: statSync(join(root, 'bin/mh')).mode & executableBits,
        line: readFileSync(join(root, 'AGENTS.md'), 'utf8').trimEnd().endsWith(PULL_LINE),
        settings: existsSync(join(root, '.claude/settings.json')),
        hookScript: existsSync(join(root, '.agents/skills/markdown-harness/scripts/query-hook.mjs')),
      };
      // ASSERT
      expect(actual).toEqual({ executable: executableBits, line: true, settings: false, hookScript: false });
    });

    it('ships the hook script for the prose pull command, which renders through it', () => {
      // ARRANGE
      const result = mintRoot({
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        arm: 'steered',
        surface: pull('prose'),
        pullLine: PULL_LINE,
        derivedConfig: derived('steered').configText,
        heldOut: [],
      });
      if (result.ok) scratch.push(result.root);
      // ACT
      const shipped =
        result.ok && existsSync(join(result.root, '.agents/skills/markdown-harness/scripts/query-hook.mjs'));
      // ASSERT
      expect(shipped).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('writes no pull command and no instruction line for a push root', () => {
      // ARRANGE
      const result = mintRoot({
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        arm: 'steered',
        surface: PUSH_WIDENED,
        pullLine: PULL_LINE,
        derivedConfig: derived('steered').configText,
        heldOut: [],
      });
      if (result.ok) scratch.push(result.root);
      const root = result.ok ? result.root : '';
      // ACT
      const actual = {
        shim: existsSync(join(root, 'bin/mh')),
        line: readFileSync(join(root, 'AGENTS.md'), 'utf8').includes(PULL_LINE),
        settings: existsSync(join(root, '.claude/settings.json')),
      };
      // ASSERT
      expect(actual).toEqual({ shim: false, line: false, settings: true });
    });
  });

  describe('edge cases', () => {
    it('writes neither the hook nor the pull command for a user-turn root', () => {
      // ARRANGE
      const result = mintRoot({
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        arm: 'control',
        surface: { channel: 'user-turn', shell: 'none', encoding: 'none' },
        pullLine: PULL_LINE,
        derivedConfig: derived('neutralised').configText,
        heldOut: [],
      });
      if (result.ok) scratch.push(result.root);
      const root = result.ok ? result.root : '';
      // ACT
      const actual = [existsSync(join(root, 'bin/mh')), existsSync(join(root, '.claude/settings.json'))];
      // ASSERT
      expect(actual).toEqual([false, false]);
    });
  });
});

describe('runTrial over a pull surface', () => {
  describe('success cases', () => {
    it.each(['json', 'prose', 'intent-only'] as const)(
      'steered, %s: the agent runs the pull command, follows it, and the final file holds the steering marker',
      (encoding) => {
        // ARRANGE
        const expected = { declared: undefined, hasSteeringMarker: true, delivered: true };
        // ACT
        const outcome = trialOn(pull(encoding), 'steered', 'obey');
        // ASSERT
        expect({
          declared: outcome.declared,
          hasSteeringMarker: outcome.finalFile?.includes(STEERING_MARKER),
          delivered: observed(pull(encoding), outcome).delivered,
        }).toEqual(expected);
      },
    );

    it('intent-neutralised: the pull command answers with no steering marker, and nothing is followed', () => {
      // ARRANGE
      const expected = { declared: undefined, hasSteeringMarker: false };
      // ACT
      const outcome = trialOn(pull('json'), 'neutralised', 'obey');
      // ASSERT
      expect({ declared: outcome.declared, hasSteeringMarker: outcome.finalFile?.includes(STEERING_MARKER) }).toEqual(
        expected,
      );
    });
  });

  describe('failure cases', () => {
    it('localises an agent that never ran the pull command to rung 3', () => {
      // ARRANGE
      const surface = pull('json');
      const expected = { kind: 'rung', rung: 3 };
      // ACT
      const outcome = trialOn(surface, 'steered', 'ignore');
      // ASSERT
      expect(localiseRung(observed(surface, outcome).observations)).toEqual(expected);
    });

    it('declares rung 2 failed, with no model spent, when the prose rendering loses the steering marker', () => {
      // ARRANGE
      // a frontmatter-only placeholder, which the hook's prose rendering never speaks for
      const frontmatterOnly = configText.replace(
        'Research says what it is and what it is about, so a reader can choose it without opening it.',
        'Research says what it is. FRONTMATTER_SLOT',
      );
      const { configText: derivedConfig } = deriveArm({
        configText: frontmatterOnly.replace(' STEERING_CLAUSE_PLACEHOLDER', ''),
        arm: 'steered',
        substitutes: [{ placeholder: 'FRONTMATTER_SLOT', clause: `Add ${STEERING_MARKER}.` }],
      });
      const expectedKind = 'rung-2-failed';
      // ACT
      const outcome = runTrial({
        arm: 'steered',
        surface: pull('prose'),
        pullLine: PULL_LINE,
        sources: sourcesFor({ checkout: CHECKOUT, seedRelative: SEED }),
        heldOut: [],
        derivedConfig,
        host: { command: ['node', STUB], model: 'stub', maxTurns: 4, wallClockMs: 20_000, tools: ['Read'] },
        task: 'x',
        steeringMarkers: [{ steeringMarker: STEERING_MARKER, sweepExpectation: { kind: 'exactly', occurrences: 1 } }],
        targetPath: TARGET,
      });
      // ASSERT
      expect(outcome.declared?.kind).toBe(expectedKind);
      expect(outcome.raw).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('cannot localise a raw JSON null from one cell, because rung 6 needs the encoding contrast', () => {
      // ARRANGE
      const surface = pull('json');
      const expected = { kind: 'cannot-localise', blockedBy: 6 };
      // ACT
      const outcome = trialOn(surface, 'steered', 'deaf');
      // ASSERT
      expect(localiseRung(observed(surface, outcome).observations)).toEqual(expected);
    });
  });
});

describe('runTrial over a widened shell (R0 D6)', () => {
  describe('edge cases', () => {
    it('still delivers through the hook to an agent that writes with the Write tool, since the shell is only allowed', () => {
      // ARRANGE
      const expected = { delivered: true, tool: 'Write', hit: true };
      // ACT
      const outcome = trialOn(PUSH_WIDENED, 'steered', 'obey');
      const seen = observed(PUSH_WIDENED, outcome);
      // ASSERT
      expect({
        delivered: seen.delivered,
        tool: seen.creatingTool,
        hit: outcome.finalFile?.includes(STEERING_MARKER),
      }).toEqual(expected);
    });
  });

  describe('success cases', () => {
    it('counts a file created through the shell as the file at the target path, and names Bash as the coverage hole', () => {
      // ARRANGE
      const expected = { rung: { kind: 'rung', rung: 3 }, tool: 'Bash', shell: true, created: true };
      // ACT
      const outcome = trialOn(PUSH_WIDENED, 'steered', 'shell');
      const seen = observed(PUSH_WIDENED, outcome);
      // ASSERT
      expect({
        rung: localiseRung(seen.observations),
        tool: seen.creatingTool,
        shell: seen.shellCreated,
        created: outcome.finalFile !== undefined,
      }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('is not exercised when the shell is withheld: the same stub mode writes with the Write tool and the hook fires', () => {
      // ARRANGE
      const surface: DeliverySurface = { channel: 'push', shell: 'none', encoding: 'hook-prose' };
      const expected = { tool: 'Write', shell: false, delivered: true };
      // ACT
      const seen = observed(surface, trialOn(surface, 'steered', 'shell'));
      // ASSERT
      expect({ tool: seen.creatingTool, shell: seen.shellCreated, delivered: seen.delivered }).toEqual(expected);
    });
  });
});
