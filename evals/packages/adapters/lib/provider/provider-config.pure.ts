// Reading the provider's inputs. Nothing defaults: a missing field names itself
// and fails the call as an instrument failure rather than becoming a guess.

import type { CaseVars, CellConfig, RunSettings, TaskParts } from './provider-config.types.ts';

type Bag = Readonly<Record<string, unknown>>;

function need(bag: Bag, names: readonly string[], where: string): string[] {
  return names.filter((name) => bag[name] === undefined || bag[name] === '').map((name) => `${where}.${name}`);
}

export function readCellConfig(config: unknown): CellConfig | string[] {
  const bag = (config ?? {}) as Bag;
  const missing = need(bag, ['arm', 'deliveryChannel', 'model', 'hostName'], 'config');
  return missing.length > 0 ? missing : (bag as unknown as CellConfig);
}

export function readCaseVars(vars: unknown): CaseVars | string[] {
  const bag = (vars ?? {}) as Bag;
  const missing = need(
    bag,
    [
      'caseId',
      'targetPath',
      'seedDir',
      'placeholder',
      'clauseTemplate',
      'controlPrefix',
      'scopeLevel',
      'scopeTitlePattern',
    ],
    'vars',
  );
  return missing.length > 0 ? missing : ({ ...bag, scopeLevel: Number(bag.scopeLevel) } as unknown as CaseVars);
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
