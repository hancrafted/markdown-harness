/**
 * The seams inside `--check`.
 */

import type { CheckResult } from '../../../response-contract/index.ts';
import type { FrontmatterRule } from '../../section.types.ts';

/** A YAML mapping, before any key of it has been read. */
export type FrontmatterMapping = Record<string, unknown>;

/**
 * How far a file's frontmatter got.
 */
export type FrontmatterData =
  { kind: 'absent' } | { kind: 'unparseable' } | { kind: 'mapping'; data: FrontmatterMapping };

/** One concrete address, and what the file has at it. */
export interface AddressSite {
  field: string;
  present: boolean;
  value: unknown;
}

/**
 * Every concrete address one written address reaches.
 */
export type AddressResolution =
  { kind: 'vacuous' } | { kind: 'shape-mismatch' } | { kind: 'sites'; sites: readonly AddressSite[] };

/** One corpus file, paired with the rule that won it under first-match. */
export interface GovernedFile {
  path: string;
  rule: FrontmatterRule;
}

/** A governed file with its bytes read, ready for a verdict. */
export interface GovernedSource {
  path: string;
  rule: FrontmatterRule;
  text: string;
}

/**
 * The first governed path that would not open, exactly as the read addressed it.
 */
export interface UnreadableGovernedFile {
  kind: 'unreadable';
  path: string;
}

/**
 * The outcome of opening every governed file.
 */
export type GovernedRead = { kind: 'read'; sources: readonly GovernedSource[] } | UnreadableGovernedFile;

/**
 * The outcome of checking one corpus.
 */
export type CorpusCheck = { kind: 'checked'; result: CheckResult } | UnreadableGovernedFile;
