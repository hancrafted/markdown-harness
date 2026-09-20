/**
 * What `--query` answers about one path.
 *
 * `git check-attr` semantics: the entire input is a path string and the config.
 * A path that does not exist and one that does are answered identically — an
 * agent about to author a file cannot be asked to write it first and be told
 * afterwards.
 */

import type { FieldConstraints } from '../../config-contract/index.ts';

/** Either at least one module claimed the path, or no module claims it. */
export type QueryResult = GovernedPath | InvisiblePath;

/** Requirements from one Module governing a path. */
export interface ModuleRequirements {
  /** The config key the Operator typed, never the Package name. */
  module: string;
  /** The rule that won under first-match, and its intent verbatim (§3.4). */
  rule: { ruleId: string; intent: string };
  /** Everything the winning rule asks of this path. */
  requirements: Requirements;
}

/** A path at least one Module selects, and everything each Module asks of it. */
export interface GovernedPath {
  /** The discriminant. */
  governance: 'governed';
  /** Normalised: `/`-separated, no leading `./` or `/`. */
  path: string;
  /** Every Module that governs this path, in declared Module order. */
  modules: readonly ModuleRequirements[];
}

/**
 * Nothing will ever be reported about this path, by any Module — no Module claims it.
 */
export interface InvisiblePath {
  /** The discriminant. */
  governance: 'invisible';
  /** Normalised the same way, so the caller can key on what it gets back. */
  path: string;
}

/** Either the rule forbids frontmatter outright, or it constrains it. */
export type Requirements = NoFrontmatterRequirements | ConstrainingRequirements;

/** The answer for a rule that declares its paths frontmatter-free. */
export interface NoFrontmatterRequirements {
  /** The rule declares its paths frontmatter-free; there is nothing else to ask. */
  frontmatter: 'forbidden';
}

/** The answer for a rule that constrains fields. */
export interface ConstrainingRequirements {
  /** Absent by construction — this variant is the one that constrains fields. */
  frontmatter?: never;
  /** One entry per address the rule names, SORTED BY ADDRESS. Always present, `[]` when none. */
  fields: readonly FieldRequirement[];
  /** Present only if the Operator wrote it. Absent is not `'allowed'` spelled differently. */
  unknownKeys?: 'allowed' | 'forbidden';
  /** Present only if the rule carries at least one set constraint. */
  crossField?: {
    /** Exactly one of these addresses must be present. */
    exactlyOneOf?: readonly string[];
    /** At least one of these addresses must be present. */
    anyOf?: readonly string[];
    /** All of these addresses must be present. */
    allOf?: readonly string[];
  };
}

/** One address and everything the rule asks of it — flat, the constraints spread beside `field`. */
export type FieldRequirement = { field: string } & FieldConstraints;
