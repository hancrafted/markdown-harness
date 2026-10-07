// Colocated unit test for reading the provider's inputs: nothing defaults.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { NO_PROBES } from '../../../session/host-profile.ts';
import {
  cellLabelOf,
  derivationArmFor,
  expectationFor,
  fillClause,
  readCaseVars,
  readCellConfig,
  readRunSettings,
  taskFor,
} from './provider-config.pure.ts';

const CELL = {
  arm: 'steered',
  deliveryChannel: 'push',
  shell: 'none',
  encoding: 'hook-prose',
  model: 'sonnet',
  hostName: 'claude-code',
};
const VARS = {
  caseId: 'c',
  kind: 'steer',
  targetPath: 'docs/a.md',
  seedDir: 's',
  carriers: [{ placeholder: 'P', clauseTemplate: 'code {steeringMarker}', scope: { level: 2, titlePattern: '^F$' } }],
  controlPrefix: 'Note: {clause}',
  pullLine: 'Run bin/mh query.',
};
const ENV = {
  EVALS_CHECKOUT: '/c',
  EVALS_RUN_ID: 'r',
  EVALS_RUN_DIR: '/d',
  EVALS_SEED: 's',
  EVALS_TOOL_VERSION: '0.124.0',
  EVALS_WRAPPER_REVISION: 'abc',
  EVALS_WRAPPER_DIRTY: 'false',
  EVALS_HOST: '{"command":["x"],"maxTurns":4,"wallClockMs":1000,"tools":["Write"],"probes":{},"home":"/h"}',
};

