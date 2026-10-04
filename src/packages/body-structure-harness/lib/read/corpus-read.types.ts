/**
 * What reading a set of corpus files hands back: every file's bytes, or the
 * first file that would not open.
 */

import type { ModuleAudit, ModuleCheck } from '../../../response-contract/index.ts';

/** One corpus file and its full contents. */
export interface CorpusSource {
  /** Root-relative, `/`-separated, no leading `./` or `/`. */
  path: string;
  /** The file's full contents. */
  text: string;
}

/** A file this Module had to open and could not, which the caller answers with exit 2. */
export interface UnreadableCorpusFile {
  readonly kind: 'unreadable';
  /** The path the read was attempted at — the corpus root as written, joined to the file's own. */
  readonly path: string;
}

/** Every requested file with its bytes, or the first refusal. */
export type CorpusRead = { kind: 'read'; sources: readonly CorpusSource[] } | UnreadableCorpusFile;

/** What `check` answers: this Module's half of the report, or the file it could not read. */
export type CorpusCheck = { kind: 'checked'; result: ModuleCheck } | UnreadableCorpusFile;

/** What `audit` answers: this Module's tallies, or the file it could not read to learn a `type`. */
export type CorpusAudit = ModuleAudit | UnreadableCorpusFile;
