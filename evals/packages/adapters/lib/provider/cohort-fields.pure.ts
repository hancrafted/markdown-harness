// Assembling one cohort row's fields from what a session produced. Every value
// comes from the session, the case or the run's settings; none is defaulted.

import type { Localisation, RungObservation } from '../../../grading/localise-rung.ts';
import { observableTable } from '../../../grading/localise-rung.ts';
import type { InitFacts, ResultFacts } from '../../../session/session-stream.ts';
import type { CohortSources } from './session-record.types.ts';

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

function measured(sources: CohortSources): Record<string, unknown> {
  const { digests, grade, observation } = sources;
  const observations: readonly RungObservation[] = observation.observations;
  return {
    mhDigest: digests.mh,
    skillScriptsDigest: digests.skills,
    mintedRootDigest: digests.root,
    derivedConfigDigest: digests.config,
    charactersDelivered: sources.charactersDelivered,
    observations: observableTable(observations).join('; '),
    localisedRung: localisedText(sources.localised),
    steeringMarkerPresent: grade.present,
    steeringMarkerPlaced: grade.placed === null ? 'no-section' : grade.placed,
    steeringMarkerCount: grade.count,
    steeringMarkerFenceCount: grade.fenceCount,
    steeringMarkerFrontmatterCount: grade.frontmatterCount,
    firstWriteHasSteeringMarker: observation.firstWriteHasSteeringMarker,
    unionHasSteeringMarker: observation.unionHasSteeringMarker,
    finalHasSteeringMarker: observation.finalHasSteeringMarker,
  };
}

export function cohortFields(sources: CohortSources): Record<string, unknown> {
  return { ...run(sources), ...session(sources), ...measured(sources) };
}
