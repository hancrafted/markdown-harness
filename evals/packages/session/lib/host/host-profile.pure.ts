// The Host harness profiles and the capability gate. A profile holds what the stream cannot say about a Host
// harness: whether anything can isolate a run from the account's own state, whether a turn cap exists, what the
// permission flags allow, which cohort fields its init event cannot supply, and the names it goes by.
//
// The Antigravity facts that depend on a probe are derived from the probe record, which the probe tool writes
// when a human runs it against the account. With no record every probe is unprobed, a live run is refused, and
// the profile reports the conservative answers: no isolation, every permission skipped. The Antigravity facts
// below are from R3 (`agy` 1.3.0), measured once, not re-verified.
//
// Two gates overlap on purpose for the push channel. CHANNEL_PROBE says push needs `hook-fires-headless` to work;
// UNBUILT says no hook root is built for Antigravity whatever that probe says. A `works` answer opens the first
// gate and leaves the second shut, so recording it changes nothing until a root exists; both must be lifted.

import type { DeliveryChannel } from '../surface/delivery-surface.types.ts';
import type {
  HostName,
  HostProfile,
  MatrixName,
  Probe,
  ProbeId,
  ProbeRecord,
  ProbeResult,
  WrapperHost,
} from './host-profile.types.ts';

/** No probe recorded: every probe unprobed. */
export const NO_PROBES: ProbeRecord = {};

/** The probes in the order a human must run them: hooks, then a narrower permission mode, then the credential copy. */
export const PROBE_ORDER: readonly ProbeId[] = [
  'hook-fires-headless',
  'scoped-permission-mode',
  'scratch-home-credentials',
];

const QUESTIONS: Readonly<Record<ProbeId, string>> = {
  'hook-fires-headless': 'does a hook in .agents/hooks.json fire in -p mode',
  'scoped-permission-mode': 'does --mode accept-edits let a write through without skipping every permission',
  'scratch-home-credentials': 'does a scratch HOME holding copied credentials stay authenticated',
};

const ANTIGRAVITY_LEAKED = 'user-settings; user-permission-allow-list; user-hooks; user-skills; user-mcp; plugin-data';

/** The facts of a profile that no probe changes. */
type Fixed = Omit<
  HostProfile,
  'isolation' | 'leakedSurface' | 'permissionScope' | 'scopedMode' | 'initPermissionMode' | 'probes'
>;

const FIXED: Readonly<Record<HostName, Fixed>> = {
  'claude-code': {
    name: 'claude-code',
    wrapperName: 'claude',
    matrices: ['push', 'pull', 'carriers', 'assess'],
    turnCap: 'enforced',
    unobservable: [],
    canaryModel: 'sonnet',
    // A bare name: spawn resolves it on PATH to the real binary, never to a shell alias, which a spawn does not load.
    binary: 'claude',
    binaryVariable: 'EVALS_CLAUDE_BINARY',
    labelPrefix: '',
  },
  antigravity: {
    name: 'antigravity',
    wrapperName: 'agy',
    matrices: ['agy'],
    turnCap: 'none',
    unobservable: ['hostVersion', 'authSource', 'skillCount', 'serverCount', 'pluginCount'],
    canaryModel: 'gemini-3.8-flash-low',
    // R3: `type -a agy` shows a shell alias beside /opt/homebrew/bin/agy. The alias adds `caffeinate -s` and the
    // skip-permissions flag, and a spawn loads no alias, so the bare name reaches the real binary with only the
    // flags this tool passes.
    binary: 'agy',
    binaryVariable: 'EVALS_AGY_BINARY',
    labelPrefix: 'antigravity',
  },
};

/** The Host harness names a profile exists for, in table order. */
export const HOST_NAMES: readonly HostName[] = ['claude-code', 'antigravity'];

/** Every matrix, once, derived from the profiles that run them. */
export const MATRIX_NAMES: readonly MatrixName[] = HOST_NAMES.flatMap((name) => FIXED[name].matrices);

/** The probes a Host harness waits on; Claude Code has none. */
const PROBES: Readonly<Record<HostName, readonly ProbeId[]>> = { 'claude-code': [], antigravity: PROBE_ORDER };

/** The channels a Host harness has no builder for, whatever its probes say. */
const UNBUILT: Readonly<Record<HostName, readonly DeliveryChannel[]>> = {
  'claude-code': [],
  antigravity: ['push', 'assess'],
};

