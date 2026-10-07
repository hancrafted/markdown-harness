// Finding the moment steering content arrived, by channel. Push: a hook response
// holding every steering marker. Pull: the result of a shell call that ran the query
// command and returned every steering marker without error. The user turn is not a
// delivery in the stream. Each delivery names the path it was about.

import type { SessionEvent } from '../stream/session-stream.types.ts';
import type { DeliveryChannel } from '../surface/delivery-surface.types.ts';
import { commandOf } from './creation.pure.ts';
import type { Delivery, ToolCall } from './session-observation.types.ts';

const NOTICE_PATH = /markdown-harness: (\S+) is a new file/;
const QUERY_PATH = /\bmh query\s+(?:--\S+\s+)*["']?([^\s"']+)/;

function holdsAll(text: string, markers: readonly string[]): boolean {
  return markers.every((marker) => text.includes(marker));
}

function pushDelivery(events: readonly SessionEvent[], markers: readonly string[]): Delivery | undefined {
  const found = events.find((event) => event.kind === 'hook-response' && holdsAll(event.output, markers));
  return found?.kind === 'hook-response' ? { seq: found.seq, path: NOTICE_PATH.exec(found.output)?.[1] } : undefined;
}

/** The shell calls that ran the query command. */
export function queryCalls(events: readonly SessionEvent[]): ToolCall[] {
  return events.filter(
    (event): event is ToolCall => event.kind === 'tool-call' && /\bmh query\b/.test(commandOf(event)),
  );
}

function resultOf(events: readonly SessionEvent[], call: ToolCall): SessionEvent | undefined {
  return events.find((event) => event.kind === 'tool-result' && event.id === call.id);
}

function pullDelivery(events: readonly SessionEvent[], markers: readonly string[]): Delivery | undefined {
  for (const call of queryCalls(events)) {
    const result = resultOf(events, call);
    if (result?.kind === 'tool-result' && !result.isError && holdsAll(result.text, markers))
      return { seq: result.seq, path: QUERY_PATH.exec(commandOf(call))?.[1] };
  }
  return undefined;
}

export function findDelivery(
  events: readonly SessionEvent[],
  channel: DeliveryChannel,
  markers: readonly string[],
): Delivery | undefined {
  if (channel === 'push') return pushDelivery(events, markers);
  return channel === 'pull' ? pullDelivery(events, markers) : undefined;
}
