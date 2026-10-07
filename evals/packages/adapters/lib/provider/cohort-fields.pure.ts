// Assembling one cohort row's fields from what a session produced. Every value
// comes from the session, the case or the run's settings; none is defaulted.

import type { SteeringGrade } from '../../../grading/grade-steering-marker.ts';
import { armHit } from '../../../grading/grade-steering-marker.ts';
import type { Localisation, RungObservation } from '../../../grading/localise-rung.ts';
import { observableTable } from '../../../grading/localise-rung.ts';
import type { HostProfile } from '../../../session/host-profile.ts';
import { modelFamilyOf, profileOf } from '../../../session/host-profile.ts';
import type { InitFacts, ResultFacts } from '../../../session/session-stream.ts';
import type { CohortSources } from './session-record.types.ts';

/** Per tested carrier, whether its steering marker is in the final file, keyed by the carrier's address. */
export function carrierHitsOf(addresses: readonly string[], grades: readonly SteeringGrade[]): Record<string, boolean> {
  return Object.fromEntries(addresses.map((address, index) => [address, grades[index]?.present ?? false]));
}

function placedOf(grades: readonly SteeringGrade[]): boolean | string {
  if (grades.some((grade) => grade.placed === null)) return 'no-section';
  return grades.every((grade) => grade.placed === true);
}

const sum = (grades: readonly SteeringGrade[], pick: (grade: SteeringGrade) => number): number =>
  grades.reduce((total, grade) => total + pick(grade), 0);

export function localisedText(localised: Localisation): string {
  if (localised.kind === 'rung') return String(localised.rung);
  return localised.kind === 'clean' ? 'clean' : 'cannot localise';
}

/**
 * What the stream cannot say about the Host harness, from its profile and the run's settings: how far the run is
 * isolated and by what, what leaked in when nothing isolates it, what the permission flags allowed, whether a turn
 * cap exists, and the wall-clock bound, which is the only limit on a session of a Host harness with no turn cap.
 * Isolation, the leaked surface and the permission scope follow the probe record the run was started with.
 */
function hostFacts(profile: HostProfile, settings: CohortSources['settings']): Record<string, unknown> {
  return {
    isolation: profile.isolation,
    leakedSurface: profile.leakedSurface,
    permissionScope: profile.permissionScope,
    turnCap: profile.turnCap === 'enforced' ? String(settings.host.maxTurns) : 'none',
    wallClockMs: settings.host.wallClockMs,
  };
}

function run(sources: CohortSources): Record<string, unknown> {
  const { settings, cell, vars } = sources;
  return {
    runId: settings.runId,
    trialIndex: sources.trialIndex,
    caseId: vars.caseId,
    arm: cell.arm,
    deliveryChannel: cell.deliveryChannel,
    shell: cell.shell,
    encoding: cell.encoding,
    providerId: sources.providerId,
    seed: settings.seed,
    hostName: cell.hostName,
    ...hostFacts(profileOf(cell.hostName, settings.host.probes), settings),
    requestedModel: cell.model,
    evalToolVersion: settings.toolVersion,
    wrapperRevision: settings.wrapperRevision,
    wrapperDirty: settings.wrapperDirty,
    nodeVersion: sources.timing.nodeVersion,
    canary: 'passed',
  };
}

function initFields(init: InitFacts | undefined): Record<string, unknown> {
  if (init === undefined) return {};
  return {
    hostVersion: init.version,
    permissionMode: init.permissionMode,
    authSource: init.apiKeySource,
    sessionId: init.sessionId,
    toolCount: init.toolCount,
    skillCount: init.skills.length,
    serverCount: init.mcpServers.length,
    pluginCount: init.plugins.length,
  };
}

function resultFields(result: ResultFacts | undefined, init: InitFacts | undefined): Record<string, unknown> {
  if (result === undefined) return {};
  const resolved = result.modelsUsed[0] ?? init?.model;
  return {
    resolvedModel: resolved,
    modelFamily: resolved === undefined ? undefined : modelFamilyOf(resolved),
    turnCount: result.numTurns,
    errorFlag: result.isError,
    terminalReason: result.terminalReason,
  };
}

/** The fields this Host harness's init event cannot supply, written as `unknown`, the one value the builder allows them. */
function unobservedFields(profile: HostProfile): Record<string, unknown> {
  return Object.fromEntries(profile.unobservable.map((field) => [field, 'unknown']));
}

function session(sources: CohortSources): Record<string, unknown> {
  const { init, result } = sources.parsed;
  const when = { startedAt: new Date(sources.timing.startedAtMs).toISOString(), durationMs: sources.timing.durationMs };
  const unobserved = unobservedFields(profileOf(sources.cell.hostName, sources.settings.host.probes));
  return { ...initFields(init), ...resultFields(result, init), ...when, ...unobserved };
}

function steeringFields(sources: CohortSources): Record<string, unknown> {
  const { grades, addresses, observation, cell } = sources;
  const hits = carrierHitsOf(addresses, grades);
  return {
    steeringMarkerPresent: armHit(cell.arm, grades),
    steeringMarkerPlaced: placedOf(grades),
    steeringMarkerCount: sum(grades, (grade) => grade.count),
    steeringMarkerFenceCount: sum(grades, (grade) => grade.fenceCount),
    steeringMarkerFrontmatterCount: sum(grades, (grade) => grade.frontmatterCount),
    firstWriteHasSteeringMarker: observation.firstWriteHasSteeringMarker,
    unionHasSteeringMarker: observation.unionHasSteeringMarker,
    finalHasSteeringMarker: observation.finalHasSteeringMarker,
    carrierCount: grades.length,
    carriersPresent: observation.steeringMarkersInFinal,
    carrierProfile: Object.entries(hits)
      .map(([address, hit]) => `${address}=${hit ? 'hit' : 'miss'}`)
      .join('; '),
  };
}

function surfaceFields(sources: CohortSources): Record<string, unknown> {
  const { observation } = sources;
  return {
    creatingTool: observation.creatingTool ?? 'none',
    shellCreated: observation.shellCreated,
    queryAsked: observation.queryAsked,
  };
}

function measured(sources: CohortSources): Record<string, unknown> {
  const { digests, observation } = sources;
  const observations: readonly RungObservation[] = observation.observations;
  return {
    mhDigest: digests.mh,
    skillScriptsDigest: digests.skills,
    mintedRootDigest: digests.root,
    derivedConfigDigest: digests.config,
    charactersDelivered: sources.charactersDelivered,
    observations: observableTable(observations).join('; '),
    localisedRung: localisedText(sources.localised),
    ...steeringFields(sources),
    ...surfaceFields(sources),
  };
}

export function cohortFields(sources: CohortSources): Record<string, unknown> {
  return { ...run(sources), ...session(sources), ...measured(sources) };
}
