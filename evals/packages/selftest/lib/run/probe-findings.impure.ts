// Phase 4 of the self-test tier, the probe tool: each probe driven through the real entry point by the stand-in's
// `agy` mode, in order, with a record and a home of its own in a scratch directory, then the wrapper run under that
// record to show the recorded answers change the argv, the environment and the cohort row. No account is touched:
// the stand-in is a script and the "credentials" are files this check writes into a scratch home.

import { randomHex } from '../../../platform/host-ambient.ts';
import {
  makeDirectory,
  pathExists,
  readText,
  removeTree,
  systemTemporaryDirectory,
  writeText,
} from '../../../platform/host-files.ts';
import { parseProbeRecord } from '../../../session/probe-record.ts';
import { CREDENTIAL_FILES } from '../../../session/scratch-home.ts';
import type { Finding } from '../checks/self-checks.types.ts';
import { cohortRowsOf } from './antigravity-findings.impure.ts';
import { expectExit, expectOutput, matrixArgs, runEvalScript, runWrapper } from './execution.impure.ts';
import type { Execution } from './execution.types.ts';

const PROBE = 'evals/packages/probe/run-agy-probe.ts';

interface Bench {
  readonly dir: string;
  readonly home: string;
  readonly empty: string;
}

/** A scratch directory with a record path, a home holding the two stand-in credential files, and a home holding none. */
function bench(): Bench {
  const dir = `${systemTemporaryDirectory()}/mh-probe-selftest-${randomHex(4)}`;
  const home = `${dir}/home`;
  makeDirectory(`${dir}/empty`);
  for (const file of CREDENTIAL_FILES) writeText(`${home}/${file}`, 'stand-in token, not a credential\n');
  return { dir, home, empty: `${dir}/empty` };
}

interface Probe {
  /** The record file name inside the bench, without its extension. */
  readonly record: string;
  readonly id: string;
  readonly extra?: readonly string[];
}

const probe = (bed: Bench, one: Probe): Execution =>
  runEvalScript(PROBE, [
    one.id,
    '--stub',
    '--record',
    `${bed.dir}/${one.record}.json`,
    '--home',
    bed.home,
    ...(one.extra ?? []),
  ]);

const recordOf = (bed: Bench, name: string) => {
  const path = `${bed.dir}/${name}.json`;
  return pathExists(path) ? parseProbeRecord(readText(path)) : {};
};

const statuses = (bed: Bench, name: string): string => {
  const record = recordOf(bed, name);
  return typeof record === 'string'
    ? record
    : Object.entries(record)
        .map(([id, one]) => `${id}=${one?.status}`)
        .join(',');
};

function orderFindings(bed: Bench): Finding[] {
  const early = probe(bed, { record: 'order', id: 'scoped-permission-mode' });
  const noConsent = probe(bed, { record: 'consent', id: 'scratch-home-credentials' });
  const noRecord = runEvalScript(PROBE, ['hook-fires-headless', '--stub']);
  return [
    expectExit('a probe run before the one it follows is refused, exit two', early, 2),
    expectOutput('probe: the refusal names the earlier probe still to record', early, /hook-fires-headless/),
    expectExit('the credential probe without --consent-credential-copy is refused, exit two', noConsent, 2),
    expectOutput('probe: the refusal lists each file that would be copied, from and to', noConsent, /oauth-token -> /),
    expectOutput('probe: the refusal says the scratch home is deleted afterwards', noConsent, /deleted afterwards/),
    {
      check: 'a refused credential probe copies nothing and records nothing',
      ok: !pathExists(`${bed.dir}/consent.json`) && !pathExists(`${bed.dir}/order.json`),
      detail: 'no record file written',
    },
    expectExit('a stand-in probe with no record of its own is refused, exit two', noRecord, 2),
  ];
}

const CONSENT = '--consent-credential-copy';
const ALL_WORK = 'hook-fires-headless=works,scoped-permission-mode=works,scratch-home-credentials=works';

