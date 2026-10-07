import type { ArmKind } from '../observe/session-observation.types.ts';
import type { MintSources } from './mint-plan.types.ts';

export interface MintRequest {
  readonly sources: MintSources;
  readonly arm: ArmKind;
  readonly derivedConfig: string;
  readonly heldOut: readonly string[];
  /** A parent for the mint; defaults to the system temporary directory. */
  readonly under?: string;
}

export type MintResult =
  | { readonly ok: true; readonly root: string; readonly digest: string; readonly configDigest: string }
  | { readonly ok: false; readonly refusals: readonly string[] };
