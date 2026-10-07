// The canary verdict. One canary per run, per Host harness, delivery channel and
// root layout, run through the provider directly with a task that forces the tool.
// It passes when the stream shows the hook started and answered with non-empty
// output. A failed canary is an instrument failure for every cell sharing the
// configuration; after a passing canary, a hook that did not fire is graded rung 3.

import type { SessionEvent } from '../stream/session-stream.types.ts';

export function evaluateCanary(events: readonly SessionEvent[]): string | undefined {
  const started = events.some((event) => event.kind === 'hook-start');
  if (!started) return 'canary failed: the hook never started';
  const answered = events.some((event) => event.kind === 'hook-response' && event.output.trim() !== '');
  return answered ? undefined : 'canary failed: the hook started and answered with nothing';
}
