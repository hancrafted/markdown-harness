// Colocated unit test for what stands between a probe id and a session: the consent flag, the order, and the
// stand-in's guards. The first test of each group is the one that goes red when the guard is removed.

import { describe, expect, it } from 'vitest';
import { probeRefusal } from './probe-gate.pure.ts';

type ProbeGateInput = Parameters<typeof probeRefusal>[0];

const WORKS = { status: 'works', detail: 'd', recordedAt: 't' } as const;
const BASE = {
  consentCredentialCopy: false,
  hostBinary: undefined,
  stub: false,
  stubMode: 'obey',
  record: undefined,
  home: undefined,
  model: undefined,
} as const;
const input = (probe: ProbeGateInput['args']['probe'], extra: object = {}): ProbeGateInput => ({
  args: { ...BASE, probe, ...extra },
  consentNotice: 'COPIES: /a -> /b',
});
const EARLIER = { 'hook-fires-headless': WORKS, 'scoped-permission-mode': WORKS } as const;

describe('probeRefusal consent', () => {
  describe('success cases', () => {
    it('lets the credential probe start once consent is given and the earlier probes are recorded', () => {
      // ARRANGE
      const given = input('scratch-home-credentials', { consentCredentialCopy: true });
      // ACT
      const actual = probeRefusal(given, EARLIER);
      // ASSERT
      expect(actual).toBeUndefined();
    });

    it('asks for no consent for the probes that copy nothing', () => {
      // ARRANGE
      const probes = ['hook-fires-headless', 'scoped-permission-mode'] as const;
      // ACT
      const actual = probes.map((probe) => probeRefusal(input(probe), { 'hook-fires-headless': WORKS }));
      // ASSERT
      expect(actual).toEqual([undefined, undefined]);
    });
  });

  describe('failure cases', () => {
    it('refuses the credential probe without --consent-credential-copy, printing the files it would copy', () => {
      // ARRANGE
      const expected = expect.stringContaining('COPIES: /a -> /b');
      // ACT
      const actual = probeRefusal(input('scratch-home-credentials'), EARLIER);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses without the flag even when no earlier probe is recorded, so the files are never reached by order alone', () => {
      // ARRANGE
      const expected = expect.stringContaining('--consent-credential-copy');
      // ACT
      const actual = probeRefusal(input('scratch-home-credentials'), {});
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not take any other flag, the stand-in switch included, as consent', () => {
      // ARRANGE
      const sneaky = input('scratch-home-credentials', { stub: true, record: '/r', home: '/h' });
      const expected = expect.stringContaining('--consent-credential-copy');
      // ACT
      const actual = probeRefusal(sneaky, EARLIER);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('probeRefusal order', () => {
  describe('success cases', () => {
    it('lets the first probe run with nothing recorded', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = probeRefusal(input('hook-fires-headless'), {});
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets a probe be re-run once it and the ones before it are recorded', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = probeRefusal(input('scoped-permission-mode'), EARLIER);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses the second probe until the first is recorded, naming it', () => {
      // ARRANGE
      const expected = expect.stringContaining('hook-fires-headless');
      // ACT
      const actual = probeRefusal(input('scoped-permission-mode'), {});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the third probe while the second is missing, even with the first recorded', () => {
      // ARRANGE
      const given = input('scratch-home-credentials', { consentCredentialCopy: true });
      const expected = expect.stringContaining('scoped-permission-mode');
      // ACT
      const actual = probeRefusal(given, { 'hook-fires-headless': WORKS });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('counts a failed earlier probe as recorded, because a failure is an answer', () => {
      // ARRANGE
      const record = { 'hook-fires-headless': { ...WORKS, status: 'fails' }, 'scoped-permission-mode': WORKS } as const;
      // ACT
      const actual = probeRefusal(input('scratch-home-credentials', { consentCredentialCopy: true }), record);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });
});

describe('probeRefusal stand-in guards', () => {
  describe('success cases', () => {
    it('lets the stand-in run with a record of its own', () => {
      // ARRANGE
      const given = input('hook-fires-headless', { stub: true, record: '/tmp/r.json' });
      // ACT
      const actual = probeRefusal(given, {});
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('refuses the stand-in without its own record, so it never writes the real one', () => {
      // ARRANGE
      const expected = expect.stringContaining('--record');
      // ACT
      const actual = probeRefusal(input('hook-fires-headless', { stub: true }), {});
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses the stand-in credential probe without its own home, so it never copies the real files', () => {
      // ARRANGE
      const given = input('scratch-home-credentials', { stub: true, record: '/r', consentCredentialCopy: true });
      const expected = expect.stringContaining('--home');
      // ACT
      const actual = probeRefusal(given, EARLIER);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not hold a live run to the stand-in guards', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = probeRefusal(input('hook-fires-headless'), {});
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
