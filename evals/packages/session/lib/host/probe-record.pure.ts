// The probe record: what the probe tool found, kept as data so that a probe outcome changes behaviour without
// anyone editing source. The record is gitignored, not committed: its answers are facts about one machine's
// installed `agy` and one account's authentication, so a committed copy would assert them for a machine that never
// ran the probes. A clone with no record is every probe unprobed, which refuses a live run, the honest default.

import { PROBE_ORDER } from './host-profile.pure.ts';
import type { ProbeId, ProbeRecord, ProbeResult } from './host-profile.types.ts';

/** Where the record lives, relative to the repository root; gitignored. */
export const PROBE_RECORD_PATH = 'evals/probes/antigravity.json';

const isProbeId = (value: string): value is ProbeId => PROBE_ORDER.some((id) => id === value);

function resultProblem(id: string, value: unknown): string | undefined {
  const entry = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  if (entry.status !== 'works' && entry.status !== 'fails') return `${id}.status is not works or fails`;
  if (typeof entry.detail !== 'string' || typeof entry.recordedAt !== 'string')
    return `${id} lacks a detail or a recordedAt`;
  return undefined;
}

/** The record the text holds, or a sentence naming what is wrong with it. */
export function parseProbeRecord(text: string): ProbeRecord | string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return 'the probe record is not JSON';
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return 'the probe record is not a JSON object';
  const entries = Object.entries(value as Record<string, unknown>);
  const unknown = entries.find(([id]) => !isProbeId(id));
  if (unknown !== undefined) return `the probe record names an unknown probe: ${unknown[0]}`;
  const problem = entries.map(([id, entry]) => resultProblem(id, entry)).find((found) => found !== undefined);
  return problem ?? (value as ProbeRecord);
}

/** The record with one probe's answer set, replacing an earlier answer to the same probe. */
export function withProbe(record: ProbeRecord, id: ProbeId, result: ProbeResult): ProbeRecord {
  return { ...record, [id]: result };
}

/** The record as the file holds it: probes in the order they must be run. */
export function serialiseProbeRecord(record: ProbeRecord): string {
  const ordered = Object.fromEntries(PROBE_ORDER.flatMap((id) => (record[id] === undefined ? [] : [[id, record[id]]])));
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** The probes before `id` in the order that have no recorded answer; a later probe refuses until this is empty. */
export function earlierProbesMissing(id: ProbeId, record: ProbeRecord): ProbeId[] {
  return PROBE_ORDER.slice(0, PROBE_ORDER.indexOf(id)).filter((earlier) => record[earlier] === undefined);
}
