/** One finished run of the compiled `mh`: what it printed, and how it exited. */
export interface ToolRun {
  readonly stdout: string;
  readonly stderr: string;
  /** The exit code, or `null` when a signal ended the process. */
  readonly code: number | null;
}

/** One config fault as a response carries it. */
export interface ToolFault {
  readonly code: string;
  readonly location: string;
}

/**
 * Why a run carries no answer: the config-error envelope the tool printed, or
 * `NO_RESPONSE` with the head of stderr when stdout held no JSON at all.
 *
 * Structured rather than a sentence, so a test pinning today's refusal compares
 * every part of it and a diff names the part that moved.
 */
export interface ToolRefusal {
  readonly exit: number | null;
  readonly error: string;
  readonly faults: readonly ToolFault[];
  readonly stderr?: string;
}

/** One Module's block inside a response, as far as any Conformance runner reads it. */
export interface ToolBlock {
  readonly module: string;
  readonly ruleId?: string;
  readonly ruleIntent?: string;
  readonly violations?: readonly unknown[];
  readonly rules?: readonly { readonly rule: { readonly ruleId: string }; readonly won: number }[];
}

/** A response envelope, as far as any Conformance runner reads it. Every key may be absent. */
export interface ToolEnvelope {
  readonly command?: string;
  /** The Modules that ran, in declared Module order. */
  readonly modules?: readonly string[];
  readonly root?: string;
  readonly config?: string;
  readonly result?: {
    readonly error?: string;
    readonly faults?: readonly ToolFault[];
    readonly summary?: {
      readonly governedFiles: number;
      readonly invalidFiles: number;
      readonly totalViolations: number;
    };
    readonly files?: readonly { readonly path: string; readonly modules: readonly ToolBlock[] }[];
    readonly modules?: readonly ToolBlock[];
    readonly governance?: string;
    readonly state?: string;
    readonly agentAction?: string;
  };
}
