// The probe tool's arguments. A mistyped argument is misuse (exit 2), never a probe result.

import type { ProbeId } from '../../../session/host-profile.ts';
import { PROBE_ORDER } from '../../../session/host-profile.ts';
import type { ProbeArgs, ProbeArgsResult } from './probe-args.types.ts';

const DEFAULTS = {
  consentCredentialCopy: false,
  hostBinary: undefined,
  stub: false,
  stubMode: 'obey',
  record: undefined,
  home: undefined,
  model: undefined,
} as const;

const isProbeId = (value: string): value is ProbeId => PROBE_ORDER.some((id) => id === value);

type ProbeSettings = Omit<ProbeArgs, 'probe'>;

const SETTERS: Readonly<Record<string, (args: ProbeSettings, value: string) => ProbeSettings>> = {
  '--host-binary': (args, value) => ({ ...args, hostBinary: value }),
  '--stub-mode': (args, value) => ({ ...args, stubMode: value }),
  '--record': (args, value) => ({ ...args, record: value }),
  '--home': (args, value) => ({ ...args, home: value }),
  '--model': (args, value) => ({ ...args, model: value }),
};

const SWITCH_SETTERS: Readonly<Record<string, (args: ProbeSettings) => ProbeSettings>> = {
  '--stub': (args) => ({ ...args, stub: true }),
  '--consent-credential-copy': (args) => ({ ...args, consentCredentialCopy: true }),
};

interface Scan {
  readonly args: ProbeSettings;
  readonly positional: readonly string[];
  readonly problem?: string;
}

/** One word of the argv folded into the scan; the second member is how many words it consumed. */
function scanWord(scan: Scan, word: string, next: string | undefined): [Scan, number] {
  const mark = SWITCH_SETTERS[word];
  if (mark !== undefined) return [{ ...scan, args: mark(scan.args) }, 1];
  const set = SETTERS[word];
  if (set !== undefined)
    return next === undefined
      ? [{ ...scan, problem: `${word} needs a value` }, 1]
      : [{ ...scan, args: set(scan.args, next) }, 2];
  if (word.startsWith('--')) return [{ ...scan, problem: `unknown argument ${word}` }, 1];
  return [{ ...scan, positional: [...scan.positional, word] }, 1];
}

function scan(argv: readonly string[]): Scan {
  let state: Scan = { args: DEFAULTS, positional: [] };
  for (let index = 0; index < argv.length && state.problem === undefined;) {
    const [next, used] = scanWord(state, argv[index] ?? '', argv[index + 1]);
    state = next;
    index += used;
  }
  return state;
}

export function parseProbeArgs(argv: readonly string[]): ProbeArgsResult {
  const { args, positional, problem } = scan(argv);
  if (problem !== undefined) return { ok: false, problem };
  const [probe, ...extra] = positional;
  if (probe === undefined || extra.length > 0 || !isProbeId(probe))
    return { ok: false, problem: `name exactly one probe: ${PROBE_ORDER.join(', ')}` };
  return { ok: true, args: { ...args, probe } };
}
