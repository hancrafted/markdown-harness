// The Host harness profiles and the capability gate. A profile holds what the stream cannot say about a Host
// harness: whether flags can isolate a run from the account's own state, whether a turn cap exists, and which
// cohort fields its init event cannot supply.
//
// The Antigravity probes are recorded `unprobed`. Running one needs the account's authentication, and Han has
// not consented to that, so a live Antigravity run is refused until a human runs each probe and edits its
// status here. The Antigravity facts below are from R3 (`agy` 1.3.0), measured once, not re-verified.

import type { DeliveryChannel } from '../surface/delivery-surface.types.ts';
import type { HostName, HostProfile, Probe } from './host-profile.types.ts';

const ANTIGRAVITY_PROBES: readonly Probe[] = [
  { id: 'hook-fires-headless', question: 'does a hook in .agents/hooks.json fire in -p mode', status: 'unprobed' },
  {
    id: 'scoped-permission-mode',
    question: 'does --mode accept-edits let a write through without skipping every permission',
    status: 'unprobed',
  },
  {
    id: 'scratch-home-credentials',
    question: 'does a scratch HOME holding copied credentials stay authenticated',
    status: 'unprobed',
  },
];

const PROFILES: Readonly<Record<HostName, HostProfile>> = {
  'claude-code': {
    name: 'claude-code',
    isolation: 'flags',
    leakedSurface: 'none',
    turnCap: 'enforced',
    unobservable: [],
    canaryModel: 'sonnet',
    binary: 'claude',
    probes: [],
  },
  antigravity: {
    name: 'antigravity',
    isolation: 'none',
    leakedSurface: 'user-settings; user-permission-allow-list; user-hooks; user-skills; user-mcp; plugin-data',
    turnCap: 'none',
    unobservable: ['hostVersion', 'authSource', 'skillCount', 'serverCount', 'pluginCount'],
    canaryModel: 'gemini-3.8-flash-low',
    binary: '/opt/homebrew/bin/agy',
    probes: ANTIGRAVITY_PROBES,
  },
};

/** The channels a Host harness has no builder for, whatever its probes say. */
const UNBUILT: Readonly<Record<HostName, readonly DeliveryChannel[]>> = {
  'claude-code': [],
  antigravity: ['push'],
};

/** The probe a channel's canary depends on, for a Host harness whose channel is not proven by the canary alone. */
const CHANNEL_PROBE: Readonly<Record<HostName, Partial<Record<DeliveryChannel, string>>>> = {
  'claude-code': {},
  antigravity: { push: 'hook-fires-headless' },
};

export function profileOf(name: HostName): HostProfile {
  return PROFILES[name];
}

/** The Host harness names a profile exists for. */
export function isHostName(value: unknown): value is HostName {
  return typeof value === 'string' && Object.hasOwn(PROFILES, value);
}

const idsWith = (profile: HostProfile, status: Probe['status']): string[] =>
  profile.probes.filter((probe) => probe.status === status).map((probe) => probe.id);

/** A sentence refusing a live run while any probe is unprobed or failed, or undefined when every probe works. */
export function liveRefusal(profile: HostProfile): string | undefined {
  const unprobed = idsWith(profile, 'unprobed');
  if (unprobed.length > 0)
    return `${profile.name} has unprobed capabilities: ${unprobed.join(', ')}; Han runs them against the account and records the result before a live run`;
  const failed = idsWith(profile, 'fails');
  return failed.length > 0 ? `${profile.name} has failed capabilities: ${failed.join(', ')}` : undefined;
}

/** A sentence refusing a delivery channel for a Host harness, or undefined when a canary can be owed for it. */
export function channelRefusal(profile: HostProfile, channel: DeliveryChannel): string | undefined {
  const needed = CHANNEL_PROBE[profile.name][channel];
  const probe = profile.probes.find((candidate) => candidate.id === needed);
  if (probe !== undefined && probe.status !== 'works')
    return `${profile.name} ${channel}: ${probe.id} is ${probe.status}, so no canary can be owed for it`;
  return UNBUILT[profile.name].includes(channel)
    ? `${profile.name} ${channel}: no hook root is built for this Host harness yet`
    : undefined;
}

/** The family a model id belongs to, so a cross-host comparison can see two Host harnesses running one model. */
export function modelFamilyOf(modelId: string): string {
  if (modelId === 'unknown') return 'unknown';
  if (modelId.startsWith('claude')) return 'claude';
  return modelId.startsWith('gemini') ? 'gemini' : 'other';
}
