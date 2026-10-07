import type { ArmKind } from '../../../session/observe-session.ts';

/** Provider options for one cell: Host harness, model, arm and delivery channel are fields, never defaults. */
export interface CellConfig {
  readonly arm: ArmKind;
  readonly deliveryChannel: 'push' | 'user-turn';
  readonly model: string;
  readonly hostName: 'claude-code';
}

/** The test-case variables a case file supplies. */
export interface CaseVars {
  readonly caseId: string;
  /** The Contributor-voiced task, phrased as a person would ask. */
  readonly task: string;
  readonly targetPath: string;
  readonly seedDir: string;
  readonly placeholder: string;
  readonly clauseTemplate: string;
  readonly controlPrefix: string;
  readonly scopeLevel: number;
  readonly scopeTitlePattern: string;
}

/** What the wrapper tells the provider through the environment. */
export interface RunSettings {
  readonly checkout: string;
  readonly runId: string;
  readonly runDir: string;
  readonly seed: string;
  readonly toolVersion: string;
  readonly wrapperRevision: string;
  readonly wrapperDirty: string;
  readonly host: {
    readonly command: readonly string[];
    readonly maxTurns: number;
    readonly wallClockMs: number;
    readonly tools: readonly string[];
  };
}

export interface TaskParts {
  readonly arm: CellConfig['arm'];
  readonly task: string;
  readonly controlPrefix: string;
  readonly clause: string;
}
