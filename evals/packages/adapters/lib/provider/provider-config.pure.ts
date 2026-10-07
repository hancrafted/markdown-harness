// Reading the provider's inputs. Nothing defaults: a missing field names itself
// and fails the call as an instrument failure rather than becoming a guess.

import type { ArmName } from '../../../arms/derive-arms.ts';
import type { InitExpectation } from '../../../session/classify-session.ts';
import type { DeliverySurface } from '../../../session/delivery-surface.ts';
import { grantsShellWrites, incoherentSurface, isDeliveryChannel } from '../../../session/delivery-surface.ts';
import { driverOf } from '../../../session/host-driver.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { HOST_NAMES, isHostName, profileOf } from '../../../session/host-profile.ts';
import type { ArmKind } from '../../../session/observe-session.ts';
import type { CaseVars, CellConfig, RunSettings, TaskParts } from './provider-config.types.ts';

type Bag = Readonly<Record<string, unknown>>;

function need(bag: Bag, names: readonly string[], where: string): string[] {
  return names.filter((name) => bag[name] === undefined || bag[name] === '').map((name) => `${where}.${name}`);
}

function cellHostProblem(bag: Bag): string[] {
  return isHostName(bag.hostName)
    ? []
    : [`config.hostName (${String(bag.hostName)} is not one of ${HOST_NAMES.join(', ')})`];
}

function cellSurfaceProblem(bag: Bag): string[] {
  if (!isDeliveryChannel(bag.deliveryChannel))
    return [`config.deliveryChannel (${String(bag.deliveryChannel)} is not push, pull or user-turn)`];
  const problem = incoherentSurface(surfaceOf(bag as unknown as CellConfig));
  return problem === undefined ? [] : [`config.shell or config.encoding (${problem})`];
}

/** The three fields that say which surface a cell measures. */
export function surfaceOf(cell: CellConfig): DeliverySurface {
  return { channel: cell.deliveryChannel, shell: cell.shell, encoding: cell.encoding };
}

export function readCellConfig(config: unknown): CellConfig | string[] {
  const bag = (config ?? {}) as Bag;
  const missing = need(bag, ['arm', 'deliveryChannel', 'shell', 'encoding', 'model', 'hostName'], 'config');
  if (missing.length > 0) return missing;
  const problems = [...cellHostProblem(bag), ...cellSurfaceProblem(bag)];
  return problems.length > 0 ? problems : (bag as unknown as CellConfig);
}

/** A cell is named by what distinguishes it: its channel, the shell when widened, the pull encoding, and its arm. */
export function cellLabelOf(cell: CellConfig): string {
  const shell = grantsShellWrites(cell.shell) ? 'shell' : undefined;
  const encoding = cell.deliveryChannel === 'pull' ? cell.encoding : undefined;
  const host = profileOf(cell.hostName, {}).labelPrefix || undefined;
  return [host, cell.deliveryChannel, shell, encoding, cell.arm].filter((part) => part !== undefined).join('-');
}

function carrierProblems(carriers: unknown): string[] {
  if (!Array.isArray(carriers) || carriers.length === 0) return ['vars.carriers'];
  return carriers.flatMap((carrier: Bag, index) =>
    need(carrier ?? {}, ['placeholder', 'clauseTemplate', 'scope'], `vars.carriers[${index}]`),
  );
}

export function readCaseVars(vars: unknown): CaseVars | string[] {
  const bag = (vars ?? {}) as Bag;
  const missing = [
    ...need(bag, ['caseId', 'targetPath', 'seedDir', 'controlPrefix', 'pullLine'], 'vars'),
    ...carrierProblems(bag.carriers),
  ];
  return missing.length > 0 ? missing : (bag as unknown as CaseVars);
}

export function readRunSettings(env: Readonly<Record<string, string | undefined>>): RunSettings | string[] {
  const names = [
    'EVALS_CHECKOUT',
    'EVALS_RUN_ID',
    'EVALS_RUN_DIR',
    'EVALS_SEED',
    'EVALS_TOOL_VERSION',
    'EVALS_WRAPPER_REVISION',
    'EVALS_WRAPPER_DIRTY',
    'EVALS_HOST',
  ];
  const missing = names.filter((name) => env[name] === undefined || env[name] === '').map((name) => `env.${name}`);
  if (missing.length > 0) return missing;
  return {
    checkout: env.EVALS_CHECKOUT as string,
    runId: env.EVALS_RUN_ID as string,
    runDir: env.EVALS_RUN_DIR as string,
    seed: env.EVALS_SEED as string,
    toolVersion: env.EVALS_TOOL_VERSION as string,
    wrapperRevision: env.EVALS_WRAPPER_REVISION as string,
    wrapperDirty: env.EVALS_WRAPPER_DIRTY as string,
    host: JSON.parse(env.EVALS_HOST as string) as RunSettings['host'],
  };
}

/** The clause an arm is told: the steered arm through the config, the control arm through the user turn. */
export function fillClause(template: string, steeringMarker: string): string {
  return template.split('{steeringMarker}').join(steeringMarker);
}

/** The task as the arm's user turn carries it: the control arm prepends the case's declared prefix. */
export function taskFor(parts: TaskParts): string {
  if (parts.arm !== 'control') return parts.task;
  return `${parts.controlPrefix.split('{clause}').join(parts.clause)} ${parts.task}`;
}

/**
 * The config an arm's root is minted with. The control arm has no hook and carries its clause in the user
 * turn, so its config is the intent-neutralised one. The switch is exhaustive: a fourth arm fails the type check.
 */
export function derivationArmFor(arm: ArmKind): ArmName {
  switch (arm) {
    case 'steered':
      return 'steered';
    case 'neutralised':
    case 'control':
      return 'neutralised';
  }
}

/**
 * What the init event must show for a cell to count, asked of the Host harness's driver: the profile, derived from
 * the probe record the run started with, says which permission mode an Antigravity init must report.
 */
export function expectationFor(cell: CellConfig, probes: ProbeRecord): InitExpectation {
  return driverOf(cell.hostName).initExpectation(cell.model, profileOf(cell.hostName, probes));
}
