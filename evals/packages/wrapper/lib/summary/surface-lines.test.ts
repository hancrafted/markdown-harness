// Colocated unit test for the surface-specific summary lines: the encoding contrast
// (rung 6), the shell coverage hole (D6) and the carrier profile (rung 9). Each is
// shown red against a run constructed to trip it, and quiet against one that does not.

import { describe, expect, it } from 'vitest';
import { carrierProfileLine, encodingContrastLines, rungLegendLines, shellLine } from './surface-lines.pure.ts';

interface Surface {
  channel: string;
  shell: string;
  encoding: string;
}
const PULL = (encoding: string): Surface => ({ channel: 'pull', shell: 'query-only', encoding });
const session = (cell: string, surface: Surface, hit: boolean) => ({
  cell,
  arm: 'steered' as const,
  graded: true,
  steeringMarkerPresent: hit,
  localised: hit ? 'clean' : 'cannot localise',
  surface,
});
const many = (cell: string, surface: Surface, tally: { hits: number; total: number }) =>
  Array.from({ length: tally.total }, (_, index) => session(cell, surface, index < tally.hits));

describe('encodingContrastLines', () => {
  describe('success cases', () => {
    it('prints each encoding as a count out of its total, simplest first', () => {
      // ARRANGE
      const sessions = [
        ...many('pull-json-steered', PULL('json'), { hits: 6, total: 8 }),
        ...many('pull-intent-only-steered', PULL('intent-only'), { hits: 8, total: 8 }),
      ];
      const expected =
        'encoding contrast, pull (rung 6, exact one-sided Fisher, 5% level, PROVISIONAL): intent-only 8/8, json 6/8';
      // ACT
      const lines = encodingContrastLines(sessions);
      // ASSERT
      expect(lines[0]).toBe(expected);
    });

    it('implicates rung 6 when the raw JSON loses hits to the intents alone', () => {
      // ARRANGE
      const sessions = [
        ...many('pull-json-steered', PULL('json'), { hits: 1, total: 8 }),
        ...many('pull-intent-only-steered', PULL('intent-only'), { hits: 8, total: 8 }),
      ];
      const expected = /rung 6 implicated, json loses hits to intent-only/;
      // ACT
      const lines = encodingContrastLines(sessions).join('\n');
      // ASSERT
      expect(lines).toMatch(expected);
    });
  });

  describe('failure cases', () => {
    it('shows no encoding effect when the rates match', () => {
      // ARRANGE
      const sessions = [
        ...many('pull-json-steered', PULL('json'), { hits: 7, total: 8 }),
        ...many('pull-prose-steered', PULL('prose'), { hits: 7, total: 8 }),
        ...many('pull-intent-only-steered', PULL('intent-only'), { hits: 7, total: 8 }),
      ];
      const expected = /prose vs intent-only: p=0\.7667, no encoding effect shown/;
      // ACT
      const lines = encodingContrastLines(sessions).join('\n');
      // ASSERT
      expect(lines).toMatch(expected);
    });
  });

  describe('edge cases', () => {
    it('prints nothing when fewer than two encodings ran, and ignores push cells', () => {
      // ARRANGE
      const push = { channel: 'push', shell: 'none', encoding: 'hook-prose' };
      const sessions = [
        ...many('pull-json-steered', PULL('json'), { hits: 4, total: 8 }),
        ...many('push-steered', push, { hits: 0, total: 8 }),
      ];
      // ACT
      const lines = encodingContrastLines(sessions);
      // ASSERT
      expect(lines).toEqual([]);
    });
  });
});

