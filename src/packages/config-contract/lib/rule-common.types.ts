/**
 * What EVERY Module's rule carries, whatever it selects and whatever it asserts.
 *
 * Split out of `./config.types` when a second Module arrived, and the reason is
 * mechanical rather than aesthetic: `file-names.types` needs `RuleCommon` and
 * `Glob`, `config.types` needs `FileNamesConfig`, and the two importing each
 * other is a cycle — one `dependency-cruiser` sees, because this repo sets
 * `tsPreCompilationDeps: true` and therefore watches type-only edges too.
 *
 * The split is honest on its own terms. A rule's identity — its name, its
 * reason, the paths it does not govern — is the part of the rule language that
 * belongs to no Module in particular. Each Module then adds its own selector
 * and its own payload.
 */

/** A glob, matched against repo-root-relative paths. */
export type Glob = string;

/** Keys every rule carries, in every Module. */
export interface RuleCommon {
  /**
   * This rule's name, in the config author's own words. MANDATORY, and unique
   * across the list.
   *
   * Reports refer to a rule by id and never by position, so that a rule
   * reordered — which under first-match is an ordinary and expected edit —
   * does not silently repoint every stored answer that named it. An index is
   * the one identifier this language cannot use, because the ordering it would
   * be drawn from is the very thing an author changes.
   *
   * Two rules sharing an id is a config error, and it points at the LATER
   * occurrence: the first one to claim a name is not the mistake.
   *
   * Uniqueness is PER MODULE. Two Modules may each hold a rule called
   * `content-blocks` without colliding, because a report names the Module
   * beside the rule and the two ids are never compared.
   */
  ruleId: string;

  /**
   * Why this rule exists, in the config author's own words. MANDATORY.
   *
   * Appended to every violation this rule reports — never substituted for the
   * harness's own sentence, so an author cannot write prose that hides which
   * constraint fired. A constraint-level `intent` wins over this one for that
   * constraint; this is the fallback.
   */
  intent: string;

  /**
   * Paths this rule does NOT govern, as globs.
   *
   * Per rule, never global — a global exclude list could not express "exempt
   * from *this* rule only", so an excluded file could never pick up a rule of
   * its own. Exclusion always wins within a rule and takes no part in ordering:
   * it answers one yes/no question before any rule is chosen.
   *
   * Invalid without a selector on the same rule. Its only real use under
   * first-match is letting a file fall THROUGH to a later, broader rule without
   * restating that rule's constraints — which is also the mechanism a reserved
   * file name escapes a naming rule through.
   */
  excludeFiles?: Glob[];
}
