/**
 * What a `frontmatter` Rule asks of a path, as `query` answers it.
 *
 * This Module's own requirement shape (ARCH-008). The response contract holds
 * a claim generic over its requirements, and `cli` unions this shape with every
 * other declared Module's — so the shape lives here, beside the Rule it
 * projects, and nothing outside this Package has to know it.
 */

import type { FieldConstraints } from '../section/constraints.types.ts';

/** Either the rule forbids frontmatter outright, or it constrains it. */
export type FrontmatterRequirements = NoFrontmatterRequirements | ConstrainingRequirements;

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
