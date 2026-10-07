// Colocated unit test for the Host harness profiles and the capability gate. The Antigravity probe outcomes come
// from a record a human writes by running the probe tool; with no record every probe is unprobed, so the gate must
// refuse a live run, and what the profile says about isolation and permissions follows the record, not the source.

import { describe, expect, it } from 'vitest';
import {
  HOST_NAMES,
  MATRIX_NAMES,
  NO_PROBES,
  channelRefusal,
  hostNameOfMatrix,
  hostNameOfWrapper,
  isHostName,
  liveRefusal,
  modelFamilyOf,
  profileOf,
  resolveBinary,
} from './host-profile.pure.ts';

type ProbeRecord = Parameters<typeof profileOf>[1];
type ProbeId = keyof ProbeRecord;

const result = (status: 'works' | 'fails', extra: object = {}) => ({
  status,
  detail: 'seen',
  recordedAt: '2026-10-07T00:00:00.000Z',
  ...extra,
});

const IDS: readonly ProbeId[] = ['hook-fires-headless', 'scoped-permission-mode', 'scratch-home-credentials'];
const all = (status: 'works' | 'fails'): ProbeRecord => Object.fromEntries(IDS.map((id) => [id, result(status)]));
const only = (id: ProbeId, status: 'works' | 'fails', extra: object = {}): ProbeRecord => ({
  [id]: result(status, extra),
});

