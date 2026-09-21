/**
 * The `frontmatter-harness` Module's own section of the config file.
 *
 * It lives in this Package and no other. A section type parked behind one
 * shared entry point makes "no Module knows another Module exists"
 * unenforceable — the import graph passes blind over exactly the rule that
 * exists to catch a Module reaching into another Module. Owned here, a planted
 * violation is caught. That is measurement rather than tidiness, and it is why
 * these declarations moved out of `config-contract`.
 *
 * What `config-contract` still holds is the vocabulary a section is BUILT from
 * — `Selector`, `FieldAddress`, `FieldConstraints` — plus the port and the
 * fault type. Those are Core's, taken as given, and this Module builds no
 * translation layer over them.
 *
 * Below the root rather than at it: ARCH-004 §2.4 fails a classified file at a
 * Package root, so the declarations sit here and `../../section.ts` re-exports
 * them type-only. That re-export is ARCH-005 §1.3's admitted idiom, and it is
 * the address every Package outside this one would use — except that no Package
 * outside this one may name these types at all (ARCH-008 §1.4).
 *
 * There is no Floor. `type` is an ordinary field, so a repo's vocabulary is the
 * union of `allowed` values across its rules — derivable, no longer declared.
 * What a rule asserts about one field lives in `config-contract`.
 */

import type { FieldAddress, FieldConstraints, Selector } from '../../../config-contract/index.ts';

/**
 * The conditions a file can be assessed against.
 *
 * ONE condition ships. `stale` is the only one that needs a clock, and
 * therefore the only one that needs a command of its own: `unverified`,
 * `unsourced` and `invalid` are all answerable by `--check` today through
 * `presence` and `minItems`, and restating them here would move work out of the
 * tier that already covers it. Any other key under `assess:` is
 * `CONFIG_UNRECOGNISED_KEY`.
 *
 * The value is a FLAT STRING and interpolation is deliberately absent. Every
 * fact an Operator would interpolate — the path, the instant, the field and its
 * value — already travels beside their sentence in the response, so a template
 * would hold one fact twice and two representations of one fact drift. It would
 * also become public portable surface, and an Operator writing `{{path}}` would
 * ship literal braces to their agent with no warning.
 */
export interface AssessConditions {
  /**
   * What to tell an agent that opened a file at or past its `stale_after`.
   *
   * Written to be read by an agent mid-task, so it reads as an instruction
   * rather than a description: the tool never writes prose of its own here, it
   * only carries the Operator's.
   */
  stale: string;
}

/** Everything the `frontmatter-harness` module reads. */
export interface FrontmatterConfig {
  /**
   * What to tell an agent about a file this module governs, for every rule that
   * does not answer for itself.
   *
   * Module-wide rather than top-level, and the distinction is the whole reason
   * this key sits here: assessment reads `stale_after`, a frontmatter field, so
   * a top-level `assess:` would be a section reaching into another Module's
   * data — and once a second Module governs bodies it would need a precedence
   * rule BETWEEN Modules. That is the second precedence dimension this design
   * already refused once, when it ruled out a second config file.
   *
   * The growth rule this key is the first to need: the top level is one key per
   * Module and nothing else, and inside a Module it is `rules:` for what varies
   * by path plus optional Module-wide keys for what does not.
   */
  assess?: AssessConditions;

