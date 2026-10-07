// The canary verdict. One canary per run, per Host harness, delivery channel and
// root layout, run through the provider directly with a task that forces the tool.
// It passes when the stream shows the hook started and answered with non-empty
// output. A failed canary is an instrument failure for every cell sharing the
// configuration; after a passing canary, a hook that did not fire is graded rung 3.

import { NOTICE_PATH, queryCalls, resultOf } from '../observe/delivery.pure.ts';
import type { SessionEvent } from '../stream/session-stream.types.ts';

interface HookCanary {
  /** What to call the hook in a failure sentence. */
  readonly name: string;
  /** Which hook events count: the surface's own, never a hook of another event. */
  readonly counts?: (hookName: string) => boolean;
  /** The words the hook's answer must hold, when it has words of its own; any non-empty answer passes without. */
  readonly notice?: RegExp;
  /** Appended to the failure sentence for a hook that said nothing. */
  readonly silentHint?: string;
}

/** The shared shape of a hook canary: the hook started, then answered, then answered with its own words. */
function hookCanary(events: readonly SessionEvent[], shape: HookCanary): string | undefined {
  const { name, counts = () => true, notice } = shape;
  if (!events.some((event) => event.kind === 'hook-start' && counts(event.hookName)))
    return `canary failed: the ${name} never started`;
  const answers = events.flatMap((event) =>
    event.kind === 'hook-response' && counts(event.hookName) && event.output.trim() !== '' ? [event.output] : [],
  );
  if (answers.length === 0)
    return `canary failed: the ${name} started and answered with nothing${shape.silentHint ?? ''}`;
  if (notice === undefined || answers.some((output) => notice.test(output))) return undefined;
  return `canary failed: the ${name} answered with text that is not the assess notice`;
}

export function evaluateCanary(events: readonly SessionEvent[]): string | undefined {
  return hookCanary(events, { name: 'hook' });
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
 * The assess canary: a `PostToolUse` hook started and answered with the assess notice, the sentence that names a
 * path past its `stale_after`. Only a `PostToolUse` hook counts, because the assess hook is wired there and a
 * hook of another event proves nothing about it; and only the notice counts, because any other non-empty answer
 * is a hook that is not this one. A hook that started and said nothing is the shape of a seed that is not stale:
 * the assess hook is silent on anything but a review.
 */
export function evaluateAssessCanary(events: readonly SessionEvent[]): string | undefined {
  const isPostToolUse = (hookName: string): boolean => hookName.startsWith('PostToolUse');
  return hookCanary(events, {
    name: 'assess hook',
    counts: isPostToolUse,
    notice: NOTICE_PATH,
    silentHint: ', so the seed may not be stale',
  });
}