describe('profileOf', () => {
  describe('success cases', () => {
    it('says Claude Code is isolated by flags and has a turn cap', () => {
      // ARRANGE
      const expected = { isolation: 'flags', turnCap: 'enforced', leakedSurface: 'none' };
      // ACT
      const profile = profileOf('claude-code', NO_PROBES);
      // ASSERT
      expect(profile).toMatchObject(expected);
    });

    it('says Antigravity has no isolation, no turn cap and skips every permission while nothing is probed', () => {
      // ARRANGE
      const expected = {
        isolation: 'none',
        turnCap: 'none',
        permissionScope: 'skip-all',
        scopedMode: undefined,
        leakedSurface: 'user-settings; user-permission-allow-list; user-hooks; user-skills; user-mcp; plugin-data',
      };
      // ACT
      const profile = profileOf('antigravity', NO_PROBES);
      // ASSERT
      expect(profile).toMatchObject(expected);
    });

    it('derives scratch-home isolation and no leaked surface when the scratch home probe works', () => {
      // ARRANGE
      const expected = { isolation: 'scratch-home', leakedSurface: 'none' };
      // ACT
      const profile = profileOf('antigravity', only('scratch-home-credentials', 'works'));
      // ASSERT
      expect(profile).toMatchObject(expected);
    });

    it('derives the scoped permission mode, and the init mode to expect, when its probe works', () => {
      // ARRANGE
      const record = only('scoped-permission-mode', 'works', { mode: 'accept-edits', permissionMode: 'accept-edits' });
      const expected = { permissionScope: 'scoped:accept-edits', scopedMode: 'accept-edits' };
      const initMode = 'accept-edits';
      // ACT
      const profile = profileOf('antigravity', record);
      // ASSERT
      expect(profile).toMatchObject(expected);
      expect(profile.initPermissionMode).toBe(initMode);
    });

    it('carries the status of each probe from the record, in the order they must be probed', () => {
      // ARRANGE
      const record = { ...only('hook-fires-headless', 'works'), ...only('scoped-permission-mode', 'fails') };
      const expected = [
        ['hook-fires-headless', 'works'],
        ['scoped-permission-mode', 'fails'],
        ['scratch-home-credentials', 'unprobed'],
      ];
      // ACT
      const actual = profileOf('antigravity', record).probes.map((probe) => [probe.id, probe.status]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('keeps skip-all and the real home when the scoped mode and scratch home probes fail', () => {
      // ARRANGE
      const expected = { isolation: 'none', permissionScope: 'skip-all', scopedMode: undefined };
      const leaked = 'user-hooks';
      // ACT
      const profile = profileOf('antigravity', all('fails'));
      // ASSERT
      expect(profile).toMatchObject(expected);
      expect(profile.leakedSurface).toContain(leaked);
    });

    it('does not let Antigravity claim a field its init event never carries', () => {
      // ARRANGE
      const expected = ['hostVersion', 'authSource', 'skillCount', 'serverCount', 'pluginCount'];
      // ACT
      const actual = profileOf('antigravity', NO_PROBES).unobservable;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('does not trust a scoped mode recorded as works with no mode named, and keeps skip-all', () => {
      // ARRANGE
      const expected = { permissionScope: 'skip-all', scopedMode: undefined };
      // ACT
      const profile = profileOf('antigravity', only('scoped-permission-mode', 'works'));
      // ASSERT
      expect(profile).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('lists nothing as unobservable for Claude Code', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = profileOf('claude-code', NO_PROBES).unobservable;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lets no record change what Claude Code is: it has no probes', () => {
      // ARRANGE
      const expected = profileOf('claude-code', NO_PROBES);
      // ACT
      const actual = profileOf('claude-code', all('fails'));
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the binary by its bare name, so the shell alias that adds permission flags is never relied on', () => {
      // ARRANGE
      const expected = ['claude', 'agy'];
      // ACT
      const actual = [profileOf('claude-code', NO_PROBES).binary, profileOf('antigravity', NO_PROBES).binary];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('the two Host harness vocabularies', () => {
  describe('success cases', () => {
    it('maps the wrapper flag value to the profile name and back through the profile', () => {
      // ARRANGE
      const expected = [
        ['claude', 'claude-code'],
        ['agy', 'antigravity'],
      ];
      // ACT
      const actual = HOST_NAMES.map((name) => [
        profileOf(name, NO_PROBES).wrapperName,
        hostNameOfWrapper(profileOf(name, NO_PROBES).wrapperName),
      ]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('names the Host harness a matrix belongs to', () => {
      // ARRANGE
      const expected = ['claude-code', 'claude-code', 'claude-code', 'claude-code', 'antigravity'];
      // ACT
      const actual = (['push', 'pull', 'carriers', 'assess', 'agy'] as const).map(hostNameOfMatrix);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('lists every matrix once, derived from the profiles', () => {
      // ARRANGE
      const expected = ['push', 'pull', 'carriers', 'assess', 'agy'];
      // ACT
      const actual = MATRIX_NAMES;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a name that is no Host harness', () => {
      // ARRANGE
      const values = ['gemini', undefined, 7, 'agy'];
      // ACT
      const actual = values.map(isHostName);
      // ASSERT
      expect(actual).toEqual([false, false, false, false]);
    });
  });

  describe('edge cases', () => {
    it('accepts exactly the names in the table', () => {
      // ARRANGE
      const expected = [true, true];
      // ACT
      const actual = ['claude-code', 'antigravity'].map(isHostName);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('resolveBinary', () => {
  const profile = profileOf('antigravity', NO_PROBES);

  describe('success cases', () => {
    it('uses the bare binary name when nothing overrides it', () => {
      // ARRANGE
      const expected = 'agy';
      // ACT
      const actual = resolveBinary(profile, undefined, {});
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets the profile variable override the name', () => {
      // ARRANGE
      const expected = '/opt/homebrew/bin/agy';
      // ACT
      const actual = resolveBinary(profile, undefined, { [profile.binaryVariable]: '/opt/homebrew/bin/agy' });
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets the flag win over the variable', () => {
      // ARRANGE
      const expected = '/x/agy';
      // ACT
      const actual = resolveBinary(profile, '/x/agy', { [profile.binaryVariable]: '/y/agy' });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('ignores an empty variable instead of spawning an empty command', () => {
      // ARRANGE
      const expected = 'agy';
      // ACT
      const actual = resolveBinary(profile, undefined, { [profile.binaryVariable]: '' });
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('gives each Host harness its own variable', () => {
      // ARRANGE
      const claude = profileOf('claude-code', NO_PROBES);
      const distinct = 2;
      // ACT
      const names = [claude.binaryVariable, profile.binaryVariable];
      // ASSERT
      expect(new Set(names).size).toBe(distinct);
    });
  });
});

describe('liveRefusal', () => {
  describe('success cases', () => {
    it('lets a Claude Code live run start, which has no probes outstanding', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = liveRefusal(profileOf('claude-code', NO_PROBES));
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets Antigravity start once every probe is recorded, whatever each answered', () => {
      // ARRANGE
      const records = [all('works'), all('fails')];
      // ACT
      const actual = records.map((record) => liveRefusal(profileOf('antigravity', record)));
      // ASSERT
      expect(actual).toEqual([undefined, undefined]);
    });
  });

  describe('failure cases', () => {
    it('refuses a live Antigravity run while its probes are unprobed, naming each one', () => {
      // ARRANGE
      const expected =
        'antigravity has unprobed capabilities: hook-fires-headless, scoped-permission-mode, scratch-home-credentials; run `npm run evals:agy-probe -- <probe-id>` for each, in that order, and the result is recorded before a live run';
      // ACT
      const actual = liveRefusal(profileOf('antigravity', NO_PROBES));
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses while any one probe is still unprobed', () => {
      // ARRANGE
      const record = { ...all('works'), 'hook-fires-headless': undefined };
      const named = 'hook-fires-headless';
      // ACT
      const actual = liveRefusal(profileOf('antigravity', record));
      // ASSERT
      expect(actual).toContain(named);
    });
  });

  describe('edge cases', () => {
    it('names only the probes that are still outstanding', () => {
      // ARRANGE
      const record = { ...all('works'), 'scoped-permission-mode': undefined };
      const outstanding = 'scoped-permission-mode';
      const recorded = 'hook-fires-headless';
      // ACT
      const actual = liveRefusal(profileOf('antigravity', record)) ?? '';
      // ASSERT
      expect(actual).toContain(outstanding);
      expect(actual).not.toContain(recorded);
    });
  });
});

describe('channelRefusal', () => {
  describe('success cases', () => {
    it('accepts the pull channel for Antigravity, which the canary proves at run time', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = channelRefusal(profileOf('antigravity', NO_PROBES), 'pull');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('accepts every channel for Claude Code', () => {
      // ARRANGE
      const claude = profileOf('claude-code', NO_PROBES);
      // ACT
      const refusals = (['push', 'pull', 'assess', 'user-turn'] as const).map((channel) =>
        channelRefusal(claude, channel),
      );
      // ASSERT
      expect(refusals).toEqual([undefined, undefined, undefined, undefined]);
    });
  });

  describe('failure cases', () => {
    it('refuses the assess channel for Antigravity whatever its probes say, because no post-read hook root is built', () => {
      // ARRANGE
      const expected = 'antigravity assess: no hook root is built for this Host harness yet';
      // ACT
      const actual = channelRefusal(profileOf('antigravity', NO_PROBES), 'assess');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses the push channel for Antigravity while hook firing is unprobed', () => {
      // ARRANGE
      const expected = 'antigravity push: hook-fires-headless is unprobed, so no canary can be owed for it';
      // ACT
      const actual = channelRefusal(profileOf('antigravity', NO_PROBES), 'push');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses the push channel for Antigravity when hook firing was probed and failed', () => {
      // ARRANGE
      const expected = 'antigravity push: hook-fires-headless is fails, so no canary can be owed for it';
      // ACT
      const actual = channelRefusal(profileOf('antigravity', only('hook-fires-headless', 'fails')), 'push');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('still refuses push for Antigravity after the probe works, because the two gates overlap on purpose: the probe says hooks fire, the table says no hook root is built', () => {
      // ARRANGE
      const probed = profileOf('antigravity', only('hook-fires-headless', 'works'));
      const expected = 'antigravity push: no hook root is built for this Host harness yet';
      // ACT
      const actual = channelRefusal(probed, 'push');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('modelFamilyOf', () => {
  describe('success cases', () => {
    it('names the family of a Gemini and a Claude model id', () => {
      // ARRANGE
      const expected = ['gemini', 'claude'];
      // ACT
      const actual = ['gemini-3.8-flash-low', 'claude-sonnet-5-5-medium'].map(modelFamilyOf);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports an id of no known family as other, never as a guess', () => {
      // ARRANGE
      const expected = 'other';
      // ACT
      const actual = modelFamilyOf('gpt-oss-120b-medium');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reads an unobserved model as unknown', () => {
      // ARRANGE
      const expected = 'unknown';
      // ACT
      const actual = modelFamilyOf('unknown');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
