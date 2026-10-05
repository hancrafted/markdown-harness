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

/**
 * Either some Module claimed the path, or the whole config passed it by.
 *
 * Generic in what a claim's requirements are, because those belong to the
 * Module making the claim. `cli` derives the concrete union from the declared
 * Module set; this Package names no Module and none of their shapes.
 */
export type QueryResult<TRequirements = unknown> = GovernedPath<TRequirements> | InvisiblePath;

/** A path at least one Module claims, and everything each of them asks of it. */
export interface GovernedPath<TRequirements = unknown> {
  /** The discriminant. */
  governance: 'governed';
  /** Normalised: `/`-separated, no leading `./` or `/`. */
  path: string;
  /**
   * One block per claim, in declared Module order. Never empty.
   *
   * A Module whose winning Rule depends on file content contributes one block
   * per candidate Rule, in config order (design-ADR 0011), so one
   * Module may name several blocks here.
   */
  modules: readonly ModuleRequirements<TRequirements>[];
}

/**
 * What one Module asks of one path, before composition names the Module.
 *
 * `TRequirements` is the asking Module's own requirement shape, declared in its
 * Package. A claim is generic over it rather than a union of every Module's,
 * which is what keeps this contract free of Module names.
 */
export interface ModuleClaim<TRequirements = unknown> {
  /**
   * The rule that won under first-match, and its intent verbatim (§3.4) — or,
   * for a Module whose winner depends on file content, one candidate Rule.
   */
  rule: { ruleId: string; intent: string };
  /** Everything that rule asks of this path, in the asking Module's own shape. */
  requirements: TRequirements;
}

/** One Module's claim on the path, named by the Module making it. */
export interface ModuleRequirements<TRequirements = unknown> extends ModuleClaim<TRequirements> {
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
