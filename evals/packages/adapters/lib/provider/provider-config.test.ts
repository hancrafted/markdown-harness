// Colocated unit test for reading the provider's inputs: nothing defaults.

import { describe, expect, it } from 'vitest';
import {
  derivationArmFor,
  fillClause,
  readCaseVars,
  readCellConfig,
  readRunSettings,
  taskFor,
} from './provider-config.pure.ts';

const CELL = { arm: 'steered', deliveryChannel: 'push', model: 'sonnet', hostName: 'claude-code' };
const VARS = {
  caseId: 'c',
  targetPath: 'docs/a.md',
  seedDir: 's',
  placeholder: 'P',
  clauseTemplate: 'code {steeringMarker}',
  controlPrefix: 'Note: {clause}',
  scopeLevel: '2',
  scopeTitlePattern: '^F$',
};
const ENV = {
  EVALS_CHECKOUT: '/c',
  EVALS_RUN_ID: 'r',
  EVALS_RUN_DIR: '/d',
  EVALS_SEED: 's',
  EVALS_TOOL_VERSION: '0.124.0',
  EVALS_WRAPPER_REVISION: 'abc',
  EVALS_WRAPPER_DIRTY: 'false',
  EVALS_HOST: '{"command":["x"],"maxTurns":4,"wallClockMs":1000,"tools":["Write"]}',
};

describe('provider inputs', () => {
  describe('success cases', () => {
    it('reads a complete cell, case and environment, coercing the scope level to a number', () => {
      // ARRANGE
      const expectedLevel = 2;
      const expectedArm = 'steered';
      const expectedRun = 'r';
      // ACT
      const vars = readCaseVars(VARS);
      const cell = readCellConfig(CELL);
      const settings = readRunSettings(ENV);
      // ASSERT
      expect(vars).toMatchObject({ scopeLevel: expectedLevel });
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
      const expected = ['config.model', 'config.arm'];
      // ACT
      const actual = readCellConfig({ deliveryChannel: 'push', hostName: 'claude-code' });
      // ASSERT
      expect([...(actual as string[])].sort()).toEqual([...expected].sort());
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
