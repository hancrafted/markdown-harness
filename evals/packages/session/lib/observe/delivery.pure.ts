// Finding the moment steering content arrived; the channel table picks the finder. Push and assess: a hook response
// holding every steering marker. Pull: the result of a shell call that ran the query
// command and returned every steering marker without error. The user turn is not a
// delivery in the stream. Each delivery names the path it was about.

import type { SessionEvent } from '../stream/session-stream.types.ts';
import { commandOf } from './creation.pure.ts';
import type { Delivery, ToolCall } from './session-observation.types.ts';

// The two hooks' first lines: the push hook's new-file notice and the assess hook's past-its-stale_after notice.
export const NOTICE_PATH = /markdown-harness: (\S+) is (?:a new file|past its stale_after)/;
/** The one pattern for a shell command that ran the query command. */
export const QUERY_COMMAND = /\bmh query\b/;
const QUERY_PATH = new RegExp(`${QUERY_COMMAND.source}\\s+(?:--\\S+\\s+)*["']?([^\\s"']+)`);

function holdsAll(text: string, steeringMarkers: readonly string[]): boolean {
  return steeringMarkers.every((steeringMarker) => text.includes(steeringMarker));
}

/** A hook response holding every steering marker: the push and assess channels' delivery. */
export function pushDelivery(
  events: readonly SessionEvent[],
  steeringMarkers: readonly string[],
): Delivery | undefined {
  const found = events.find((event) => event.kind === 'hook-response' && holdsAll(event.output, steeringMarkers));
  return found?.kind === 'hook-response' ? { seq: found.seq, path: NOTICE_PATH.exec(found.output)?.[1] } : undefined;
}

/** The shell calls that ran the query command. */
export function queryCalls(events: readonly SessionEvent[]): ToolCall[] {
  return events.filter(
    (event): event is ToolCall => event.kind === 'tool-call' && QUERY_COMMAND.test(commandOf(event)),
  );
}

/** The tool result that answered a call, or undefined when the stream holds none. */
export function resultOf(events: readonly SessionEvent[], call: ToolCall): SessionEvent | undefined {
  return events.find((event) => event.kind === 'tool-result' && event.id === call.id);
}

/** The result of a shell call that ran the query command and returned every steering marker without error. */
export function pullDelivery(
  events: readonly SessionEvent[],
  steeringMarkers: readonly string[],
): Delivery | undefined {
  for (const call of queryCalls(events)) {
    const result = resultOf(events, call);
    if (result?.kind === 'tool-result' && !result.isError && holdsAll(result.text, steeringMarkers))
      return { seq: result.seq, path: QUERY_PATH.exec(commandOf(call))?.[1] };
  }
  return undefined;
}
