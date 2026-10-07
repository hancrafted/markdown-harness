// Colocated unit test for cohort assembly: every cohort field gets a value from a
// complete session, and an omitted source surfaces as a missing field.

import { describe, expect, it } from 'vitest';
import { rungObservations } from '../../../grading/localise-rung.ts';
import { COHORT_FIELDS, buildCohortRow } from '../../../session/cohort-row.ts';
import { profileOf } from '../../../session/host-profile.ts';
import { carrierHitsOf, cohortFields, localisedText } from './cohort-fields.pure.ts';
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
      toolCount: 3,
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

describe('the carrier profile over several tested carriers', () => {
  describe('success cases', () => {
    it('keys each carrier address to whether its steering marker is in the final file', () => {
      // ARRANGE
      const expected = { a: true, b: false };
      // ACT
      const actual = carrierHitsOf(['a', 'b'], [HIT, MISS]);
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

const AGY_SOURCES: CohortSources = {
  ...SOURCES,
  cell: { ...SOURCES.cell, hostName: 'antigravity', model: 'gemini-3.8-flash-low' },
  parsed: {
    ...SOURCES.parsed,
    init: {
      apiKeySource: 'unknown',
      model: 'gemini-3.8-flash-low',
      version: 'unknown',
      permissionMode: 'always-proceed',
      sessionId: 'c-1',
      toolCount: 60,
      skills: [],
      mcpServers: [],
      plugins: [],
    },
    result: { ...SOURCES.parsed.result!, modelsUsed: ['gemini-3.8-flash-low'] },
  },
  settings: { ...SOURCES.settings, host: { ...SOURCES.settings.host, wallClockMs: 600_000 } },
};

describe('the Host harness facts in the cohort row', () => {
  describe('success cases', () => {
    it('records for Antigravity that nothing isolates the run, what leaked, that no turn cap exists, and the wall-clock bound', () => {
      // ARRANGE
      const expected = {
        isolation: 'none',
        leakedSurface: profileOf('antigravity').leakedSurface,
        turnCap: 'none',
        wallClockMs: 600_000,
        toolCount: 60,
      };
      // ACT
      const fields = cohortFields(AGY_SOURCES);
      // ASSERT
      expect(fields).toMatchObject(expected);
    });

    it('records the model id and its family, so a Claude model run through agy is not read as Gemini', () => {
      // ARRANGE
      const claudeThroughAgy = {
        ...AGY_SOURCES,
        parsed: {
          ...AGY_SOURCES.parsed,
          result: { ...AGY_SOURCES.parsed.result!, modelsUsed: ['claude-sonnet-5-5-medium'] },
        },
      };
      const expected = { resolvedModel: 'claude-sonnet-5-5-medium', modelFamily: 'claude', hostName: 'antigravity' };
      // ACT
      const fields = cohortFields(claudeThroughAgy);
      // ASSERT
      expect(fields).toMatchObject(expected);
    });

    it('records for Claude Code that flags isolate the run and its turn cap', () => {
      // ARRANGE
      const expected = { isolation: 'flags', leakedSurface: 'none', turnCap: '4', modelFamily: 'other' };
      // ACT
      const fields = cohortFields(SOURCES);
      // ASSERT
      expect(fields).toMatchObject(expected);
    });

    it('accepts an Antigravity row, writing unknown for the fields its init cannot supply and only those', () => {
      // ARRANGE
      const expected = { hostVersion: 'unknown', authSource: 'unknown', skillCount: 'unknown' };
      // ACT
      const fields = cohortFields(AGY_SOURCES);
      const built = buildCohortRow(fields, profileOf('antigravity').unobservable);
      // ASSERT
      expect(fields).toMatchObject(expected);
      expect(built.ok ? [] : built.missing).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('refuses an Antigravity row that has no wall-clock bound, because it is the only limit on that session', () => {
      // ARRANGE
      const fields = { ...cohortFields(AGY_SOURCES), wallClockMs: undefined };
      const expected = { ok: false, missing: ['wallClockMs'] };
      // ACT
      const built = buildCohortRow(fields, profileOf('antigravity').unobservable);
      // ASSERT
      expect(built).toEqual(expected);
    });

    it('refuses a Claude Code row that says unknown for a field Claude Code can observe', () => {
      // ARRANGE
      const fields = { ...cohortFields(SOURCES), authSource: 'unknown' };
      const expected = { ok: false, missing: ['authSource'] };
      // ACT
      const built = buildCohortRow(fields, profileOf('claude-code').unobservable);
      // ASSERT
      expect(built).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('names the family unknown when the model was never observed', () => {
      // ARRANGE
      const noModel = { ...AGY_SOURCES, parsed: { ...AGY_SOURCES.parsed, init: undefined, result: undefined } };
      // ACT
      const fields = cohortFields(noModel);
      // ASSERT
      expect(fields.modelFamily).toBeUndefined();
    });
  });
});
