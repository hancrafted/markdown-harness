import type { ProbeId } from '../../../session/host-profile.ts';

export interface ProbeArgs {
  readonly probe: ProbeId;
  /** The explicit consent to copy the account's authentication files; without it the credential probe refuses. */
  readonly consentCredentialCopy: boolean;
  /** A binary to run instead of `agy`, resolved before the environment variable. */
  readonly hostBinary: string | undefined;
  /** Drive the stand-in instead of `agy`: touches no account, and needs --record and, for the credential probe, --home. */
  readonly stub: boolean;
  readonly stubMode: string;
  /** The probe record to read and write instead of the default path. */
  readonly record: string | undefined;
  /** The home the credential files are copied from, in place of the real one; the stand-in run requires it. */
  readonly home: string | undefined;
  /** The model id to probe with, in place of the profile's canary model. */
  readonly model: string | undefined;
}

export type ProbeArgsResult =
  { readonly ok: true; readonly args: ProbeArgs } | { readonly ok: false; readonly problem: string };
