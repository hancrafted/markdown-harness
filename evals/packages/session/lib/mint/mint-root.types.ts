import type { ArmKind } from '../observe/session-observation.types.ts';
import type { DeliverySurface } from '../surface/delivery-surface.types.ts';
import type { MintSources } from './mint-plan.types.ts';

export interface MintRequest {
  readonly sources: MintSources;
  readonly arm: ArmKind;
  /** The delivery surface the root is minted for: it decides the hook settings, the pull command and the instruction line. */
  readonly surface: DeliverySurface;
  /** The constructed instruction-file line a pull surface adds; ignored by every other surface. */
  readonly pullLine: string;
  readonly derivedConfig: string;
  readonly heldOut: readonly string[];
  /** A parent for the mint; defaults to the system temporary directory. */
  readonly under?: string;
}

export type MintResult =
  | { readonly ok: true; readonly root: string; readonly digest: string; readonly configDigest: string }
  | { readonly ok: false; readonly refusals: readonly string[] };
