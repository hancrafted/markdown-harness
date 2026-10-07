// Rung observation from a stream and the written files (decision 11).
//
//   rung 3  hook response carrying the marker proves delivery; its absence is graded
//   rung 4  delivered, first write lacks the marker, nothing revised after
//   rung 5  the notice's path differs from the target path
//   rung 7  injection-flagging phrase in the assistant text, marker absent
//   rung 8  marker absent from the first write, the union and the final file
//   rung 10 marker in the union, absent from the final file
//
// Rungs 1 and 2 are preconditions checked before the session: reaching a session
// means they were clean. Rungs 6 and 9 are not instrumented in phase 1.

import type { RungNumber, RungStatus } from '../../../grading/localise-rung.ts';
import { rungObservations } from '../../../grading/localise-rung.ts';
import type { SessionEvent } from '../stream/session-stream.types.ts';
import type { ObserveInput, SessionObservation } from './session-observation.types.ts';

const WRITING_TOOLS = ['Write', 'Edit', 'MultiEdit'];
const NOTICE_PATH = /markdown-harness: (\S+) is a new file/;

type ToolCall = Extract<SessionEvent, { kind: 'tool-call' }>;

function relative(path: string, root: string): string {
  const inside = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  return inside.replace(/^\.\//, '');
}

function writtenText(call: ToolCall): string {
  const input = call.input;
  const parts = [
    input.content,
    input.new_string,
    input.new_str,
    ...(Array.isArray(input.edits) ? input.edits.map((edit: { new_string?: unknown }) => edit.new_string) : []),
  ];
  return parts.filter((part): part is string => typeof part === 'string').join('\n');
}

const failed = (condition: boolean): RungStatus => (condition ? 'failed' : 'clean');

function noticeStatus(input: ObserveInput, facts: Facts): RungStatus {
  return facts.noticePath === undefined
    ? 'not-observable'
    : failed(relative(facts.noticePath, input.root) !== input.targetPath);
}

function modelSideStatuses(facts: Facts): Partial<Record<RungNumber, RungStatus>> {
  const absent = !facts.union && !facts.final;
  return { 7: failed(facts.injectionFlagged && absent), 8: failed(absent), 10: failed(facts.union && !facts.final) };
}

function steeredStatuses(input: ObserveInput, facts: Facts): Partial<Record<RungNumber, RungStatus>> {
  return {
    3: failed(!facts.hookDelivered),
    4: failed(facts.hookDelivered && !facts.first && !facts.revisedAfterDelivery),
    5: noticeStatus(input, facts),
    6: 'not-applicable',
    9: 'not-applicable',
    ...modelSideStatuses(facts),
  };
}

interface Facts {
  readonly first: boolean;
  readonly union: boolean;
  readonly final: boolean;
  readonly hookDelivered: boolean;
  readonly revisedAfterDelivery: boolean;
  readonly noticePath: string | undefined;
  readonly injectionFlagged: boolean;
  readonly creatingTool: string | undefined;
}

type Delivery = Extract<SessionEvent, { kind: 'hook-response' }>;

function writingCalls(events: readonly SessionEvent[]): ToolCall[] {
  return events.filter((event): event is ToolCall => event.kind === 'tool-call' && WRITING_TOOLS.includes(event.tool));
}

function deliveriesOf(events: readonly SessionEvent[], marker: string): Delivery[] {
  return events.filter((event): event is Delivery => event.kind === 'hook-response' && event.output.includes(marker));
}

function flaggedInjection(input: ObserveInput): boolean {
  return input.events.some((event) => event.kind === 'assistant-text' && input.injectionPattern.test(event.text));
}

function noticePathOf(delivery: Delivery | undefined): string | undefined {
  return delivery === undefined ? undefined : NOTICE_PATH.exec(delivery.output)?.[1];
}

function revisedAfter(calls: readonly ToolCall[], delivery: Delivery | undefined): boolean {
  return delivery !== undefined && calls.some((call) => call.seq > delivery.seq);
}

function gather(input: ObserveInput): Facts {
  const calls = writingCalls(input.events);
  const delivery = deliveriesOf(input.events, input.marker)[0];
  const firstCall = calls.find((call) => call.tool === 'Write');
  const has = (call: ToolCall | undefined): boolean => call !== undefined && writtenText(call).includes(input.marker);
  return {
    first: has(firstCall),
    union: calls.some(has),
    final: input.finalFile?.includes(input.marker) ?? false,
    hookDelivered: delivery !== undefined,
    revisedAfterDelivery: revisedAfter(calls, delivery),
    noticePath: noticePathOf(delivery),
    injectionFlagged: flaggedInjection(input),
    creatingTool: (firstCall ?? calls[0])?.tool,
  };
}

function statusesFor(input: ObserveInput, facts: Facts): Partial<Record<RungNumber, RungStatus>> {
  if (input.arm === 'steered') return steeredStatuses(input, facts);
  const moot: Partial<Record<RungNumber, RungStatus>> = {
    1: 'not-applicable',
    2: 'not-applicable',
    3: 'not-applicable',
    4: 'not-applicable',
    5: 'not-applicable',
    6: 'not-applicable',
    9: 'not-applicable',
  };
  if (input.arm === 'neutralised') return { ...moot, 7: 'not-applicable', 8: 'not-applicable', 10: 'not-applicable' };
  const failed = (condition: boolean): RungStatus => (condition ? 'failed' : 'clean');
  return {
    ...moot,
    7: failed(facts.injectionFlagged && !facts.union && !facts.final),
    8: failed(!facts.union && !facts.final),
    10: failed(facts.union && !facts.final),
  };
}

export function observeSession(input: ObserveInput): SessionObservation {
  const facts = gather(input);
  return {
    observations: rungObservations(statusesFor(input, facts)),
    firstWriteHasMarker: facts.first,
    unionHasMarker: facts.union,
    finalHasMarker: facts.final,
    hookDelivered: facts.hookDelivered,
    injectionFlagged: facts.injectionFlagged,
    creatingTool: facts.creatingTool,
  };
}
