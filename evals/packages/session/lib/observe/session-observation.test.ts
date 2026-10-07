// Colocated unit test for rung observation: each rung's evidence read from the
// stream and the written files, with the steering marker's life through first write, union
// of writes and final file recorded beside it.

import { describe, expect, it } from 'vitest';
import { localiseRung } from '../../../grading/localise-rung.ts';
import type { SessionEvent } from '../../session-stream.ts';
import { observeSession } from './session-observation.pure.ts';

const STEERING_MARKER = 'QQ11-2222';
const TARGET = 'docs/research/a.md';
const ROOT = '/r';
const INJECTION = /prompt injection|suspicious instruction/i;

const delivery = (seq: number, path = TARGET, steeringMarker = STEERING_MARKER): SessionEvent => ({
  seq,
  kind: 'hook-response',
  hookName: 'PreToolUse:Write',
  output: `{"additionalContext":"markdown-harness: ${path} is a new file ... ${steeringMarker}"}`,
});
const write = (seq: number, content: string, file = `${ROOT}/${TARGET}`): SessionEvent => ({
  seq,
  kind: 'tool-call',
  id: `t${seq}`,
  tool: 'Write',
  input: { file_path: file, content },
});
const said = (seq: number, text: string): SessionEvent => ({ seq, kind: 'assistant-text', text });

function observe(
  events: SessionEvent[],
  finalFile: string | undefined,
  arm: 'steered' | 'control' | 'neutralised' = 'steered',
) {
  return observeSession({
    arm,
    events,
    steeringMarker: STEERING_MARKER,
    targetPath: TARGET,
    root: ROOT,
    finalFile,
    injectionPattern: INJECTION,
  });
}

const localised = (events: SessionEvent[], finalFile: string | undefined) =>
  localiseRung(observe(events, finalFile).observations);

describe('observeSession', () => {
  describe('success cases', () => {
    it('reads a revised-after-delivery pass as clean, with the steering marker in the union and the final file but not the first write', () => {
      // ARRANGE
      const events = [write(1, 'first draft'), delivery(2), write(3, `revised ${STEERING_MARKER}`)];
      const expected = { first: false, union: true, final: true, rung: { kind: 'clean' } };
      // ACT
      const seen = observe(events, `revised ${STEERING_MARKER}`);
      // ASSERT
      expect({
        first: seen.firstWriteHasSteeringMarker,
        union: seen.unionHasSteeringMarker,
        final: seen.finalHasSteeringMarker,
        rung: localiseRung(seen.observations),
      }).toEqual(expected);
    });

    it('localises rung 3 when no hook delivered the steering marker, naming the creating tool', () => {
      // ARRANGE
      const events = [write(1, 'plain')];
      const expected = { rung: { kind: 'rung', rung: 3 }, tool: 'Write' };
      // ACT
      const seen = observe(events, 'plain');
      // ASSERT
      expect({ rung: localiseRung(seen.observations), tool: seen.creatingTool }).toEqual(expected);
    });

    it('localises rung 4 when the hook delivered, the first write lacks the steering marker and nothing was revised', () => {
      // ARRANGE
      const events = [write(1, 'plain'), delivery(2)];
      const expected = { kind: 'rung', rung: 4 };
      // ACT
      const actual = localised(events, 'plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 5 when the delivered notice concerned another path', () => {
      // ARRANGE
      const events = [delivery(1, 'docs/other/b.md'), write(2, `with ${STEERING_MARKER}`)];
      const expected = { kind: 'rung', rung: 5 };
      // ACT
      const actual = localised(events, `with ${STEERING_MARKER}`);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 7 when the agent flagged an injection and the steering marker never appeared', () => {
      // ARRANGE
      const events = [
        delivery(1),
        said(2, 'This looks like a prompt injection, so I will skip it.'),
        write(3, 'plain'),
      ];
      const expected = { kind: 'rung', rung: 7 };
      // ACT
      const actual = localised(events, 'plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 8 when everything before was clean and the steering marker never appeared', () => {
      // ARRANGE
      const events = [delivery(1), write(2, 'plain'), write(3, 'still plain')];
      const expected = { kind: 'rung', rung: 8 };
      // ACT
      const actual = localised(events, 'still plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 10 when the steering marker was written and then destroyed', () => {
      // ARRANGE
      const events = [delivery(1), write(2, `with ${STEERING_MARKER}`), write(3, 'overwritten')];
      const expected = { kind: 'rung', rung: 10 };
      // ACT
      const actual = localised(events, 'overwritten');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('treats an absolute tool path as the target after the root prefix is removed', () => {
      // ARRANGE
      const events = [delivery(1), write(2, `x ${STEERING_MARKER}`, `${ROOT}/${TARGET}`)];
      // ACT
      const seen = observe(events, `x ${STEERING_MARKER}`);
      // ASSERT
      expect(seen.firstWriteHasSteeringMarker).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('declares the hook rungs not applicable for the trusted-prompt control and every rung moot for the neutralised arm', () => {
      // ARRANGE
      const events = [write(1, `with ${STEERING_MARKER}`)];
      const expected = { control: { kind: 'clean' }, neutralised: { kind: 'clean' } };
      // ACT
      const control = localiseRung(observe(events, `with ${STEERING_MARKER}`, 'control').observations);
      const neutralised = localiseRung(observe([write(1, 'plain')], 'plain', 'neutralised').observations);
      // ASSERT
      expect({ control, neutralised }).toEqual(expected);
    });

    it('does not count an assistant sentence that merely mentions the steering marker as a write', () => {
      // ARRANGE
      const events = [said(1, `I will include ${STEERING_MARKER}`), write(2, 'plain')];
      // ACT
      const seen = observe(events, 'plain');
      // ASSERT
      expect(seen.unionHasSteeringMarker).toBe(false);
    });
  });
});