function worksFindings(bed: Bench): Finding[] {
  const hook = probe(bed, { record: 'works', id: 'hook-fires-headless' });
  const scoped = probe(bed, { record: 'works', id: 'scoped-permission-mode' });
  const credentials = probe(bed, {
    record: 'works',
    id: 'scratch-home-credentials',
    extra: [CONSENT, '--stub-mode', 'needs-credentials'],
  });
  return [
    expectExit('the hook probe runs against the stand-in and records an answer, exit zero', hook, 0),
    expectExit('the scoped permission probe runs against the stand-in and records an answer, exit zero', scoped, 0),
    expectExit('the credential probe runs against the stand-in with consent, exit zero', credentials, 0),
    {
      check: 'probe: all three answers are recorded as works, in the record the profile reads',
      ok: statuses(bed, 'works') === ALL_WORK,
      detail: statuses(bed, 'works'),
    },
  ];
}

function failsFindings(bed: Bench): Finding[] {
  const hook = probe(bed, { record: 'fails', id: 'hook-fires-headless', extra: ['--stub-mode', 'hook-silent'] });
  const scoped = probe(bed, { record: 'fails', id: 'scoped-permission-mode', extra: ['--stub-mode', 'mode-denied'] });
  const wall = probe(bed, {
    record: 'fails',
    id: 'scratch-home-credentials',
    extra: [CONSENT, '--stub-mode', 'auth-fail'],
  });
  const wanted = 'hook-fires-headless=fails,scoped-permission-mode=fails,scratch-home-credentials=fails';
  return [
    expectExit('a hook that never runs is a recorded failure, exit zero', hook, 0),
    expectExit('a scoped mode that still denies the write is a recorded failure, exit zero', scoped, 0),
    expectExit('a scratch home that is asked to sign in is a recorded failure, exit zero', wall, 0),
    {
      check: 'probe: the three failures are recorded as fails',
      ok: statuses(bed, 'fails') === wanted,
      detail: statuses(bed, 'fails'),
    },
  ];
}

function inconclusiveFindings(bed: Bench): Finding[] {
  const bare = runEvalScript(PROBE, [
    'scratch-home-credentials',
    '--stub',
    CONSENT,
    '--record',
    `${bed.dir}/works.json`,
    '--home',
    bed.empty,
    '--stub-mode',
    'needs-credentials',
  ]);
  return [
    expectExit('a credential probe with no credential file to copy is inconclusive, exit one', bare, 1),
    {
      check: 'an inconclusive probe records nothing: the record still holds the three answers it held',
      ok: statuses(bed, 'works') === ALL_WORK,
      detail: statuses(bed, 'works'),
    },
  ];
}

/** The fields of a cohort row that differ from what a recorded probe set says they must be. */
function mismatches(row: Record<string, unknown> | undefined, wanted: Record<string, unknown>): string[] {
  if (row === undefined) return ['no cohort row'];
  return Object.entries(wanted)
    .filter(([field, value]) => row[field] !== value)
    .map(([field]) => `${field} ${String(row[field])}`);
}

const rowFinding = (check: string, problems: readonly string[]): Finding => ({
  check,
  ok: problems.length === 0,
  detail: problems.join('; ') || 'row as recorded',
});

const WORKED_ROW = { isolation: 'scratch-home', leakedSurface: 'none', permissionScope: 'scoped:accept-edits' };
const FAILED_ROW = { isolation: 'none', permissionScope: 'skip-all' };

/** The stand-in's agy matrix run under a record, so recorded answers are seen to change behaviour end to end. */
function effectFindings(bed: Bench): Finding[] {
  const worked = runWrapper(matrixArgs('agy', 'self-y', ['--probe-record', `${bed.dir}/works.json`]));
  const failed = runWrapper(matrixArgs('agy', 'self-z', ['--probe-record', `${bed.dir}/fails.json`]));
  return [
    expectExit('the Antigravity matrix runs under a record whose probes all work, exit zero', worked, 0),
    rowFinding(
      'recorded works: the cohort row says scratch-home isolation, no leaked surface and the scoped permission mode',
      mismatches(cohortRowsOf(worked.runDir)[0], WORKED_ROW),
    ),
    expectExit('the Antigravity matrix runs under a record whose probes all fail, exit zero', failed, 0),
    rowFinding(
      'recorded fails: the cohort row keeps no isolation and records skip-all',
      mismatches(cohortRowsOf(failed.runDir)[0], FAILED_ROW),
    ),
  ];
}

export function probeFindings(): Finding[] {
  const bed = bench();
  try {
    return [
      ...orderFindings(bed),
      ...worksFindings(bed),
      ...failsFindings(bed),
      ...inconclusiveFindings(bed),
      ...effectFindings(bed),
    ];
  } finally {
    removeTree(bed.dir);
  }
}
