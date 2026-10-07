/** One normalised transcript event. An event class the Host harness did not emit is absent, never a placeholder. */
export type SessionEvent =
  | { readonly seq: number; readonly kind: 'init' }
  | {
      readonly seq: number;
      readonly kind: 'tool-call';
      readonly id: string;
      readonly tool: string;
      readonly input: Record<string, unknown>;
    }
  | {
      readonly seq: number;
      readonly kind: 'tool-result';
      readonly id: string;
      readonly isError: boolean;
      readonly text: string;
    }
  | { readonly seq: number; readonly kind: 'hook-start'; readonly hookName: string }
  | { readonly seq: number; readonly kind: 'hook-response'; readonly hookName: string; readonly output: string }
  | { readonly seq: number; readonly kind: 'assistant-text'; readonly text: string }
  | { readonly seq: number; readonly kind: 'result'; readonly text: string }
  | { readonly seq: number; readonly kind: 'error'; readonly text: string };

/** A normalised event before the assembler stamps its sequence number. */
export type StreamDraft = SessionEvent extends infer E ? (E extends { seq: number } ? Omit<E, 'seq'> : never) : never;

/** The facts the init event carries that the isolation assertions read. */
export interface InitFacts {
  readonly apiKeySource: string;
  readonly model: string;
  readonly version: string;
  readonly permissionMode: string;
  readonly sessionId: string;
  /** How many tools the init event lists; for a Host harness with no isolation flag it measures what leaked in. */
  readonly toolCount: number;
  readonly skills: readonly string[];
  readonly mcpServers: readonly string[];
  readonly plugins: readonly string[];
}

/** The facts the result event carries that classification reads. */
export interface ResultFacts {
  readonly subtype: string;
  readonly isError: boolean;
  readonly terminalReason: string;
  readonly numTurns: number;
  readonly text: string;
  readonly modelsUsed: readonly string[];
  readonly permissionDenials: number;
}

export interface ParsedSession {
  readonly events: readonly SessionEvent[];
  readonly init: InitFacts | undefined;
  readonly result: ResultFacts | undefined;
  /** Lines that were not JSON objects. */
  readonly unparsedLines: number;
  /** Expected keys missing from the init or result event; any entry is an instrument failure. */
  readonly missingKeys: readonly string[];
  /**
   * A tool event that lacks a key the parser reads from it, each named by tool, step and key. Any entry is an
   * instrument failure: the parser's field names are assumptions until a live stream confirms them, and a renamed
   * key must not read as empty text.
   */
  readonly unexpectedShapes: readonly string[];
}
