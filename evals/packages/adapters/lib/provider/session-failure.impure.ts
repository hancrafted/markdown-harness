// The failure half of a session's return: a sidecar row that says the instrument
// failed, and the `error` field the eval tool reads. Never a low score.

import { randomHex } from '../../../platform/host-ambient.ts';
import { writeText } from '../../../platform/host-files.ts';
import type { FailureReport, SessionReturn, SessionSidecar } from './session-record.types.ts';

export function writeSidecar(runDir: string, record: SessionSidecar): void {
  writeText(`${runDir}/sessions/${record.sessionKey}.json`, `${JSON.stringify(record, null, 2)}\n`);
}

export function sessionKey(cellLabel: string, trialIndex: number): string {
  return `${cellLabel}-${trialIndex}-${randomHex(3)}`;
}

export function reportFailure(report: FailureReport): SessionReturn {
  const { settings, call, arm, kind, detail } = report;
  const record: SessionSidecar = {
    sessionKey: sessionKey(call.cellLabel, call.trialIndex),
    cell: call.cellLabel,
    arm,
    graded: false,
    failureKind: kind,
    detail,
    markerPresent: false,
    localised: 'not graded',
  };
  writeSidecar(settings.runDir, record);
  return { error: `instrument failure: ${kind}: ${detail}`, metadata: { instrumentFailure: kind, arm } };
}
