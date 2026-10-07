import type { RawSession } from '../../../session/classify-session.ts';
import type { ProbeResult } from '../../../session/host-profile.ts';

/** What one probe session left behind: the raw record and the facts only the workspace shows. */
export interface ProbeEvidence {
  readonly raw: RawSession;
  /** The hook handler's sentinel file exists. */
  readonly sentinel: boolean;
  /** The file the session was asked to create exists. */
  readonly written: boolean;
  /** How many credential files were copied into the scratch home; zero for a probe that has none. */
  readonly credentialFilesCopied: number;
  /** The scoped mode the session was started with, when it was. */
  readonly mode: string | undefined;
}

/** `recorded`: the probe answered, works or fails. `inconclusive`: the session could not answer, so nothing is recorded. */
export type ProbeVerdict =
  | { readonly kind: 'recorded'; readonly result: Omit<ProbeResult, 'recordedAt'> }
  | { readonly kind: 'inconclusive'; readonly reason: string };
