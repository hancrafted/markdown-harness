// The canary verdict. One canary per run, per Host harness, delivery channel and
// root layout, run through the provider directly with a task that forces the tool.
// It passes when the stream shows the hook started and answered with non-empty
// output. A failed canary is an instrument failure for every cell sharing the
// configuration; after a passing canary, a hook that did not fire is graded rung 3.

import { queryCalls, resultOf } from '../observe/delivery.pure.ts';
import type { SessionEvent } from '../stream/session-stream.types.ts';

export function evaluateCanary(events: readonly SessionEvent[]): string | undefined {
  const started = events.some((event) => event.kind === 'hook-start');
  if (!started) return 'canary failed: the hook never started';
  const answered = events.some((event) => event.kind === 'hook-response' && event.output.trim() !== '');
  return answered ? undefined : 'canary failed: the hook started and answered with nothing';
}

/**
 * The pull canary: the same instrument-versus-result line for a surface with no hook. It passes when the stream
 * shows a shell call that ran the query command and got a non-empty answer back without error, which proves the
 * allow-list lets the pull command through headless in this Host harness and root layout. A command that was
 * denied, or never ran at all under a task that names it, is an instrument failure for every cell sharing the key.
 */
export function evaluatePullCanary(events: readonly SessionEvent[]): string | undefined {
  const calls = queryCalls(events);
  if (calls.length === 0) return 'canary failed: the pull command never ran';
  const answered = calls
    .map((call) => resultOf(events, call))
    .some((result) => result?.kind === 'tool-result' && !result.isError && result.text.trim() !== '');
  return answered ? undefined : 'canary failed: the pull command ran and answered with an error or nothing';
}

/**
 * The assess canary: a Read hook started and answered with a notice. Only a `PostToolUse` hook counts, because
 * the assess hook is wired there and a hook of another event proves nothing about it. A hook that started and
 * said nothing is the shape of a seed that is not stale: the assess hook is silent on anything but a review.
 */
export function evaluateAssessCanary(events: readonly SessionEvent[]): string | undefined {
  const isRead = (hookName: string): boolean => hookName.startsWith('PostToolUse');
  const started = events.some((event) => event.kind === 'hook-start' && isRead(event.hookName));
  if (!started) return 'canary failed: the assess hook never started';
  const answered = events.some(
    (event) => event.kind === 'hook-response' && isRead(event.hookName) && event.output.trim() !== '',
  );
  return answered
    ? undefined
    : 'canary failed: the assess hook started and answered with nothing, so the seed may not be stale';
}
