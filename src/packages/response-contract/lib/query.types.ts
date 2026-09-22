/**
 * What `--query` answers about one path, and what one Module contributes to
 * that answer.
 *
 * `git check-attr` semantics: the entire input is a path string and the config.
 * A path that does not exist and one that does are answered identically — an
 * agent about to author a file cannot be asked to write it first and be told
 * afterwards.
 *
 * The answer MIRRORS the checking command: what it asks of the path nests one
 * level down, under the Module asking it. The two commands differ in which
 * Modules appear, deliberately — this one lists every governing Module, because
 * an agent about to write the file needs what each of them will ask for, and a
 * Module with nothing to complain about is exactly the one whose requirements
 * it has not met yet.
 */

import type { FieldConstraints } from '../../config-contract/index.ts';

/** Either some Module claimed the path, or the whole config passed it by. */
export type QueryResult = GovernedPath | InvisiblePath;

/** A path at least one Module claims, and everything each of them asks of it. */
export interface GovernedPath {
  /** The discriminant. */
  governance: 'governed';
  /** Normalised: `/`-separated, no leading `./` or `/`. */
  path: string;
  /** One block per governing Module, in declared Module order. Never empty. */
  modules: readonly ModuleRequirements[];
}

/** What one Module asks of one path, before composition names the Module. */
export interface ModuleClaim {
  /** The rule that won under first-match, and its intent verbatim (§3.4). */
  rule: { ruleId: string; intent: string };
  /** Everything that winning rule asks of this path. */
  requirements: Requirements;
}

/** One Module's claim on the path, named by the Module making it. */
export interface ModuleRequirements extends ModuleClaim {
  /**
   * The top-level config key the Operator typed.
   *
   * The same string the checking command reports, and read the same way — from
   * the Module's descriptor at composition, never written out by the Module.
   */
  module: string;
}

/**
 * Nothing will ever be reported about this path, by any Module — a claim about the whole config,
 * not a null rule. Note what this is *not*: it does not mean a rule excluded the path. It means
 * NO DECLARED MODULE selected it in the first place (a rule's own `excludeFiles`, or a Module
 * whose section the config never wrote, can each be one reason why).
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
