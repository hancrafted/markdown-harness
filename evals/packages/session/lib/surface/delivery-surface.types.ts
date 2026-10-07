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

export interface ChannelRow {
  readonly shells: readonly ShellScope[];
  readonly encodings: readonly Encoding[];
  /** The basenames of the skill scripts a surface of this channel ships into the root, the hook first; none ships none. */
  readonly hookScripts: (surface: DeliverySurface) => readonly string[];
  /** The canary a cell of this channel owes, or undefined when nothing can be canaried (the user turn has no hook). */
  readonly canary: Canary | undefined;
  /** The instruction-file line the channel adds to the root, or undefined when it adds none. */
  readonly line: string | undefined;
}
