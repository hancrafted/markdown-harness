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
const writeEvent = (seq: number, content: string, file = `${ROOT}/${TARGET}`): SessionEvent => ({
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
    surface: { channel: 'push', shell: 'none', encoding: 'hook-prose' },
    events,
    steeringMarkers: [STEERING_MARKER],
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
      const events = [writeEvent(1, 'first draft'), delivery(2), writeEvent(3, `revised ${STEERING_MARKER}`)];
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
      const events = [writeEvent(1, 'plain')];
      const expected = { rung: { kind: 'rung', rung: 3 }, tool: 'Write' };
      // ACT
      const seen = observe(events, 'plain');
      // ASSERT
      expect({ rung: localiseRung(seen.observations), tool: seen.creatingTool }).toEqual(expected);
    });

    it('localises rung 4 when the hook delivered, the first writeEvent lacks the steering marker and nothing was revised', () => {
      // ARRANGE
      const events = [writeEvent(1, 'plain'), delivery(2)];
      const expected = { kind: 'rung', rung: 4 };
      // ACT
      const actual = localised(events, 'plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 5 when the delivered notice concerned another path', () => {
      // ARRANGE
      const events = [delivery(1, 'docs/other/b.md'), writeEvent(2, `with ${STEERING_MARKER}`)];
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
        writeEvent(3, 'plain'),
      ];
      const expected = { kind: 'rung', rung: 7 };
      // ACT
      const actual = localised(events, 'plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 8 when everything before was clean and the steering marker never appeared', () => {
      // ARRANGE
      const events = [delivery(1), writeEvent(2, 'plain'), writeEvent(3, 'still plain')];
      const expected = { kind: 'rung', rung: 8 };
      // ACT
      const actual = localised(events, 'still plain');
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('localises rung 10 when the steering marker was written and then destroyed', () => {
      // ARRANGE
      const events = [delivery(1), writeEvent(2, `with ${STEERING_MARKER}`), writeEvent(3, 'overwritten')];
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
      const events = [delivery(1), writeEvent(2, `x ${STEERING_MARKER}`, `${ROOT}/${TARGET}`)];
      // ACT
      const seen = observe(events, `x ${STEERING_MARKER}`);
      // ASSERT
      expect(seen.firstWriteHasSteeringMarker).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('declares the hook rungs not applicable for the trusted-prompt control and every rung moot for the neutralised arm', () => {
      // ARRANGE
      const events = [writeEvent(1, `with ${STEERING_MARKER}`)];
      const expected = { control: { kind: 'clean' }, neutralised: { kind: 'clean' } };
      // ACT
      const control = localiseRung(observe(events, `with ${STEERING_MARKER}`, 'control').observations);
      const neutralised = localiseRung(observe([writeEvent(1, 'plain')], 'plain', 'neutralised').observations);
      // ASSERT
      expect({ control, neutralised }).toEqual(expected);
    });

    it('does not count an assistant sentence that merely mentions the steering marker as a write', () => {
      // ARRANGE
      const events = [said(1, `I will include ${STEERING_MARKER}`), writeEvent(2, 'plain')];
      // ACT
      const seen = observe(events, 'plain');
      // ASSERT
      expect(seen.unionHasSteeringMarker).toBe(false);
    });
  });
});

const SECOND_MARKER = 'RR33-4444';

function observeMany(options: {
  events: SessionEvent[];
  finalFile: string | undefined;
  steeringMarkers?: string[];
  surface?: {
    channel: 'push' | 'pull';
    shell: 'none' | 'query-only' | 'widened';
    encoding: 'hook-prose' | 'json' | 'prose' | 'intent-only';
  };
  arm?: 'steered' | 'control' | 'neutralised';
}) {
  return observeSession({
    arm: options.arm ?? 'steered',
    surface: options.surface ?? { channel: 'push', shell: 'none', encoding: 'hook-prose' },
    events: options.events,
    steeringMarkers: options.steeringMarkers ?? [STEERING_MARKER],
    targetPath: TARGET,
    root: ROOT,
    finalFile: options.finalFile,
    injectionPattern: INJECTION,
  });
}

const PULL = { channel: 'pull', shell: 'query-only', encoding: 'json' } as const;
const askEvent = (seq: number, command = `bin/mh query ${TARGET}`): SessionEvent => ({
  seq,
  kind: 'tool-call',
  id: `q${seq}`,
  tool: 'Bash',
  input: { command },
});
const answerEvent = (seq: number, text: string, isError = false): SessionEvent => ({
  seq,
  kind: 'tool-result',
  id: `q${seq - 1}`,
  isError,
  text,
});

describe('observeSession over a pull surface', () => {
  describe('success cases', () => {
    it('reads a query before the first write, with the steering marker followed, as clean past rung 6 (not observable for raw JSON)', () => {
      // ARRANGE
      const events = [
        askEvent(1),
        answerEvent(2, `{"intent":"${STEERING_MARKER}"}`),
        writeEvent(3, `note ${STEERING_MARKER}`),
      ];
      const expected = { delivered: true, rung: { kind: 'clean' } };
      // ACT
      const seen = observeMany({ events, finalFile: `note ${STEERING_MARKER}`, surface: PULL });
      // ASSERT
      expect({ delivered: seen.delivered, rung: localiseRung(seen.observations) }).toEqual(expected);
    });

    it('localises rung 3 when the agent never ran the query command, saying so', () => {
      // ARRANGE
      const events = [writeEvent(1, 'plain')];
      const expected = { rung: { kind: 'rung', rung: 3 }, queryAsked: false };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: PULL });
      // ASSERT
      expect({ rung: localiseRung(seen.observations), queryAsked: seen.queryAsked }).toEqual(expected);
    });

    it('localises rung 4 when the query came after the write and nothing was revised', () => {
      // ARRANGE
      const events = [writeEvent(1, 'plain'), askEvent(2), answerEvent(3, STEERING_MARKER)];
      const expected = { kind: 'rung', rung: 4 };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: PULL });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });

    it('localises rung 5 when the query was about another path', () => {
      // ARRANGE
      const events = [
        askEvent(1, 'bin/mh query docs/other.md'),
        answerEvent(2, STEERING_MARKER),
        writeEvent(3, 'plain'),
      ];
      const expected = { kind: 'rung', rung: 5 };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: PULL });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('cannot localise a model-side null for raw JSON, because rung 6 needs the encoding contrast across cells', () => {
      // ARRANGE
      const events = [askEvent(1), answerEvent(2, STEERING_MARKER), writeEvent(3, 'plain')];
      const expected = { kind: 'cannot-localise', blockedBy: 6 };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: PULL });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });

    it('cannot localise a model-side null for the intents-only encoding either, because an intent-only null is not clean', () => {
      // ARRANGE
      const events = [askEvent(1), answerEvent(2, STEERING_MARKER), writeEvent(3, 'plain')];
      const expected = { kind: 'cannot-localise', blockedBy: 6 };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: { ...PULL, encoding: 'intent-only' } });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });

    it('does not count a query that errored as a delivery, so a denied command is rung 3', () => {
      // ARRANGE
      const events = [askEvent(1), answerEvent(2, `denied ${STEERING_MARKER}`, true), writeEvent(3, 'plain')];
      const expected = { delivered: false, queryAsked: true, rung: { kind: 'rung', rung: 3 } };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', surface: PULL });
      // ASSERT
      expect({ delivered: seen.delivered, queryAsked: seen.queryAsked, rung: localiseRung(seen.observations) }).toEqual(
        expected,
      );
    });
  });

  describe('edge cases', () => {
    it('records rung 2 as not applicable for raw JSON and the intents alone, and clean for the prose rendering', () => {
      // ARRANGE
      const events = [askEvent(1), answerEvent(2, STEERING_MARKER), writeEvent(3, STEERING_MARKER)];
      const rung2 = (encoding: 'json' | 'prose' | 'intent-only') =>
        observeMany({ events, finalFile: STEERING_MARKER, surface: { ...PULL, encoding } }).observations.find(
          (entry) => entry.rung === 2,
        )?.status;
      const expected = ['not-applicable', 'clean', 'not-applicable'];
      // ACT
      const actual = [rung2('json'), rung2('prose'), rung2('intent-only')];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('records rung 6 clean for the intents alone when a steering marker reached the file', () => {
      // ARRANGE
      const events = [askEvent(1), answerEvent(2, STEERING_MARKER), writeEvent(3, STEERING_MARKER)];
      const expected = 'clean';
      const parsingRung = 6;
      // ACT
      const seen = observeMany({ events, finalFile: STEERING_MARKER, surface: { ...PULL, encoding: 'intent-only' } });
      // ASSERT
      expect(seen.observations.find((entry) => entry.rung === parsingRung)?.status).toBe(expected);
    });
  });
});

