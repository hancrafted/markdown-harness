// Colocated unit test for the Host harness profiles and the capability gate. The Antigravity probes are
// unprobed in this repository: nobody has run them against an account, so the gate must refuse a live run.

import { describe, expect, it } from 'vitest';
import { channelRefusal, liveRefusal, modelFamilyOf, profileOf } from './host-profile.pure.ts';

describe('profileOf', () => {
  describe('success cases', () => {
    it('says Claude Code is isolated by flags and has a turn cap', () => {
      // ARRANGE
      const expected = { isolation: 'flags', turnCap: 'enforced', leakedSurface: 'none' };
      // ACT
      const profile = profileOf('claude-code');
      // ASSERT
      expect(profile).toMatchObject(expected);
    });

    it('says Antigravity has no isolation flag, no turn cap, and names what leaks in', () => {
      // ARRANGE
      const expected = {
        isolation: 'none',
        turnCap: 'none',
        leakedSurface: 'user-settings; user-permission-allow-list; user-hooks; user-skills; user-mcp; plugin-data',
      };
      // ACT
      const profile = profileOf('antigravity');
      // ASSERT
      expect(profile).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('does not let Antigravity claim a field its init event never carries', () => {
      // ARRANGE
      const expected = ['hostVersion', 'authSource', 'skillCount', 'serverCount', 'pluginCount'];
      // ACT
      const actual = profileOf('antigravity').unobservable;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('lists nothing as unobservable for Claude Code', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const actual = profileOf('claude-code').unobservable;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

describe('liveRefusal', () => {
  describe('success cases', () => {
    it('lets a Claude Code live run start, which has no probes outstanding', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = liveRefusal(profileOf('claude-code'));
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('lets Antigravity start once every probe is recorded as works', () => {
      // ARRANGE
      const base = profileOf('antigravity');
      const probed = { ...base, probes: base.probes.map((probe) => ({ ...probe, status: 'works' as const })) };
      // ACT
      const actual = liveRefusal(probed);
      // ASSERT
      expect(actual).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('refuses a live Antigravity run while its probes are unprobed, naming each one', () => {
      // ARRANGE
      const expected =
        'antigravity has unprobed capabilities: hook-fires-headless, scoped-permission-mode, scratch-home-credentials; Han runs them against the account and records the result before a live run';
      // ACT
      const actual = liveRefusal(profileOf('antigravity'));
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('refuses while any one probe is still unprobed', () => {
      // ARRANGE
      const base = profileOf('antigravity');
      const partial = {
        ...base,
        probes: base.probes.map((probe, index) => ({
          ...probe,
          status: index === 0 ? ('unprobed' as const) : ('works' as const),
        })),
      };
      const named = 'hook-fires-headless';
      // ACT
      const actual = liveRefusal(partial);
      // ASSERT
      expect(actual).toContain(named);
    });

    it('refuses a probe that was run and failed', () => {
      // ARRANGE
      const base = profileOf('antigravity');
      const failed = { ...base, probes: base.probes.map((probe) => ({ ...probe, status: 'fails' as const })) };
      const named = 'failed capabilities';
      // ACT
      const actual = liveRefusal(failed);
      // ASSERT
      expect(actual).toContain(named);
    });
  });

  describe('edge cases', () => {
    it('names only the probes that are still outstanding', () => {
      // ARRANGE
      const base = profileOf('antigravity');
      const one = {
        ...base,
        probes: base.probes.map((probe) => ({
          ...probe,
          status: probe.id === 'scoped-permission-mode' ? ('unprobed' as const) : ('works' as const),
        })),
      };
      const named = 'scoped-permission-mode';
      const notNamed = 'hook-fires-headless';
      // ACT
      const actual = liveRefusal(one) ?? '';
      // ASSERT
      expect(actual).toContain(named);
      expect(actual).not.toContain(notNamed);
    });
  });
});

describe('channelRefusal', () => {
  describe('success cases', () => {
    it('accepts the pull channel for Antigravity, which the canary proves at run time', () => {
      // ARRANGE
      const expected = undefined;
      // ACT
      const actual = channelRefusal(profileOf('antigravity'), 'pull');
      // ASSERT
      expect(actual).toBe(expected);
    });

    it('accepts every channel for Claude Code', () => {
      // ARRANGE
      const claude = profileOf('claude-code');
      // ACT
      const refusals = (['push', 'pull', 'user-turn'] as const).map((channel) => channelRefusal(claude, channel));
      // ASSERT
      expect(refusals).toEqual([undefined, undefined, undefined]);
    });
  });

  describe('failure cases', () => {
    it('refuses the push channel for Antigravity while hook firing is unprobed', () => {
      // ARRANGE
      const expected = 'antigravity push: hook-fires-headless is unprobed, so no canary can be owed for it';
      // ACT
      const actual = channelRefusal(profileOf('antigravity'), 'push');
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('still refuses push for Antigravity after the probe works, because no hook root is built for it', () => {
      // ARRANGE
      const base = profileOf('antigravity');
      const probed = { ...base, probes: base.probes.map((probe) => ({ ...probe, status: 'works' as const })) };
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
