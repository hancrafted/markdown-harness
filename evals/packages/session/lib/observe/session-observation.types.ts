import type { RungObservation } from '../../../grading/localise-rung.ts';
import type { SessionEvent } from '../stream/session-stream.types.ts';
import type { DeliverySurface } from '../surface/delivery-surface.types.ts';

export type ArmKind = 'steered' | 'neutralised' | 'control';

export interface ObserveInput {
  readonly arm: ArmKind;
  /** Which surface the cell measures; it decides where a delivery is looked for and which rungs the cell can observe. */
  readonly surface: DeliverySurface;
  readonly events: readonly SessionEvent[];
  /** One steering marker per tested carrier; a case with a single carrier passes one. */
  readonly steeringMarkers: readonly string[];
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
  /** True when every steering marker was in the first creating call, in the union of creating calls, or in the final file. */
  readonly firstWriteHasSteeringMarker: boolean;
  readonly unionHasSteeringMarker: boolean;
  readonly finalHasSteeringMarker: boolean;
  /** How many steering markers the final file holds, out of how many the case carries: the partial-action profile. */
  readonly markersInFinal: number;
  readonly markerCount: number;
  /** Steering content reached the agent: a hook response (push) or a query result (pull) holding every steering marker. */
  readonly delivered: boolean;
  /** The agent ran the query command at all; meaningful for pull. */
  readonly queryAsked: boolean;
  readonly injectionFlagged: boolean;
  /** The tool of the first creating call, named in a rung 3 reason, or undefined when nothing created the file. */
  readonly creatingTool: string | undefined;
  /** A creating call was a shell call: the Write matcher's coverage hole, when the push hook did not fire. */
  readonly shellCreated: boolean;
}

export type ToolCall = Extract<SessionEvent, { kind: 'tool-call' }>;

/** The moment steering content arrived, and the path the answer was about. */
export interface Delivery {
  readonly seq: number;
  /** The path as the notice or the query command named it; undefined when it did not say. */
  readonly path: string | undefined;
}
