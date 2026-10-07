// Assembling one cohort row's fields from what a session produced. Every value
// comes from the session, the case or the run's settings; none is defaulted.

import type { SteeringGrade } from '../../../grading/grade-steering-marker.ts';
import type { Localisation, RungObservation } from '../../../grading/localise-rung.ts';
import { observableTable } from '../../../grading/localise-rung.ts';
import type { InitFacts, ResultFacts } from '../../../session/session-stream.ts';
import type { CohortSources } from './session-record.types.ts';

/** The hit as the summary counts it: every steering marker present, or in the intent-neutralised arm any one (a leak). */
export function hitOf(arm: string, grades: readonly SteeringGrade[]): boolean {
  return arm === 'neutralised' ? grades.some((grade) => grade.present) : grades.every((grade) => grade.present);
}

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
    skillCount: init.skills.length,
    serverCount: init.mcpServers.length,
    pluginCount: init.plugins.length,
  };
}

function resultFields(result: ResultFacts | undefined, init: InitFacts | undefined): Record<string, unknown> {
  if (result === undefined) return {};
  return {
    resolvedModel: result.modelsUsed[0] ?? init?.model,
    turnCount: result.numTurns,
    errorFlag: result.isError,
    terminalReason: result.terminalReason,
  };
}

function session(sources: CohortSources): Record<string, unknown> {
  const { init, result } = sources.parsed;
  const when = { startedAt: new Date(sources.timing.startedAtMs).toISOString(), durationMs: sources.timing.durationMs };
  return { ...initFields(init), ...resultFields(result, init), ...when };
}

function steeringFields(sources: CohortSources): Record<string, unknown> {
  const { grades, addresses, observation, cell } = sources;
  const hits = carrierHitsOf(addresses, grades);
  return {
    steeringMarkerPresent: hitOf(cell.arm, grades),
    steeringMarkerPlaced: placedOf(grades),
    steeringMarkerCount: sum(grades, (grade) => grade.count),
    steeringMarkerFenceCount: sum(grades, (grade) => grade.fenceCount),
    steeringMarkerFrontmatterCount: sum(grades, (grade) => grade.frontmatterCount),
    firstWriteHasSteeringMarker: observation.firstWriteHasSteeringMarker,
    unionHasSteeringMarker: observation.unionHasSteeringMarker,
    finalHasSteeringMarker: observation.finalHasSteeringMarker,
    carrierCount: grades.length,
    carriersPresent: observation.markersInFinal,
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