  /**
   * The ordered rule list. REQUIRED, and a list rather than a mapping: YAML
   * mappings have no guaranteed order, and first-match needs one.
   *
   * For any file the harness walks top-down and the FIRST matching rule is the
   * complete set of constraints that applies. Nothing merges, nothing is
   * inherited. Write the most specific rules first and the broadest last;
   * reversed, a narrow rule silently wins for zero files.
   *
   * An empty list is a config error, not an inert harness.
   */
  rules: FrontmatterRule[];
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * One entry in the ordered rule list.
 *
 * Every rule = a selector + a reason + a payload. One exclusivity rule is
 * modelled here, so that illegal state is unrepresentable rather than merely
 * documented: `frontmatter: forbidden` carries no payload at all.
 *
 * The other rule the validator enforces — at least one selector axis — is
 * deliberately NOT modelled. See `Selector`.
 */
export type FrontmatterRule = RuleCommon & Selector & RulePayload;

/** Keys every rule carries, whatever it selects and whatever it asserts. */
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
   * Files this rule does NOT govern, in the selector vocabulary it includes
   * with.
   *
   * One language rather than two: each entry is the same `Selector` object
   * under the same at-least-one-axis rule, so an author who can write an
   * include can write an exclude without learning a second grammar.
   *
   * Per rule, never global — a global exclude list could not express "exempt
   * from *this* rule only", so an excluded file could never pick up a rule of
   * its own. Exclusion always wins within a rule and takes no part in ordering:
   * it answers one yes/no question before any rule is chosen.
   *
   * Invalid without a selector on the same rule. Its only real use under
   * first-match is letting a file fall THROUGH to a later, broader rule without
   * restating that rule's constraints.
   */
  excludeFiles?: Selector[];
}

/**
 * What a rule asserts. Either it forbids frontmatter outright, or it constrains
 * it — never both.
 */
export type RulePayload = ConstrainingPayload | NoFrontmatterPayload;

/** A rule that constrains the frontmatter of the files it matches. */
export interface ConstrainingPayload {
  frontmatter?: never;

  /**
   * Constraints on individual frontmatter fields, keyed by field address.
   *
   * The container is load-bearing. Flat, these keys would be siblings of
   * `path`, `intent`, `unknownKeys` and every key added later — confiscating
   * those names from every adopter's frontmatter forever. Under a container, a
   * key in the wrong half is a reportable config error instead of a silent
   * no-op.
   *
   * `type` lives here like any other field. Its vocabulary is written as
   * `type: { allowed: [...] }`, which is now the only spelling — with the
   * ceiling gone there is nothing for a separate `types:` key to subset.
   */
  fields?: Record<FieldAddress, FieldConstraints>;

  /**
   * Whether frontmatter keys this rule does not name are permitted.
   *
   * Defaults to `allowed` when absent, and stays a per-rule choice rather than
   * a global one: a permissive default is the only one that lets a rule govern
   * one key of a document without inheriting every other key's fate.
   */
  unknownKeys?: UnknownKeys;

  /** Exactly one of these fields must be present. */
  exactlyOneOf?: FieldAddress[];
  /** At least one of these fields must be present. */
  anyOf?: FieldAddress[];
  /** All of these fields must be present. */
  allOf?: FieldAddress[];

  /**
   * This rule's own assessment prompts, replacing the Module-wide block WHOLE.
   *
   * Replacement, never a per-key merge, and with one condition the two are
   * indistinguishable today — which is exactly why the decision was cheap to
   * make now and expensive to defer. Three reasons it is replacement:
   * §3's "the first matching rule is the complete set" survives replacement and
   * dies under merge; per-key merging recreates the silent-provenance problem
   * `--audit` exists to solve; and deleting a rule's block is then one visible
   * act rather than a one-line diff that silently reactivates a global.
   *
   * A rule with no block of its own gets the Module default whole. Which of the
   * two answered is reported as `source`, so an Operator never has to diff the
   * config to find out.
   */
  assess?: AssessConditions;
}

/**
 * A rule declaring its paths frontmatter-free.
 *
 * Every payload key is excluded — each would assert something about frontmatter
 * that must not exist. Under the old Floor this was the single forced escape
 * from an otherwise unrelaxable requirement; with no Floor it is an ordinary
 * payload variant, and the exclusivity is all that is left of that history.
 */
export interface NoFrontmatterPayload {
  frontmatter: 'forbidden';
  fields?: never;
  unknownKeys?: never;
  exactlyOneOf?: never;
  anyOf?: never;
  allOf?: never;
  /**
   * Excluded on the same terms as every other payload key: assessment reads a
   * frontmatter field, and a file that must carry no frontmatter cannot be
   * assessed. No new code reports it — `CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD`
   * already means exactly this.
   */
  assess?: never;
}

/** The only legal values of `unknownKeys`. `allowed` is also the default. */
export type UnknownKeys = 'allowed' | 'forbidden';
