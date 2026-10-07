import type { ProbeArgs } from '../args/probe-args.types.ts';

export interface ProbeGateInput {
  readonly args: ProbeArgs;
  /** The text stating which files the credential probe would copy, printed when consent is missing. */
  readonly consentNotice: string;
}
