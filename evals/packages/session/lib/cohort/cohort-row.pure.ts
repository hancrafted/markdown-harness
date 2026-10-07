// The cohort builder. Every field is required with no default: a field with no
// value fails the run, because a row that says `unknown` where a value was owed
// is a row two runs could be wrongly compared on. `unknown` is legal only for a
// field the observation table says the provider could not observe.
//
// Two runs are comparable only when their cohort is recorded by content and not
// by commit, so a pure comparison refuses to pair rows that differ in any of the
// fields that define the cohort.

import type { CohortBuild, CohortRow, Pairing } from './cohort-row.types.ts';

export const COHORT_FIELDS: readonly string[] = [
  'runId',
  'trialIndex',
  'caseId',
  'arm',
  'deliveryChannel',
  'shell',
  'encoding',
  'providerId',
  'seed',
  'hostName',
  'hostVersion',
  'resolvedModel',
  'requestedModel',
  'isolation',
  'leakedSurface',
  'turnCap',
  'wallClockMs',
  'modelFamily',
  'toolCount',
  'permissionMode',
  'permissionScope',
  'authSource',
  'skillCount',
  'serverCount',
  'pluginCount',
  'sessionId',
  'startedAt',
  'durationMs',
  'turnCount',
  'errorFlag',
  'terminalReason',
  'evalToolVersion',
  'wrapperRevision',
  'wrapperDirty',
  'nodeVersion',
  'mhDigest',
  'skillScriptsDigest',
  'mintedRootDigest',
  'derivedConfigDigest',
  'charactersDelivered',
  'canary',
  'observations',
  'localisedRung',
  'steeringMarkerPresent',
  'steeringMarkerPlaced',
  'steeringMarkerCount',
  'steeringMarkerFenceCount',
  'steeringMarkerFrontmatterCount',
  'firstWriteHasSteeringMarker',
  'unionHasSteeringMarker',
  'finalHasSteeringMarker',
  'carrierCount',
  'carriersPresent',
  'carrierProfile',
  'creatingTool',
  'shellCreated',
  'queryAsked',
  'staleAfterMoved',
];

/** The fields that define a cohort: rows differing in any of them are never paired. */
const PAIRING_FIELDS: readonly string[] = [
  'hostName',
  'hostVersion',
  'resolvedModel',
  'isolation',
  'leakedSurface',
  'turnCap',
  'permissionScope',
  'wallClockMs',
  'deliveryChannel',
  'shell',
  'encoding',
  'mhDigest',
  'skillScriptsDigest',
  'evalToolVersion',
];

function isMissing(value: unknown, field: string, unobservable: readonly string[]): boolean {
  if (value === undefined || value === null || value === '') return true;
  return value === 'unknown' && !unobservable.includes(field);
}

export function buildCohortRow(
  fields: Readonly<Record<string, unknown>>,
  unobservable: readonly string[],
): CohortBuild {
  const missing = COHORT_FIELDS.filter((field) => isMissing(fields[field], field, unobservable));
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, row: Object.fromEntries(COHORT_FIELDS.map((field) => [field, fields[field]])) };
}

export function pairCohorts(left: CohortRow, right: CohortRow): Pairing {
  const differing = PAIRING_FIELDS.filter((field) => left[field] !== right[field]);
  return differing.length === 0 ? { ok: true } : { ok: false, differing };
}
