// The pre-screen's pure run parts: what each session is asked, what of its answer is
// scanned, and which command runs it. Kept apart from the impure run so each is tested alone.

import type { SessionEvent } from '../../../session/session-stream.ts';
import type { RunLocation, StubMode } from './prescreen.types.ts';

/** The case's task, then the task with the carrier's plausible first half, the steering clause left out. Index-aligned with `PROMPTS`. */
export function promptsFor(task: string, firstHalf: string): string[] {
  return [task, `${task}\n\nThe repository's guidance for this section: ${firstHalf}`];
}

/** The text a session said: its assistant turns and its final result, joined; tool traffic is not an answer. */
export function answerText(events: readonly SessionEvent[]): string {
  return events
    .flatMap((event) => (event.kind === 'assistant-text' || event.kind === 'result' ? [event.text] : []))
    .join('\n');
}

/** The command a session runs: the real Host harness, or the stub script in the mode the self-test chose. */
export function hostCommand(host: 'claude' | 'stub', stubMode: StubMode, where: RunLocation): string[] {
  return host === 'stub'
    ? [
        'node',
        `${where.checkout}/evals/self-test/stub-host.mjs`,
        '--mode',
        stubMode,
        '--log',
        `${where.runDir}/stub-sessions.log`,
      ]
    : ['claude'];
}
