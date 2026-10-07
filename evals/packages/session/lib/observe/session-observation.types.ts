import type { RungObservation } from '../../../grading/localise-rung.ts';
import type { SessionEvent } from '../stream/session-stream.types.ts';

export type ArmKind = 'steered' | 'neutralised' | 'control';

export interface ObserveInput {
  readonly arm: ArmKind;
  readonly events: readonly SessionEvent[];
  readonly marker: string;
  /** The target path relative to the minted root. */
  readonly targetPath: string;
  /** The real path of the minted root, so an absolute tool path can be made relative. */
  readonly root: string;
  /** The final file at the target path read back from the root, or undefined. */
  readonly finalFile: string | undefined;
  readonly injectionPattern: RegExp;
}

export interface SessionObservation {
  readonly observations: readonly RungObservation[];
  readonly firstWriteHasMarker: boolean;
  readonly unionHasMarker: boolean;
  readonly finalHasMarker: boolean;
  readonly hookDelivered: boolean;
  readonly injectionFlagged: boolean;
  /** The tool of the first creating call, named in a rung 3 reason. */
  readonly creatingTool: string | undefined;
}