describe('observeSession over a shell-created file (R0 D6)', () => {
  const shellCall = (seq: number, command: string): SessionEvent => ({
    seq,
    kind: 'tool-call',
    id: `s${seq}`,
    tool: 'Bash',
    input: { command },
  });

  describe('success cases', () => {
    it('counts a file created through the shell as the creating call, so rung 3 names Bash as the coverage hole', () => {
      // ARRANGE
      const events = [shellCall(1, `cat > ${TARGET} <<'EOF'\nplain\nEOF`)];
      const expected = { rung: { kind: 'rung', rung: 3 }, tool: 'Bash', shell: true };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain' });
      // ASSERT
      expect({ rung: localiseRung(seen.observations), tool: seen.creatingTool, shell: seen.shellCreated }).toEqual(
        expected,
      );
    });

    it('reads the steering marker in the shell command as in the first write and the union, and passes on the final file', () => {
      // ARRANGE
      const events = [shellCall(1, `printf '%s' "${STEERING_MARKER}" > ${TARGET}`)];
      const expected = { first: true, union: true, final: true };
      // ACT
      const seen = observeMany({ events, finalFile: STEERING_MARKER });
      // ASSERT
      expect({
        first: seen.firstWriteHasSteeringMarker,
        union: seen.unionHasSteeringMarker,
        final: seen.finalHasSteeringMarker,
      }).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not read a read-only shell call that names the target as a creating call', () => {
      // ARRANGE
      const events = [shellCall(1, `cat ${TARGET}`)];
      const expected = { tool: undefined, shell: false };
      // ACT
      const seen = observeMany({ events, finalFile: undefined });
      // ASSERT
      expect({ tool: seen.creatingTool, shell: seen.shellCreated }).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('ignores a shell call that writes some other file, so the target is the one that counts', () => {
      // ARRANGE
      const events = [shellCall(1, 'echo hi > docs/research/other.md')];
      const expected = { tool: undefined, shell: false };
      // ACT
      const seen = observeMany({ events, finalFile: undefined });
      // ASSERT
      expect({ tool: seen.creatingTool, shell: seen.shellCreated }).toEqual(expected);
    });
  });
});

describe('observeSession over two tested carriers (rung 9)', () => {
  const both = [STEERING_MARKER, SECOND_MARKER];

  describe('success cases', () => {
    it('localises rung 9 when one steering marker reached the final file and the other did not', () => {
      // ARRANGE
      const events = [
        delivery(1, TARGET, `${STEERING_MARKER} ${SECOND_MARKER}`),
        writeEvent(2, `note ${STEERING_MARKER}`),
      ];
      const expected = { rung: { kind: 'rung', rung: 9 }, profile: [1, 2] };
      // ACT
      const seen = observeMany({ events, finalFile: `note ${STEERING_MARKER}`, steeringMarkers: both });
      // ASSERT
      expect({
        rung: localiseRung(seen.observations),
        profile: [seen.steeringMarkersInFinal, seen.steeringMarkerCount],
      }).toEqual(expected);
    });

    it('localises rung 9 over raw JSON pull too, since one steering marker in the file proves the answer was parsed (rung 6 clean)', () => {
      // ARRANGE
      const events = [
        askEvent(1),
        answerEvent(2, `${STEERING_MARKER} ${SECOND_MARKER}`),
        writeEvent(3, `note ${STEERING_MARKER}`),
      ];
      const expected = { kind: 'rung', rung: 9 };
      // ACT
      const seen = observeMany({ events, finalFile: `note ${STEERING_MARKER}`, steeringMarkers: both, surface: PULL });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });

    it('is clean when both reached the final file', () => {
      // ARRANGE
      const text = `note ${STEERING_MARKER} ${SECOND_MARKER}`;
      const events = [delivery(1, TARGET, text), writeEvent(2, text)];
      const expected = { kind: 'clean' };
      // ACT
      const seen = observeMany({ events, finalFile: text, steeringMarkers: both });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('localises rung 8, not 9, when neither steering marker was written anywhere', () => {
      // ARRANGE
      const events = [delivery(1, TARGET, `${STEERING_MARKER} ${SECOND_MARKER}`), writeEvent(2, 'plain')];
      const expected = { kind: 'rung', rung: 8 };
      // ACT
      const seen = observeMany({ events, finalFile: 'plain', steeringMarkers: both });
      // ASSERT
      expect(localiseRung(seen.observations)).toEqual(expected);
    });

    it('does not apply rung 9 to a case with one carrier', () => {
      // ARRANGE
      const events = [delivery(1), writeEvent(2, `note ${STEERING_MARKER}`)];
      const rung = 9;
      const expected = 'not-applicable';
      // ACT
      const seen = observeMany({ events, finalFile: `note ${STEERING_MARKER}` });
      // ASSERT
      expect(seen.observations.find((entry) => entry.rung === rung)?.status).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a steering marker in the union but not the final file as rung 10 even when the other one landed', () => {
      // ARRANGE
      const text = `note ${STEERING_MARKER}`;
      const events = [
        delivery(1, TARGET, `${STEERING_MARKER} ${SECOND_MARKER}`),
        writeEvent(2, `${text} ${SECOND_MARKER}`),
      ];
      const rung10 = 10;
      const expected = 'failed';
      // ACT
      const seen = observeMany({ events, finalFile: text, steeringMarkers: both });
      // ASSERT
      expect(seen.observations.find((entry) => entry.rung === rung10)?.status).toBe(expected);
    });
  });
});