describe('shellLine', () => {
  const WIDENED = { channel: 'push', shell: 'widened', encoding: 'hook-prose' };

  describe('success cases', () => {
    it('counts the sessions that created the file through the shell, over the cell total', () => {
      // ARRANGE
      const sessions = [
        { ...session('push-shell-steered', WIDENED, false), ...{ shellCreated: true } },
        { ...session('push-shell-steered', WIDENED, true), ...{ shellCreated: false } },
        { ...session('push-shell-steered', WIDENED, false), ...{ shellCreated: true } },
      ];
      const expected =
        'push-shell-steered: created through the shell in 2/3 sessions (shell allowed; the hook matches Write only)';
      // ACT
      const line = shellLine('push-shell-steered', sessions);
      // ASSERT
      expect(line).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('says nothing about a widened cell with no graded session, rather than a zero out of zero', () => {
      // ARRANGE
      const ungraded = [{ ...session('push-shell-steered', WIDENED, false), graded: false }];
      // ACT
      const line = shellLine('push-shell-steered', ungraded);
      // ASSERT
      expect(line).toBeUndefined();
    });
  });

  describe('failure cases', () => {
    it('says nothing about a cell that allowed no shell', () => {
      // ARRANGE
      const sessions = [session('push-steered', { channel: 'push', shell: 'none', encoding: 'hook-prose' }, true)];
      // ACT
      const line = shellLine('push-steered', sessions);
      // ASSERT
      expect(line).toBeUndefined();
    });
  });
});

describe('carrierProfileLine', () => {
  describe('success cases', () => {
    it('names the carrier that decays, as a count out of the cell total', () => {
      // ARRANGE
      const hits = (a: boolean, b: boolean) => ({ carrierHits: { 'body.intent': a, 'frontmatter.intent': b } });
      const sessions = [
        { ...session('c', PULL('json'), false), ...hits(true, false) },
        { ...session('c', PULL('json'), false), ...hits(true, false) },
        { ...session('c', PULL('json'), true), ...hits(true, true) },
      ];
      const expected = 'c: carrier profile (rung 9): body.intent 3/3; frontmatter.intent 1/3';
      // ACT
      const line = carrierProfileLine('c', sessions);
      // ASSERT
      expect(line).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('says nothing for a case with one carrier', () => {
      // ARRANGE
      const sessions = [{ ...session('c', PULL('json'), true), ...{ carrierHits: { 'body.intent': true } } }];
      // ACT
      const line = carrierProfileLine('c', sessions);
      // ASSERT
      expect(line).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('leaves the intent-neutralised arm out, since it carries no steering marker to profile', () => {
      // ARRANGE
      const hits = { carrierHits: { 'a.intent': false, 'b.intent': false } };
      const sessions = [{ ...session('n', PULL('json'), false), arm: 'neutralised' as const, ...hits }];
      // ACT
      const line = carrierProfileLine('n', sessions);
      // ASSERT
      expect(line).toBeUndefined();
    });
  });
});

describe('rungLegendLines', () => {
  describe('success cases', () => {
    it('says rung 2 is not applicable for raw JSON and the intents alone, and a checked precondition for prose', () => {
      // ARRANGE
      const sessions = [session('pull-intent-only-steered', PULL('intent-only'), true)];
      const expected = /rung 2 \(pull\): not applicable for json and intent-only \(no rendering step\)/;
      // ACT
      const lines = rungLegendLines(sessions).join('\n');
      // ASSERT
      expect(lines).toMatch(expected);
    });

    it('names the deviation from the spec text and says an intent-only precondition failure is not rung 2', () => {
      // ARRANGE
      const sessions = [session('pull-intent-only-steered', PULL('intent-only'), true)];
      const expected = /deviates from the spec text.*pull-answer-failed, an instrument failure, never rung 2/;
      // ACT
      const lines = rungLegendLines(sessions).join('\n');
      // ASSERT
      expect(lines).toMatch(expected);
    });
  });

  describe('failure cases', () => {
    it('is silent for a run with no pull cell', () => {
      // ARRANGE
      const sessions = [session('push-steered', { channel: 'push', shell: 'none', encoding: 'hook-prose' }, true)];
      // ACT
      const lines = rungLegendLines(sessions);
      // ASSERT
      expect(lines).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('is silent when the sidecar recorded no surface', () => {
      // ARRANGE
      const sessions = [{ ...session('old', PULL('json'), true), surface: undefined }];
      // ACT
      const lines = rungLegendLines(sessions);
      // ASSERT
      expect(lines).toEqual([]);
    });
  });
});
