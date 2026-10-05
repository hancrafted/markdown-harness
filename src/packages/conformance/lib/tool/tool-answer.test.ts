import { describe, expect, it } from 'vitest';
import type { ToolRun } from '../../tool-answer.ts';
import { envelopeOf, NO_RESPONSE, refusalOf } from './tool-answer.pure.ts';

const REJECTED = 2;
const FOUND_VIOLATIONS = 1;
const CRASHED = 1;

describe('what one run of the tool answered', () => {
  describe('success cases', () => {
    it('reads no refusal from a run that carries an answer', () => {
      // ARRANGE
      const run: ToolRun = {
        stdout: '{"command":"check","result":{"summary":{"governedFiles":1,"invalidFiles":1,"totalViolations":1}}}',
        stderr: '',
        code: FOUND_VIOLATIONS,
      };
      // ACT
      const actual = refusalOf(run);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('parses the envelope a run printed', () => {
      // ARRANGE
      const run: ToolRun = { stdout: '{"command":"audit","result":{"modules":[]}}', stderr: '', code: 0 };
      const expected = { command: 'audit', result: { modules: [] } };
      // ACT
      const actual = envelopeOf(run);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reads a config-error envelope as a refusal carrying its exit code and every fault in order', () => {
      // ARRANGE
      const run: ToolRun = {
        stdout:
          '{"result":{"error":"CONFIG_REJECTED","faults":[{"code":"CONFIG_NO_MODULE_SECTION","location":"c.yaml"},{"code":"CONFIG_UNRECOGNISED_KEY","location":"body-structure"}]}}',
        stderr: '',
        code: REJECTED,
      };
      const expected = {
        exit: REJECTED,
        error: 'CONFIG_REJECTED',
        faults: [
          { code: 'CONFIG_NO_MODULE_SECTION', location: 'c.yaml' },
          { code: 'CONFIG_UNRECOGNISED_KEY', location: 'body-structure' },
        ],
      };
      // ACT
      const actual = refusalOf(run);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a run that printed no envelope as a refusal naming its crash', () => {
      // A missing build or a thrown error must never read as the refusal a
      // pending test pins, so it keeps its own error name and its stderr.
      // ARRANGE
      const run: ToolRun = { stdout: '', stderr: "Error: Cannot find module 'dist/cli.js'\n", code: CRASHED };
      const expected = {
        exit: CRASHED,
        error: NO_RESPONSE,
        faults: [],
        stderr: "Error: Cannot find module 'dist/cli.js'",
      };
      // ACT
      const actual = refusalOf(run);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads stdout that is not JSON as an empty envelope rather than throwing', () => {
      // ARRANGE
      const run: ToolRun = { stdout: 'not json', stderr: '', code: CRASHED };
      const empty = {};
      // ACT
      const actual = envelopeOf(run);
      // ASSERT
      expect(actual).toEqual(empty);
    });
  });
});
