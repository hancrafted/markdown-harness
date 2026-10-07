// Colocated unit test for the probe tool's arguments: the probe id, the consent flag and the stand-in switches.

import { describe, expect, it } from 'vitest';
import { parseProbeArgs } from './probe-args.pure.ts';

describe('parseProbeArgs', () => {
  describe('success cases', () => {
    it('reads a probe id with no flags, defaulting to a live run without consent', () => {
      // ARRANGE
      const expected = { probe: 'hook-fires-headless', consentCredentialCopy: false, stub: false, stubMode: 'obey' };
      // ACT
      const actual = parseProbeArgs(['hook-fires-headless']);
      // ASSERT
      expect(actual).toMatchObject({ ok: true, args: expected });
    });

    it('reads the consent flag, a binary, a record, a home and a model', () => {
      // ARRANGE
      const argv = [
        'scratch-home-credentials',
        '--consent-credential-copy',
        '--host-binary',
        '/x/agy',
        '--record',
        '/r.json',
        '--home',
        '/h',
        '--model',
        'm',
      ];
      const expected = {
        probe: 'scratch-home-credentials',
        consentCredentialCopy: true,
        hostBinary: '/x/agy',
        record: '/r.json',
        home: '/h',
        model: 'm',
      };
      // ACT
      const actual = parseProbeArgs(argv);
      // ASSERT
      expect(actual).toMatchObject({ ok: true, args: expected });
    });

    it('reads the stand-in switches', () => {
      // ARRANGE
      const expected = { stub: true, stubMode: 'hook-silent' };
      // ACT
      const actual = parseProbeArgs(['hook-fires-headless', '--stub', '--stub-mode', 'hook-silent']);
      // ASSERT
      expect(actual).toMatchObject({ ok: true, args: expected });
    });
  });

  describe('failure cases', () => {
    it.each([
      [[]],
      [['no-such-probe']],
      [['hook-fires-headless', 'scoped-permission-mode']],
      [['hook-fires-headless', '--unknown']],
      [['hook-fires-headless', '--record']],
    ])('refuses %j as misuse', (argv) => {
      // ARRANGE
      const expected = { ok: false };
      // ACT
      const actual = parseProbeArgs(argv);
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('names the probe ids it knows when the id is wrong', () => {
      // ARRANGE
      const expected = 'hook-fires-headless, scoped-permission-mode, scratch-home-credentials';
      // ACT
      const actual = parseProbeArgs(['nope']);
      // ASSERT
      expect(actual.ok ? '' : actual.problem).toContain(expected);
    });
  });

  describe('edge cases', () => {
    it('takes the probe id from any position among the flags', () => {
      // ARRANGE
      const expected = 'scoped-permission-mode';
      // ACT
      const actual = parseProbeArgs(['--stub', 'scoped-permission-mode']);
      // ASSERT
      expect(actual.ok ? actual.args.probe : '').toBe(expected);
    });
  });
});
