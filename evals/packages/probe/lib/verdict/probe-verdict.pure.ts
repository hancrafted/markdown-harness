// Reading one probe session into an answer. Decided from stream fields, stderr and what the workspace holds, never
// from the exit code: R0 showed `agy` exits 0 for a denied write and for a sign-in wall. A session that could not
// answer (it never wrote, it hit a sign-in wall on a probe that is not about signing in, it timed out) is
// inconclusive and records nothing, so a transient failure never reads as a capability the account lacks.

import type { Classification } from '../../../session/classify-session.ts';
import { sessionCause } from '../../../session/classify-session.ts';
import type { ProbeId } from '../../../session/host-profile.ts';
import type { ProbeEvidence, ProbeVerdict } from './probe-verdict.types.ts';

type Failure = Extract<Classification, { outcome: 'instrument-failure' }>;

const recorded = (status: 'works' | 'fails', detail: string, extra: object = {}): ProbeVerdict => ({
  kind: 'recorded',
  result: { status, detail, ...extra },
});
const inconclusive = (reason: string): ProbeVerdict => ({ kind: 'inconclusive', reason });
const named = (cause: Failure): string => `${cause.kind}: ${cause.detail}`;

/** A write tool call that came back without an error, in the normalised stream. */
function wroteSuccessfully(evidence: ProbeEvidence): boolean {
  const { events } = evidence.raw.parsed;
  return events.some(
    (call) =>
      call.kind === 'tool-call' &&
      call.tool === 'Write' &&
      events.some((result) => result.kind === 'tool-result' && result.id === call.id && !result.isError),
  );
}

function hookVerdict(evidence: ProbeEvidence): ProbeVerdict {
  if (!wroteSuccessfully(evidence))
    return inconclusive('the session never wrote a file, so a silent hook proves nothing');
  if (evidence.sentinel) return recorded('works', 'the hook handler ran during a write and left its sentinel file');
  return recorded(
    'fails',
    'a write completed and the hook handler never ran; the hooks.json schema is R3 reading of the embedded guide and was never run, so a wrong shape would look the same',
  );
}

/** A write passed under the mode: it narrowed permissions only if the init event reports something other than skip-all. */
function passedVerdict(evidence: ProbeEvidence): ProbeVerdict {
  const mode = evidence.mode ?? '';
  const reported = evidence.raw.parsed.init?.permissionMode ?? '';
  if (reported !== '' && reported !== 'always-proceed')
    return recorded('works', `a write passed under --mode ${mode}; the init event reports ${reported}`, {
      mode,
      permissionMode: reported,
    });
  const seen = reported === '' ? 'no permission mode' : reported;
  return recorded('fails', `a write passed but the init event reports ${seen}, so --mode ${mode} narrowed nothing`);
}

function scopedVerdict(evidence: ProbeEvidence, cause: Failure | undefined): ProbeVerdict {
  if (cause?.kind === 'permission-denied')
    return recorded('fails', `the write was auto-denied under --mode ${evidence.mode ?? ''}: ${cause.detail}`);
  if (cause !== undefined) return inconclusive(named(cause));
  return evidence.written ? passedVerdict(evidence) : inconclusive('nothing was written and nothing was denied');
}

function credentialVerdict(evidence: ProbeEvidence, cause: Failure | undefined): ProbeVerdict {
  if (evidence.credentialFilesCopied === 0)
    return inconclusive('no credential file existed to copy into the scratch home');
  if (cause?.kind === 'authentication-failure')
    return recorded('fails', `the scratch home was asked to sign in despite the copied files: ${cause.detail}`);
  if (cause !== undefined) return inconclusive(named(cause));
  return recorded(
    'works',
    `the scratch home stayed authenticated with ${evidence.credentialFilesCopied} copied file(s)`,
  );
}

export function verdictOf(probe: ProbeId, evidence: ProbeEvidence): ProbeVerdict {
  const cause = sessionCause(evidence.raw);
  const failure = cause?.outcome === 'instrument-failure' ? cause : undefined;
  if (probe === 'scoped-permission-mode') return scopedVerdict(evidence, failure);
  if (probe === 'scratch-home-credentials') return credentialVerdict(evidence, failure);
  return failure === undefined ? hookVerdict(evidence) : inconclusive(named(failure));
}
