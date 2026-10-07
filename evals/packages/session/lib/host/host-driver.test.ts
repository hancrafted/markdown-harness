// Colocated unit test for the host driver table: one entry per Host harness holding its argv builder, child
// environment, stream parser and init expectation, so no caller switches on the Host harness name itself.

import { describe, expect, it } from 'vitest';
import { NO_PROBES, profileOf } from '../../host-profile.ts';
import { driverOf } from './host-driver.pure.ts';

const INPUT = {
  task: 'write a note',
  model: 'm',
  maxTurns: 6,
  wallClockMs: 600_000,
  tools: ['Read', 'Write'],
  allowedTools: [],
  scopedMode: undefined,
};

describe('driverOf', () => {
  describe('success cases', () => {
    it('builds Claude Code argv with its turn cap and tool list', () => {
      // ARRANGE
      const expected = ['--max-turns', '6', '--tools', 'Read,Write'];
      // ACT
      const argv = driverOf('claude-code').argv(INPUT);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });

    it('builds Antigravity argv with a print timeout and no turn cap', () => {
      // ARRANGE
      const expected = ['--print-timeout', '595s'];
      const forbidden = '--max-turns';
      // ACT
      const argv = driverOf('antigravity').argv(INPUT);
      // ASSERT
      expect(argv.slice(-expected.length)).toEqual(expected);
      expect(argv).not.toContain(forbidden);
    });

    it('passes the scoped mode to Antigravity argv and skips nothing', () => {
      // ARRANGE
      const expected = ['--mode', 'accept-edits'];
      const skipped = '--dangerously-skip-permissions';
      // ACT
      const argv = driverOf('antigravity').argv({ ...INPUT, scopedMode: 'accept-edits' });
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
      expect(argv).not.toContain(skipped);
    });

    it('parses each Host harness stream in its own dialect', () => {
      // ARRANGE
      const claude = JSON.stringify({ type: 'system', subtype: 'init' });
      const agy = JSON.stringify({ event: 'init', init: {} });
      // ACT
      const kinds = [
        driverOf('claude-code').parse(claude).init !== undefined,
        driverOf('antigravity').parse(agy).init !== undefined,
        driverOf('claude-code').parse(agy).init !== undefined,
      ];
      // ASSERT
      expect(kinds).toEqual([true, true, false]);
    });
  });

  describe('failure cases', () => {
    it('gives Claude Code the scratch home argument no effect, since flags isolate it', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/Users/h' };
      const expected = '/Users/h';
      // ACT
      const env = driverOf('claude-code').environment(parent, '/tmp/s');
      // ASSERT
      expect(env.HOME).toBe(expected);
    });

    it('gives Antigravity the scratch home when one is given, and the real home otherwise', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/Users/h' };
      const expected = ['/tmp/s', '/Users/h'];
      // ACT
      const homes = [
        driverOf('antigravity').environment(parent, '/tmp/s').HOME,
        driverOf('antigravity').environment(parent, undefined).HOME,
      ];
      // ASSERT
      expect(homes).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('expects Claude Code to show no API key and its two builtin plugins, and no pinned model or mode', () => {
      // ARRANGE
      const expected = { apiKeySource: 'none', expectedPlugins: ['cc-plugin-agents-md', 'cc-plugin-telemetry'] };
      // ACT
      const actual = driverOf('claude-code').initExpectation('sonnet', profileOf('claude-code', NO_PROBES));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('expects Antigravity to show the requested model and the permission mode the profile derived', () => {
      // ARRANGE
      const scoped = profileOf('antigravity', {
        'scoped-permission-mode': {
          status: 'works',
          detail: 'd',
          recordedAt: 't',
          mode: 'accept-edits',
          permissionMode: 'accept-edits',
        },
      });
      const expected = [
        { apiKeySource: 'unknown', expectedPlugins: [], permissionMode: 'always-proceed', model: 'g' },
        { apiKeySource: 'unknown', expectedPlugins: [], permissionMode: 'accept-edits', model: 'g' },
      ];
      // ACT
      const actual = [
        driverOf('antigravity').initExpectation('g', profileOf('antigravity', NO_PROBES)),
        driverOf('antigravity').initExpectation('g', scoped),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
