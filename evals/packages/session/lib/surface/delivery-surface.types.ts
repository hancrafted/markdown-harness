import type { SessionEvent } from '../stream/session-stream.types.ts';

/**
 * How steering content reaches the agent: a pre-write hook pushes it, the agent pulls it with a command, a
 * post-read hook assesses a file the agent has just read, or the user turn carries it.
 */
export type DeliveryChannel = 'push' | 'pull' | 'assess' | 'user-turn';

/** What the agent may do through the shell: nothing, only the query command, or the query command plus file-writing commands. */
export type ShellScope = 'none' | 'query-only' | 'widened';

/**
 * What form the steering content takes when it arrives: the hook's prose rendering, the raw `mh query` JSON,
 * the same prose rendering returned by the pull command, the intents alone, or nothing for the user turn.
 */
export type Encoding = 'hook-prose' | 'json' | 'prose' | 'intent-only' | 'none';

/** The three fields that say which surface a cell measures. */
export interface DeliverySurface {
  readonly channel: DeliveryChannel;
  readonly shell: ShellScope;
  readonly encoding: Encoding;
}

/** A canary: the surface it runs on, the task that forces the surface to be used, and the verdict over its stream. */
export interface Canary {
  readonly surface: DeliverySurface;
  readonly task: (target: string) => string;
  readonly verdict: (events: readonly SessionEvent[]) => string | undefined;
  /** The file the task names, when the surface needs one the layout already holds; undefined means a path the canary invents. */
  readonly target?: string;
}

/**
 * Written structurally, not imported: `session-observation.types.ts` already imports this file, so naming its
 * `ArmKind` and `Delivery` here would close a cycle the boundary check forbids.
 */
type RowArm = 'steered' | 'neutralised' | 'control';
interface RowDelivery {
  readonly seq: number;
  readonly path: string | undefined;
}

/** The rung 1 check of a channel: which built command answers for the target, and whether that answer is the right one. */
export interface Rung1 {
  readonly command: 'query' | 'assess';
  readonly check: (stdout: string, steeringMarkers: readonly string[], arm: RowArm) => string | undefined;
}

/**
 * The rung 2 probe of a channel, or undefined when it has none: a hook script fed the payload the Host harness would
 * send for `tool`, or the pull command run as the agent will run it.
 */
export type Probe =
  { readonly kind: 'hook'; readonly script: string; readonly tool: 'Write' | 'Read' } | { readonly kind: 'command' };

export interface ChannelRow {
  readonly shells: readonly ShellScope[];
  readonly encodings: readonly Encoding[];
  /** The basenames of the skill scripts a surface of this channel ships into the root, the hook first; none ships none. */
  readonly hookScripts: (surface: DeliverySurface) => readonly string[];
  /** Every skill script the channel may ship, for the encodings that need them; `hookScripts` picks a surface's own. */
  readonly scripts: readonly string[];
  /** The rung 1 check. */
  readonly rung1: Rung1;
  /** The rung 2 probe. */
  readonly probe: Probe | undefined;
  /** The Host harness settings that wire the channel's hook, or undefined when the channel wires none. */
  readonly settings: object | undefined;
  /** The moment steering content arrived in a stream, or undefined when the stream holds none (the user turn). */
  readonly delivery: (events: readonly SessionEvent[], steeringMarkers: readonly string[]) => RowDelivery | undefined;
  /** The canary a cell of this channel owes, or undefined when nothing can be canaried (the user turn has no hook). */
  readonly canary: Canary | undefined;
  /** The instruction-file line the channel adds to the root, or undefined when it adds none. */
  readonly line: string | undefined;
}