describe('expectationFor', () => {
  describe('failure cases', () => {
    it('does not hold a Claude Code cell to a model id, because it is asked for by alias', () => {
      // ARRANGE
      const forbidden = 'model';
      // ACT
      const actual = Object.keys(
        expectationFor({ ...CELL, hostName: 'claude-code', model: 'sonnet' } as never, NO_PROBES),
      );
      // ASSERT
      expect(actual).not.toContain(forbidden);
    });
  });

  describe('edge cases', () => {
    it('holds an Antigravity cell to whatever model id its cell names', () => {
      // ARRANGE
      const expected = 'claude-sonnet-5-5-medium';
      // ACT
      const actual = expectationFor({ ...CELL, hostName: 'antigravity', model: expected } as never, NO_PROBES).model;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('success cases', () => {
    it('expects subscription authentication, the two Claude Code plugins and no model id for a Claude Code alias', () => {
      // ARRANGE
      const expected = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
      // ACT
      const actual = expectationFor({ ...CELL, hostName: 'claude-code' } as never, NO_PROBES);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('expects an Antigravity session to show the scoped permission mode the probe recorded, not the skip-all one', () => {
      // ARRANGE
      const probes = {
        'scoped-permission-mode': {
          status: 'works',
          detail: 'd',
          recordedAt: 't',
          mode: 'accept-edits',
          permissionMode: 'accept-edits',
        },
      } as const;
      const expected = 'accept-edits';
      // ACT
      const actual = expectationFor({ ...CELL, hostName: 'antigravity', model: 'g' } as never, probes).permissionMode;
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('expects an Antigravity session to run the requested model id under the skip-permissions mode', () => {
      // ARRANGE
      const expected = {
        apiKeySource: 'unknown',
        expectedPlugins: [],
        permissionMode: 'always-proceed',
        model: 'gemini-3.8-flash-low',
      };
      // ACT
      const actual = expectationFor(
        { ...CELL, hostName: 'antigravity', model: 'gemini-3.8-flash-low' } as never,
        NO_PROBES,
      );
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('provider inputs', () => {
  describe('success cases', () => {
    it('reads a complete cell, case and environment', () => {
      // ARRANGE
      const expectedLevel = 'c';
      const expectedArm = 'steered';
      const expectedRun = 'r';
      // ACT
      const vars = readCaseVars(VARS);
      const cell = readCellConfig(CELL);
      const settings = readRunSettings(ENV);
      // ASSERT
      expect(vars).toMatchObject({ caseId: expectedLevel });
      expect(cell).toMatchObject({ arm: expectedArm });
      expect(settings).toMatchObject({ runId: expectedRun });
    });

    it('fills the steering marker into a clause, and prefixes it to the control arm alone', () => {
      // ARRANGE
      const clause = fillClause('code {steeringMarker}', 'AB12-3456');
      const expected = ['Note: code AB12-3456 do it', 'do it'];
      // ACT
      const actual = [
        taskFor({ arm: 'control', task: 'do it', controlPrefix: 'Note: {clause}', clause }),
        taskFor({ arm: 'steered', task: 'do it', controlPrefix: 'Note: {clause}', clause }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('derives the steered config for the steered arm and the intent-neutralised config for the other two', () => {
      // ARRANGE
      const expected = ['steered', 'neutralised', 'neutralised'];
      // ACT
      const actual = [derivationArmFor('steered'), derivationArmFor('neutralised'), derivationArmFor('control')];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names every missing field rather than defaulting it', () => {
      // ARRANGE
      const expected = ['config.model', 'config.arm', 'config.shell', 'config.encoding'];
      // ACT
      const actual = readCellConfig({ deliveryChannel: 'push', hostName: 'claude-code' });
      // ASSERT
      expect([...(actual as string[])].sort()).toEqual([...expected].sort());
    });

    it('refuses a cell whose three surface fields disagree, naming what is wrong', () => {
      // ARRANGE
      const pullWithNoShell = { ...CELL, deliveryChannel: 'pull', shell: 'none', encoding: 'json' };
      const expected = /shell none is not a pull surface/;
      // ACT
      const actual = (readCellConfig(pullWithNoShell) as string[]).join(' ');
      // ASSERT
      expect(actual).toMatch(expected);
    });

    it('refuses a cell naming a Host harness this instrument has no profile for', () => {
      // ARRANGE
      const expected = ['config.hostName (codex is not one of claude-code, antigravity)'];
      // ACT
      const actual = readCellConfig({ ...CELL, hostName: 'codex' });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a case with no tested carrier, and one whose carrier lacks its clause', () => {
      // ARRANGE
      const expected = [['vars.carriers'], ['vars.carriers[0].clauseTemplate']];
      // ACT
      const actual = [
        readCaseVars({ ...VARS, carriers: [] }),
        readCaseVars({ ...VARS, carriers: [{ placeholder: 'P', scope: { frontmatter: true } }] }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses a case with no kind or an unknown one, naming what a kind is', () => {
      // ARRANGE
      const expected = [['vars.kind'], ['vars.kind (audit is not steer or repair)']];
      // ACT
      const actual = [readCaseVars({ ...VARS, kind: undefined }), readCaseVars({ ...VARS, kind: 'audit' })];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an environment the wrapper did not fully set', () => {
      // ARRANGE
      const expected = ['env.EVALS_SEED'];
      // ACT
      const actual = readRunSettings({ ...ENV, EVALS_SEED: '' });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('accepts both case kinds', () => {
      // ARRANGE
      const expected = ['steer', 'repair'];
      // ACT
      const actual = ['steer', 'repair'].map((kind) => (readCaseVars({ ...VARS, kind }) as { kind: string }).kind);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names each cell by what distinguishes it: channel, widened shell, pull encoding and arm', () => {
      // ARRANGE
      const named = (cell: object) => cellLabelOf({ ...CELL, ...cell } as never);
      const expected = ['push-steered', 'push-shell-steered', 'pull-json-neutralised', 'user-turn-control'];
      // ACT
      const actual = [
        named({}),
        named({ shell: 'widened' }),
        named({ deliveryChannel: 'pull', shell: 'query-only', encoding: 'json', arm: 'neutralised' }),
        named({ deliveryChannel: 'user-turn', shell: 'none', encoding: 'none', arm: 'control' }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names an Antigravity cell with its Host harness first, so its sidecar never collides with a Claude Code cell', () => {
      // ARRANGE
      const agy = { hostName: 'antigravity', deliveryChannel: 'pull', shell: 'query-only', encoding: 'json' };
      const expected = 'antigravity-pull-json-steered';
      // ACT
      const actual = cellLabelOf({ ...CELL, ...agy } as never);
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('treats an absent case var as missing even when others are present', () => {
      // ARRANGE
      const expected = ['vars.caseId'];
      // ACT
      const actual = readCaseVars({ ...VARS, caseId: undefined });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DEFAULT_TRIALS = 8;
const SESSION_LIMIT = 40;

interface Matrix {
  readonly file: string;
  readonly providers: { readonly config: unknown }[];
  readonly tests: string;
}

function matrices(): Matrix[] {
  return readdirSync(EVALS)
    .filter((name) => /^promptfooconfig(\.[a-z]+)?\.yaml$/.test(name))
    .map((file) => ({ file, ...(parse(readFileSync(join(EVALS, file), 'utf8')) as Omit<Matrix, 'file'>) }));
}

function casesIn(matrix: Matrix): number {
  const path = join(EVALS, matrix.tests.replace(/^file:\/\//, ''));
  return (parse(readFileSync(path, 'utf8')) as unknown[]).length;
}

describe('the committed matrices', () => {
  describe('success cases', () => {
    it('hold only cells the provider accepts, each with its own label', () => {
      // ARRANGE
      const all = matrices();
      const floor = 3;
      // ACT
      const refused = all.flatMap((matrix) =>
        matrix.providers.flatMap((provider) => {
          const cell = readCellConfig(provider.config);
          return Array.isArray(cell) ? [`${matrix.file}: ${cell.join(' ')}`] : [];
        }),
      );
      const duplicated = all.flatMap((matrix) => {
        const labels = matrix.providers.map((provider) => cellLabelOf(readCellConfig(provider.config) as never));
        return labels
          .filter((label, index) => labels.indexOf(label) !== index)
          .map((label) => `${matrix.file}: ${label}`);
      });
      // ASSERT
      expect(all.length).toBeGreaterThanOrEqual(floor);
      expect(refused).toEqual([]);
      expect(duplicated).toEqual([]);
    });

    it('stay at or under the session budget at the default trial count', () => {
      // ARRANGE
      const sizes = matrices().map((matrix) => matrix.providers.length * casesIn(matrix) * DEFAULT_TRIALS);
      // ACT
      const over = sizes.filter((size) => size > SESSION_LIMIT);
      // ASSERT
      expect(over).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('goes red on a cell whose shell and channel disagree', () => {
      // ARRANGE
      const broken = {
        arm: 'steered',
        deliveryChannel: 'pull',
        shell: 'none',
        encoding: 'json',
        model: 'm',
        hostName: 'claude-code',
      };
      // ACT
      const cell = readCellConfig(broken);
      // ASSERT
      expect(Array.isArray(cell)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('reaches a push cell with a widened shell, a pull cell for each encoding, and a two-carrier case', () => {
      // ARRANGE
      const cells = matrices().flatMap((matrix) =>
        matrix.providers.map((provider) => cellLabelOf(readCellConfig(provider.config) as never)),
      );
      const expected = ['push-shell-steered', 'pull-json-steered', 'pull-prose-steered', 'pull-intent-only-steered'];
      // ACT
      const missing = expected.filter((label) => !cells.includes(label));
      // ASSERT
      expect(missing).toEqual([]);
    });
  });
});
