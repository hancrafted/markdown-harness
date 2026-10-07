// The eval tool's provider: a class with an identity method and an asynchronous
// call method, loaded by a path string. It defers to the session module and holds
// nothing of its own but the cell's label and options.

import { environment } from '../../../platform/host-ambient.ts';
import { cellLabelOf, readCellConfig } from './provider-config.pure.ts';
import type { SessionReturn } from './session-record.types.ts';
import { runSteeringSession } from './steering-session.impure.ts';

interface ProviderOptions {
  readonly id?: string;
  readonly label?: string;
  readonly config?: unknown;
}

interface CallContext {
  readonly vars?: unknown;
}

// Module-level, so every provider instance the eval tool builds in this process draws from one sequence.
// The self-test run shows trial indices 0 to 5 across three cells, none repeated. The eval tool is held to one
// process by the wrapper's concurrency of one; a second worker would load the module afresh and count from zero
// again, so the trial index orders trials within a process and never identifies one: the session key carries a
// random suffix for that.
let nextTrialIndex = 0;

function cellLabel(config: unknown): string | undefined {
  const cell = readCellConfig(config);
  return Array.isArray(cell) ? undefined : cellLabelOf(cell);
}

export default class ClaudeCodeProvider {
  private readonly label: string;
  private readonly config: unknown;

  constructor(options: ProviderOptions = {}) {
    this.config = options.config;
    this.label = cellLabel(options.config) ?? options.label ?? options.id ?? 'unlabelled';
  }

  id(): string {
    return this.label;
  }

  async callApi(_prompt: string, context?: CallContext): Promise<SessionReturn> {
    const trialIndex = nextTrialIndex;
    nextTrialIndex += 1;
    return runSteeringSession({
      cellLabel: this.label,
      config: this.config,
      vars: context?.vars,
      env: environment(),
      trialIndex,
    });
  }
}
