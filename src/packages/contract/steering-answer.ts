/**
 * The steering answer — what the config asks of a PATH, before anything is
 * written there.
 *
 * `git check-attr` semantics, which the research names as the prior art twice:
 * the entire input is a path string and the config, so a path that does not
 * exist and one that does are answered identically. That is the whole point. An
 * agent about to author a file cannot be asked to write it first and be told
 * afterwards.
 *
 * Like every report here, THE DATA CARRIES NO PROSE OF OURS — and this is the
 * payload where that costs the most and is most worth paying. The obvious
 * design bundles a rendered `steering:` string beside the structured half, so a
 * confused consumer always has sentences to fall back on. That string would be
 * a prose layer duplicating free text the Operator can rewrite at will, which is
 * exactly the layer the report format deleted, and it would also destroy the
 * experiment: with sentences available, nothing measures whether the config's
 * own key names carry an agent on their own.
 *
 * So `requires` re-exposes the config's own vocabulary VERBATIM, down to which
 * keys the Operator did and did not write, and the rendering — including the
 * frontmatter skeleton — is derived by `render()` from this object, never
 * stored in it. Two channels, one artifact, no wording to keep in step.
 */

import type { Glob, UnknownKeys } from './config.ts';
import type { FieldAddress, FieldConstraints } from './constraints.ts';
import type { RepoPath } from './corpus.ts';
import type { RuleRef } from './values.ts';

export interface SteeringAnswer {
  report: 'steering';
  /** The report format version. A reader that does not know this number must not guess. */
  format: 1;
  /** The path asked about, normalised — `/`-separated, no leading `./` or `/`. */
  path: RepoPath;
  /**
   * The rule that governs this path, or `null`.
   *
   * `null` is not "no constraints". It is INVISIBLE (tenet 6): nothing will
   * ever be reported about a file at this path, by any rule, and that is the
   * single most surprising thing the harness can do. `excluded` below is
   * usually why.
   */
  governs: Governance | null;
  /**
   * Rules that also select this path and are SILENT, because one above them won.
   *
   * The stated cost of tenet 5, made visible for one path. Named only — their
   * constraints are deliberately absent, because nothing merges and listing
   * them would read as though something did.
   */
  shadowed: readonly RuleRef[];
  /** Rules that select this path but whose own `excludeFiles` removed it before they could win. */
  excluded: readonly ExcludedRule[];
}

/** A rule and what it asks of this path. */
export interface Governance {
  rule: RuleRef;
  requires: Requirement;
}

/**
 * A rule that would have selected this path, and the exclusion that stopped it.
 *
 * `excludedBy` is the reason `excluded` is not just a list of rules: the
 * actionable fact is WHICH glob fired, because that is the line the Operator
 * deletes. Every matching glob, not the first — if two match, deleting one
 * changes nothing, and "first" would be arbitrary.
 */
export interface ExcludedRule {
  rule: RuleRef;
  /** The globs from this rule's own `excludeFiles` that matched, verbatim. */
  excludedBy: readonly Glob[];
}

/**
 * What the winning rule requires — its payload, in the config's own words.
 *
 * Discriminated on `frontmatter` exactly as the config's own `RulePayload` is:
 * either the rule forbids frontmatter outright, or it constrains it, never
 * both.
 */
export type Requirement = NoFrontmatterRequirement | ConstrainingRequirement;

/** The rule declares its paths frontmatter-free. There is nothing else to say. */
export interface NoFrontmatterRequirement {
  frontmatter: 'forbidden';
  fields?: never;
  unknownKeys?: never;
  exactlyOneOf?: never;
  anyOf?: never;
  allOf?: never;
}

/**
 * The rule constrains the frontmatter it selects.
 *
 * Every optional key is present here IF AND ONLY IF the Operator wrote it. That
 * is deliberate and it is the sharp end of the verbatim principle: the config
 * language defaults an absent `unknownKeys` to `allowed`, but `allowed` is the
 * LANGUAGE's word and not the Operator's, and an answer that writes it has put a
 * word in their mouth. The plan wanted a fourth `presence` state — `unstated` —
 * for the same absence, and it goes for the same reason: nobody typed it.
 *
 * The cost is real and is the experiment: an agent reading this has to know the
 * language's defaults, or ask. If it cannot, that is goal 1's answer arriving,
 * and the fix is in the config language rather than in a layer over it.
 */
export interface ConstrainingRequirement {
  frontmatter?: never;
  /**
   * One entry per address the rule names, SORTED BY ADDRESS.
   *
   * A list rather than the config's mapping, for the reason a file's violations
   * are sorted by address too: design-ADR 0001 records that the config language
   * does not constrain key order, quoting YAML 1.2.2 that mapping key order is
   * "a serialization detail" that "should not be used". An answer whose field
   * order came from the config's mapping would depend on exactly that.
   */
  fields: readonly FieldRequirement[];
  unknownKeys?: UnknownKeys;
  exactlyOneOf?: readonly FieldAddress[];
  anyOf?: readonly FieldAddress[];
  allOf?: readonly FieldAddress[];
}

/**
 * One address, and everything the rule asks of it.
 *
 * The address stays in its own key rather than being flattened in beside
 * `presence` and `allowed`. Flat, `field` would be a sibling of every constraint
 * key the language has and every one it gains — the same argument that put
 * `fields:` under a container in the config itself.
 */
export interface FieldRequirement {
  field: FieldAddress;
  /** The Operator's constraints for this address, verbatim, including its own `intent`. */
  constraints: FieldConstraints;
}
