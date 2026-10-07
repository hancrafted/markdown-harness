// What stands between a probe id and a session. Three refusals, in this order: the credential probe needs the
// explicit consent flag, because it copies the account's authentication files; a probe waits for the ones before
// it to be recorded, because the order is the spec's; and the stand-in run needs a record and a home of its own, so
// a stand-in run can never write the real record or copy the real files. A refusal is misuse (exit 2).

import type { ProbeRecord } from '../../../session/host-profile.ts';
import { earlierProbesMissing } from '../../../session/probe-record.ts';
import type { ProbeGateInput } from './probe-gate.types.ts';

function consentRefusal({ args, consentNotice }: ProbeGateInput): string | undefined {
  if (args.probe !== 'scratch-home-credentials' || args.consentCredentialCopy) return undefined;
  return `refused: ${args.probe} needs --consent-credential-copy.\n${consentNotice}`;
}

function orderRefusal({ args }: ProbeGateInput, record: ProbeRecord): string | undefined {
  const missing = earlierProbesMissing(args.probe, record);
  if (missing.length === 0) return undefined;
  return `refused: ${args.probe} runs after ${missing.join(', ')}; record ${missing.length === 1 ? 'it' : 'them'} first, in that order`;
}

function stubRefusal({ args }: ProbeGateInput): string | undefined {
  if (!args.stub) return undefined;
  if (args.record === undefined)
    return 'refused: --stub needs --record <path>, so the stand-in never writes the real record';
  return args.probe === 'scratch-home-credentials' && args.home === undefined
    ? 'refused: --stub needs --home <dir> for scratch-home-credentials, so the stand-in never copies the real files'
    : undefined;
}

export function probeRefusal(input: ProbeGateInput, record: ProbeRecord): string | undefined {
  return consentRefusal(input) ?? stubRefusal(input) ?? orderRefusal(input, record);
}
