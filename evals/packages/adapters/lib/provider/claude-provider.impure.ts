// The eval tool's provider: a class with an identity method and an asynchronous
// call method, loaded by a path string. It defers to the session module and holds
// nothing of its own but the cell's label and options.

import { environment } from '../../../platform/host-ambient.ts';
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

let counter = 0;

/** A cell is named by what distinguishes it: its delivery channel and arm. */
function cellLabel(config: unknown): string | undefined {
  const bag = (config ?? {}) as { arm?: string; deliveryChannel?: string };
  return bag.arm === undefined || bag.deliveryChannel === undefined ? undefined : `${bag.deliveryChannel}-${bag.arm}`;
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
    const trialIndex = counter;
    counter += 1;
    return runSteeringSession({
      cellLabel: this.label,
      config: this.config,
      vars: context?.vars,
      env: environment(),
      trialIndex,
    });
  }
}
