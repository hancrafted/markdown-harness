// Rung observation from a stream and the written files (decision 11).
//
//   rung 3  steering content reaching the agent proves delivery; its absence is graded
//   rung 4  delivered, first creating call lacks a steering marker, nothing revised after
//   rung 5  the path the answer was about differs from the target path
//   rung 6  pull only: parsing shows in a steering marker reaching the file; a null is told from rung 8 by the encoding contrast across cells
//   rung 7  injection-flagging phrase in the assistant text, no steering marker anywhere
//   rung 8  no steering marker in the first write, the union or the final file
//   rung 9  some steering markers in the final file and some absent (a case with several carriers)
//   rung 10 a steering marker in the union and absent from the final file
//
// Rungs 1 and 2 are preconditions checked before the session: reaching a session
// means they were clean, except rung 2 for the raw JSON pull answer, which has no rendering step.

import type { RungNumber, RungStatus } from '../../../grading/localise-rung.ts';
import { rungObservations } from '../../../grading/localise-rung.ts';
import { creatingCalls, firstCreating, writtenText } from './creation.pure.ts';
import { findDelivery, queryCalls } from './delivery.pure.ts';
import type { Delivery, ObserveInput, SessionObservation, ToolCall } from './session-observation.types.ts';

type Statuses = Partial<Record<RungNumber, RungStatus>>;

interface Life {
  readonly first: boolean;
  readonly union: boolean;
  readonly final: boolean;
}

interface Facts {
  readonly lives: readonly Life[];
  readonly delivery: Delivery | undefined;
  readonly queryAsked: boolean;
  readonly revisedAfterDelivery: boolean;
  readonly injectionFlagged: boolean;
  readonly creatingTool: string | undefined;
  readonly shellCreated: boolean;
}

const failed = (condition: boolean): RungStatus => (condition ? 'failed' : 'clean');

function relative(path: string, root: string): string {
  const inside = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  return inside.replace(/^\.\//, '');
}

function lifeOf(steeringMarker: string, calls: readonly ToolCall[], finalFile: string | undefined): Life {
  const first = firstCreating(calls);
  return {
    first: first !== undefined && writtenText(first).includes(steeringMarker),
    union: calls.some((call) => writtenText(call).includes(steeringMarker)),
    final: finalFile?.includes(steeringMarker) ?? false,
  };
}

function flaggedInjection(input: ObserveInput): boolean {
  return input.events.some((event) => event.kind === 'assistant-text' && input.injectionPattern.test(event.text));
}

function gather(input: ObserveInput): Facts {
  const calls = creatingCalls(input.events, input.targetPath);
  const delivery = findDelivery(input.events, input.surface.channel, input.steeringMarkers);
  return {
    lives: input.steeringMarkers.map((steeringMarker) => lifeOf(steeringMarker, calls, input.finalFile)),
    delivery,
    queryAsked: queryCalls(input.events).length > 0,
    revisedAfterDelivery: delivery !== undefined && calls.some((call) => call.seq > delivery.seq),
    injectionFlagged: flaggedInjection(input),
    creatingTool: firstCreating(calls)?.tool,
    shellCreated: calls.some((call) => call.tool === 'Bash'),
  };
}

const every = (lives: readonly Life[], pick: (life: Life) => boolean): boolean => lives.every(pick);

function modelSideStatuses(facts: Facts): Statuses {
  const { lives } = facts;
  const anyUnion = lives.some((life) => life.union);
  const anyFinal = lives.some((life) => life.final);
  const none = !anyUnion && !anyFinal;
  return {
    7: failed(facts.injectionFlagged && none),
    8: failed(none),
    9: lives.length > 1 ? failed(anyFinal && !every(lives, (life) => life.final)) : 'not-applicable',
    10: failed(lives.some((life) => life.union && !life.final)),
  };
}

function pathStatus(input: ObserveInput, delivery: Delivery | undefined): RungStatus {
  return delivery?.path === undefined
    ? 'not-observable'
    : failed(relative(delivery.path, input.root) !== input.targetPath);
}

/**
 * Rungs 2 and 6, which depend on how the surface renders and encodes what it delivers. Rung 6 (delivered, unparsed)
 * can be told from rung 8 only across cells, by the encoding contrast: a steering marker in the final file proves
 * the answer was parsed, the intents-only encoding has little to misparse, and any other null leaves it unobservable.
 */
function surfaceStatuses(input: ObserveInput, facts: Facts): Statuses {
  const { channel, encoding } = input.surface;
  if (channel !== 'pull') return { 6: 'not-applicable' };
  const parsed = encoding === 'intent-only' || facts.lives.some((life) => life.final);
  return { 2: encoding === 'json' ? 'not-applicable' : 'clean', 6: parsed ? 'clean' : 'not-observable' };
}

function reachedStatuses(input: ObserveInput, facts: Facts): Statuses {
  const delivered = facts.delivery !== undefined;
  return {
    3: failed(!delivered),
    4: failed(delivered && !every(facts.lives, (life) => life.first) && !facts.revisedAfterDelivery),
    5: pathStatus(input, facts.delivery),
    ...surfaceStatuses(input, facts),
  };
}

const NOT_APPLICABLE: Statuses = Object.fromEntries(
  ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((rung) => [rung, 'not-applicable' as const]),
);

function statusesFor(input: ObserveInput, facts: Facts): Statuses {
  if (input.arm === 'neutralised') return NOT_APPLICABLE;
  const moot: Statuses = { ...NOT_APPLICABLE, ...modelSideStatuses(facts) };
  return input.arm === 'control' ? moot : { ...modelSideStatuses(facts), ...reachedStatuses(input, facts) };
}

export function observeSession(input: ObserveInput): SessionObservation {
  const facts = gather(input);
  const { lives } = facts;
  return {
    observations: rungObservations(statusesFor(input, facts)),
    firstWriteHasSteeringMarker: every(lives, (life) => life.first),
    unionHasSteeringMarker: every(lives, (life) => life.union),
    finalHasSteeringMarker: every(lives, (life) => life.final),
    steeringMarkersInFinal: lives.filter((life) => life.final).length,
    steeringMarkerCount: lives.length,
    delivered: facts.delivery !== undefined,
    queryAsked: facts.queryAsked,
    injectionFlagged: facts.injectionFlagged,
    creatingTool: facts.creatingTool,
    shellCreated: facts.shellCreated,
  };
}