/** The probe a channel's canary depends on, for a Host harness whose channel is not proven by the canary alone. */
const CHANNEL_PROBE: Readonly<Record<HostName, Partial<Record<DeliveryChannel, ProbeId>>>> = {
  'claude-code': {},
  antigravity: { push: 'hook-fires-headless' },
};

const statusOf = (result: ProbeResult | undefined): Probe['status'] => result?.status ?? 'unprobed';

type Derived = Pick<
  HostProfile,
  'isolation' | 'leakedSurface' | 'permissionScope' | 'scopedMode' | 'initPermissionMode'
>;

/** Claude Code's isolation and permissions are flag facts, which no probe changes. */
const CLAUDE_DERIVED: Derived = {
  isolation: 'flags',
  leakedSurface: 'none',
  permissionScope: 'scoped:acceptEdits',
  scopedMode: undefined,
  initPermissionMode: undefined,
};

/** The scoped mode a probe found, only when it works and names the mode: a bare `works` is not trusted. */
function scopedModeOf(result: ProbeResult | undefined): string | undefined {
  return result?.status === 'works' ? result.mode : undefined;
}

/** What the probes say about an Antigravity run: isolation and the leaked surface, and the permission scope. */
function antigravityDerived(record: ProbeRecord): Derived {
  const scratch = record['scratch-home-credentials']?.status === 'works';
  const mode = scopedModeOf(record['scoped-permission-mode']);
  return {
    isolation: scratch ? 'scratch-home' : 'none',
    leakedSurface: scratch ? 'none' : ANTIGRAVITY_LEAKED,
    permissionScope: mode === undefined ? 'skip-all' : `scoped:${mode}`,
    scopedMode: mode,
    initPermissionMode: mode === undefined ? 'always-proceed' : record['scoped-permission-mode']?.permissionMode,
  };
}

const derived = (name: HostName, record: ProbeRecord): Derived =>
  name === 'claude-code' ? CLAUDE_DERIVED : antigravityDerived(record);

/** The profile of a Host harness under a probe record; with no record, the conservative one. */
export function profileOf(name: HostName, record: ProbeRecord): HostProfile {
  const probes = PROBES[name].map((id): Probe => ({ id, question: QUESTIONS[id], status: statusOf(record[id]) }));
  return { ...FIXED[name], ...derived(name, record), probes };
}

/** The Host harness names a profile exists for. */
export function isHostName(value: unknown): value is HostName {
  return HOST_NAMES.some((name) => name === value);
}

/** The Host harness the wrapper's `--host` value names; the one place the two vocabularies meet. */
export function hostNameOfWrapper(wrapper: WrapperHost): HostName {
  return HOST_NAMES.find((name) => FIXED[name].wrapperName === wrapper) ?? 'claude-code';
}

/** The Host harness a matrix is written for. */
export function hostNameOfMatrix(matrix: MatrixName): HostName {
  return HOST_NAMES.find((name) => FIXED[name].matrices.includes(matrix)) ?? 'claude-code';
}

/** The binary to spawn: the flag, else the profile's variable when set and non-empty, else the profile's bare name. */
export function resolveBinary(
  profile: HostProfile,
  flag: string | undefined,
  parent: Readonly<Record<string, string | undefined>>,
): string {
  const variable = parent[profile.binaryVariable];
  return flag ?? (variable === undefined || variable === '' ? profile.binary : variable);
}

const idsWith = (profile: HostProfile, status: Probe['status']): string[] =>
  profile.probes.filter((probe) => probe.status === status).map((probe) => probe.id);

/**
 * A sentence refusing a live run while any probe is unprobed, or undefined when every probe is recorded. A probe
 * that failed is an answer, not a blocker: a failed scoped permission mode keeps skip-all and a failed scratch
 * home keeps the real HOME, and the profile records both in the cohort row.
 */
export function liveRefusal(profile: HostProfile): string | undefined {
  const unprobed = idsWith(profile, 'unprobed');
  if (unprobed.length === 0) return undefined;
  return `${profile.name} has unprobed capabilities: ${unprobed.join(', ')}; run \`npm run evals:agy-probe -- <probe-id>\` for each, in that order, and the result is recorded before a live run`;
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
