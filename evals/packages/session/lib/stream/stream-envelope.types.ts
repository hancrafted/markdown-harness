import type { Json } from './json-values.types.ts';
import type { InitFacts, ResultFacts, StreamDraft } from './session-stream.types.ts';

/** The events of a stream, and the tool events whose expected keys were missing. */
export interface DraftedEvents {
  readonly drafts: readonly StreamDraft[];
  readonly unexpectedShapes: readonly string[];
}

/**
 * What differs between two Host harnesses' newline-delimited streams: which line is the init and which the result,
 * where the keys the parser expects live, and how a parsed line becomes facts and events. The envelope around that
 * (split, parse, find, stamp, count) is the same for both and lives in one assembler.
 */
export interface StreamDialect {
  readonly isInit: (line: Json) => boolean;
  readonly isResult: (line: Json) => boolean;
  /** The object that holds the init keys: the line itself for one Host harness, a member of it for another. */
  readonly initBody: (line: Json) => Json;
  readonly resultBody: (line: Json) => Json;
  readonly initKeys: readonly string[];
  readonly resultKeys: readonly string[];
  /** Keys the init line itself must carry beside its body. */
  readonly initLineKeys: readonly string[];
  readonly initFacts: (line: Json) => InitFacts;
  readonly resultFacts: (line: Json, init: InitFacts | undefined) => ResultFacts;
  readonly drafted: (lines: readonly Json[], init: InitFacts | undefined) => DraftedEvents;
}
