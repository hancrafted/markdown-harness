// Reading the probe record a run starts with. A clone with no record is every probe unprobed. A stand-in run reads
// a record only when one is named, so the self-test never depends on, or is changed by, a record on this machine.

import { pathExists, readText } from '../../../platform/host-files.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { NO_PROBES, hostNameOfMatrix } from '../../../session/host-profile.ts';
import { PROBE_RECORD_PATH, parseProbeRecord } from '../../../session/probe-record.ts';
import type { RunArgs } from '../args/run-args.types.ts';

function pathFor(args: RunArgs, checkout: string): string | undefined {
  if (args.probeRecord !== undefined) return args.probeRecord;
  return args.host === 'stub' ? undefined : `${checkout}/${PROBE_RECORD_PATH}`;
}

/** The record, or a sentence naming why the file that exists cannot be read as one. */
export function readProbeRecord(args: RunArgs, checkout: string): ProbeRecord | string {
  const path = pathFor(args, checkout);
  if (hostNameOfMatrix(args.matrix) !== 'antigravity' || path === undefined || !pathExists(path)) return NO_PROBES;
  const parsed = parseProbeRecord(readText(path));
  return typeof parsed === 'string' ? `${path}: ${parsed}` : parsed;
}
