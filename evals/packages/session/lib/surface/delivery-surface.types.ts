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
