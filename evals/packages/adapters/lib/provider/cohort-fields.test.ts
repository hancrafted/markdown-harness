// Colocated unit test for cohort assembly: every cohort field gets a value from a
// complete session, and an omitted source surfaces as a missing field.

import { describe, expect, it } from 'vitest';
import { rungObservations } from '../../../grading/localise-rung.ts';
import { COHORT_FIELDS, buildCohortRow } from '../../../session/cohort-row.ts';
import { carrierHitsOf, cohortFields, hitOf, localisedText } from './cohort-fields.pure.ts';
type CohortSources = Parameters<typeof cohortFields>[0];

const SOURCES: CohortSources = {
  settings: {
    checkout: '/c',
    runId: 'r',
    runDir: '/d',
    seed: 's',
    toolVersion: '0.124.0',
    wrapperRevision: 'abc',
    wrapperDirty: 'false',
    host: { command: ['x'], maxTurns: 4, wallClockMs: 1, tools: ['Write'] },
  },
  cell: {
    arm: 'steered',
    deliveryChannel: 'push',
    shell: 'none',
    encoding: 'hook-prose',
    model: 'sonnet',
    hostName: 'claude-code',
  },
  vars: {
    caseId: 'c',
    task: 't',
    targetPath: 't',
    seedDir: 's',
    carriers: [{ placeholder: 'p', clauseTemplate: 'x', scope: { level: 2, titlePattern: 'F' } }],
    controlPrefix: 'y',
    pullLine: 'z',
  },
  trialIndex: 0,
  providerId: 'push-steered',
  parsed: {
    events: [],
    init: {
      apiKeySource: 'none',
      model: 'm',
      version: 'v',
      permissionMode: 'acceptEdits',
      sessionId: 'sid',
      skills: [],
      mcpServers: [],
      plugins: ['a'],
    },
    result: {
      subtype: 'success',
      isError: false,
      terminalReason: 'completed',
      numTurns: 3,
      text: '',
      modelsUsed: ['m'],
      permissionDenials: 0,
    },
    unparsedLines: 0,
    missingKeys: [],
  },
  observation: {
    observations: rungObservations({}),
    firstWriteHasSteeringMarker: false,
    unionHasSteeringMarker: true,
    finalHasSteeringMarker: true,
    steeringMarkersInFinal: 1,
    steeringMarkerCount: 1,
    delivered: true,
    queryAsked: false,
    injectionFlagged: false,
    creatingTool: 'Write',
    shellCreated: false,
  },
  grades: [{ present: true, placed: null, count: 1, fenceCount: 0, frontmatterCount: 0 }],
  addresses: ['body-structure.rules[ruleId=research].headings[1].intent'],
  localised: { kind: 'clean' },
  digests: { mh: 'a', skills: 'b', root: 'c', config: 'd' },
  timing: { startedAtMs: 1_000, durationMs: 5, nodeVersion: 'v26' },
  charactersDelivered: 120,
};

describe('cohortFields', () => {
  describe('success cases', () => {
    it('fills every cohort field, so the builder accepts a complete session', () => {
      // ARRANGE
      const fields = cohortFields(SOURCES);
      // ACT
      const built = buildCohortRow(fields, []);
      // ASSERT
      expect(built.ok ? [] : built.missing).toEqual([]);
    });

    it('records false and zero as real values', () => {
      // ARRANGE
      const expected = { errorFlag: false, charactersDelivered: 120 };
      // ACT
      const fields = cohortFields(SOURCES);
      // ASSERT
      expect(fields).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('names the field a session did not supply, rather than defaulting it (red by omitting a field)', () => {
      // ARRANGE
      const noInit = { ...SOURCES, parsed: { ...SOURCES.parsed, init: undefined } };
      const expected = 'hostVersion';
      // ACT
      const built = buildCohortRow(cohortFields(noInit), []);
      // ASSERT
      expect(built.ok ? [] : built.missing).toContain(expected);
    });

    it('covers exactly the declared cohort fields, no more and no fewer', () => {
      // ARRANGE
      const expected = [...COHORT_FIELDS].sort();
      // ACT
      const actual = Object.keys(cohortFields(SOURCES)).sort();
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('prints a localisation as a rung number, clean, or cannot localise', () => {
      // ARRANGE
      const expected = ['4', 'clean', 'cannot localise'];
      // ACT
      const actual = [
        localisedText({ kind: 'rung', rung: 4 }),
        localisedText({ kind: 'clean' }),
        localisedText({ kind: 'cannot-localise', blockedBy: 3 }),
      ];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

const HIT = { present: true, placed: true, count: 1, fenceCount: 0, frontmatterCount: 0 };
const MISS = { present: false, placed: null, count: 0, fenceCount: 0, frontmatterCount: 0 };

describe('the hit over several tested carriers', () => {
  describe('success cases', () => {
    it('counts a steered hit only when every steering marker is present, so a partial profile is a miss', () => {
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = [hitOf('steered', [HIT, HIT]), hitOf('steered', [HIT, MISS])];
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('counts an intent-neutralised hit when any one steering marker is present, since that is a leak', () => {
      // ARRANGE
      const expected = [true, false];
      // ACT
      const actual = [hitOf('neutralised', [MISS, HIT]), hitOf('neutralised', [MISS, MISS])];
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('counts a carrier with no grade as a miss in the profile, never as a hit', () => {
      // ARRANGE
      const expected = { a: true, b: false };
      // ACT
      const actual = carrierHitsOf(['a', 'b'], [HIT]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('keys the partial-action profile by carrier address', () => {
      // ARRANGE
      const expected = { 'frontmatter.intent': false, 'body.intent': true };
      // ACT
      const actual = carrierHitsOf(['frontmatter.intent', 'body.intent'], [MISS, HIT]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('prints the profile and the count out of the total in the cohort row', () => {
      // ARRANGE
      const two = {
        ...SOURCES,
        addresses: ['a', 'b'],
        grades: [HIT, MISS],
        observation: { ...SOURCES.observation, steeringMarkersInFinal: 1, steeringMarkerCount: 2 },
      };
      const expected = {
        carrierProfile: 'a=hit; b=miss',
        carrierCount: 2,
        carriersPresent: 1,
        steeringMarkerPresent: false,
      };
      // ACT
      const fields = cohortFields(two);
      // ASSERT
      expect(fields).toMatchObject(expected);
    });
  });
});
