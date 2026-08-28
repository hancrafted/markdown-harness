/**
 * `--query`: what the config asks of a PATH, before anything is written there.
 *
 * `git check-attr` semantics, which the research names as the prior art twice:
 * the entire input is a path string and the config, so a path that does not
 * exist and one that does are answered identically. That is the whole point. An
 * agent about to author a file cannot be asked to write it first and be told
 * afterwards.
 *
 * Like every result here, THE DATA CARRIES NO PROSE OF OURS — and this is the
 * payload where that costs the most and is most worth paying. The obvious design
 * bundles a rendered `steering:` string beside the structured half, so a confused
 * consumer always has sentences to fall back on. That string would be a prose
 * layer duplicating free text the Operator can rewrite at will, and it would also
 * destroy the experiment: with sentences available, nothing measures whether the
 * config's own key names carry an agent on their own. That is the experiment this
 * payload exists to run.
 *
 * So `requirements` re-exposes the config's own vocabulary VERBATIM, down to
 * which keys the Operator did and did not write.
 *
 * IT ANSWERS ONE QUESTION: what must be written at this path. Everything that
 * answered a DIFFERENT question has been taken out, and each was Operator
 * content riding on a payload whose reader is the Contributor's agent — the
 * rules that also selected this path and lost, the rule whose `excludeFiles`
 * removed it, and the kind of thing the path was. All of them answer "why isn't
 * my rule applying?", which is the Operator's question, and `--coverage` is
 * where it is answered properly: keyed by `ruleId`, across every rule at once,
 * distinguishing shadowed from excluded from never-matched.
 *
 * There is one output channel and it is JSON. A frontmatter skeleton — the thing
 * the plan calls the highest-leverage part of the product — would be DERIVED
 * from this object by whoever wants one, and stored back into it never, so that
 * no wording of ours has to be kept in step with the data.
 */

import type { UnknownKeys } from './config.ts';
import type { FieldAddress, FieldConstraints } from './constraints.ts';
import type { RepoPath } from './corpus.ts';

export type QueryResult = GovernedQuery | InvisibleQuery;

export interface GovernedQuery {
  governance: 'governed';
  /** The path asked about, normalised — `/`-separated, no leading `./` or `/`. */
  path: RepoPath;
  rule: { ruleId: string; intent: string };
  requirements: Requirements;
}

/**
 * Nothing will ever be reported about a file at this path, by any rule.
 *
 * A NAMED STATE rather than a null rule, and the rename is the whole of the
 * improvement: `governedBy: null` asked every reader to work out that null does
 * not mean "no constraints". It means INVISIBLE (tenet 6), which is the single
 * most surprising thing `markdown-harness` can do, and a payload that says so is
 * better than a payload that has to be interpreted.
 */
export interface InvisibleQuery {
  governance: 'invisible';
  path: RepoPath;
}

/**
 * What the winning rule requires — its payload, in the config's own words.
 *
 * Discriminated on `frontmatter` exactly as the config's own `RulePayload` is:
 * either the rule forbids frontmatter outright, or it constrains it, never both.
 */
export type Requirements = NoFrontmatterRequirements | ConstrainingRequirements;

/** The rule declares its paths frontmatter-free. There is nothing else to say. */
export interface NoFrontmatterRequirements {
  frontmatter: 'forbidden';
  fields?: never;
  unknownKeys?: never;
  crossField?: never;
}

/**
 * The rule constrains the frontmatter it selects.
 *
 * Every key that travels VERBATIM is present here if and only if the Operator
 * wrote it. That is the sharp end of the verbatim principle: the config language
 * defaults an absent `unknownKeys` to `allowed`, but `allowed` is the LANGUAGE's
 * word and not the Operator's, and an answer that writes it has put a word in
 * their mouth. The plan wanted a fourth `presence` state — `unstated` — for the
 * same absence, and it goes for the same reason: nobody typed it.
 *
 * `fields` is the exception and is always present, `[]` when the rule names no
 * address. It is not one of the Operator's values travelling through: it is a
 * list WE build, sorted and restructured, out of fragments that are theirs. One
 * shape wins for what we compute, verbatim wins for what we quote.
 *
 * The cost is real and is the experiment: an agent reading this has to know the
 * language's defaults, or ask. If it cannot, that is goal 1's answer arriving,
 * and the fix is in the config language rather than in a layer over it.
 */
export interface ConstrainingRequirements {
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
  /** The three constraints that name a SET of addresses, grouped so they read as one concern. */
  crossField?: CrossFieldRequirements;
}

/**
 * One address, and everything the rule asks of it — FLAT.
 *
 * The constraints sit beside `field` rather than under a `constraints` key. The
 * nested form was defensible as "the address is not one of the constraints", and
 * flat won because the reader is an agent assembling one field at a time: it
 * wants the address and the demands in one object, not a wrapper to open first.
 * `FieldConstraints` is spread in whole, so every key the config language has —
 * including the five it accepted for months without checking — arrives without
 * this type having to list them.
 */
export type FieldRequirement = { field: FieldAddress } & FieldConstraints;

export interface CrossFieldRequirements {
  exactlyOneOf?: readonly FieldAddress[];
  anyOf?: readonly FieldAddress[];
  allOf?: readonly FieldAddress[];
}
