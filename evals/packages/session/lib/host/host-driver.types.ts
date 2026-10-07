import type { InitExpectation } from '../failure/failure-classifier.types.ts';
import type { ParsedSession } from '../stream/session-stream.types.ts';
import type { HostProfile } from './host-profile.types.ts';

/** What an argv builder may need; each Host harness reads the fields it has a flag for. */
export interface DriverInput {
  readonly task: string;
  readonly model: string;
  readonly maxTurns: number;
  readonly wallClockMs: number;
  readonly tools: readonly string[];
  readonly allowedTools: readonly string[];
  readonly scopedMode: string | undefined;
}

export interface HostDriver {
  readonly argv: (input: DriverInput) => string[];
  /** The child environment; a scratch home replaces HOME only for a Host harness that reads its credentials there. */
  readonly environment: (
    parent: Readonly<Record<string, string | undefined>>,
    scratchHome: string | undefined,
  ) => Record<string, string>;
  readonly parse: (text: string) => ParsedSession;
  /** What the init event must show for a cell to count; the profile supplies what its probes derived. */
  readonly initExpectation: (model: string, profile: HostProfile) => InitExpectation;
}
