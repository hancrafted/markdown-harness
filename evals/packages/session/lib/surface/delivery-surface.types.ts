import type { SessionEvent } from '../stream/session-stream.types.ts';

/** How steering content reaches the agent: a hook pushes it, the agent pulls it with a command, or the user turn carries it. */
export type DeliveryChannel = 'push' | 'pull' | 'user-turn';

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
}

export interface ChannelRow {
  readonly shells: readonly ShellScope[];
  readonly encodings: readonly Encoding[];
  /** Whether a surface of this channel ships the hook script into the root. */
  readonly needsHook: (surface: DeliverySurface) => boolean;
  /** The canary a cell of this channel owes, or undefined when nothing can be canaried (the user turn has no hook). */
  readonly canary: Canary | undefined;
  /** The instruction-file line the channel adds to the root, or undefined when it adds none. */
  readonly line: string | undefined;
}
