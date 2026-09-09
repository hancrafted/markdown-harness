/**
 * The contract for `markdown-harness.config.yaml` — the one configuration file.
 *
 * An ordinary module with ordinary exports. Its ancestor in
 * `okf-frontmatter-harness` was an ambient `.d.ts` of global `declare`s for one
 * reason only: archgate's rule-file scanner permits an import allowlist of
 * exactly four `node:` modules, so a `.rules.ts` could reach types only through
 * a triple-slash reference. Nothing here is read by a rules file.
 *
 * There is no Floor. `type` is an ordinary field, so a repo's vocabulary is the
 * union of `allowed` values across its rules — derivable, no longer declared.
 * What a rule asserts about one field lives in `./constraints.types`.
 */

import type { AssessConditions } from './assess.types';
import type { FieldAddress, FieldConstraints } from './constraints.types';

// ---------------------------------------------------------------------------
// The config file
// ---------------------------------------------------------------------------

/**
 * The parsed contents of `markdown-harness.config.yaml`.
 *
 * One file, at the repo root, no nesting and no fallback filenames — a second
 * config would need a precedence rule *between* files, which is the second
 * precedence dimension this design exists to avoid.
 *
 * Modules get a section apiece. `frontmatter-harness` is the first, and the
 * only one this contract describes; a config naming no module governs nothing.
 * Unknown top-level keys are a config error, so gaining a section later is a
 * deliberate amendment rather than an accident.
 */
export interface MarkdownHarnessConfig {
  /**
   * The `frontmatter-harness` module's section.
   *
   * NOTE the key collision, which is real rather than an oversight:
   * `frontmatter:` at the top level names this module, while
   * `frontmatter: forbidden` *inside a rule* forbids frontmatter on the paths
   * that rule selects. Same word, two levels, two meanings — see
   * `NoFrontmatterPayload`.
   */
  frontmatter?: FrontmatterConfig;
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
 * Every rule = a selector + a reason + a payload. The two exclusivity rules the
 * config validator enforces are modelled here, so the illegal states are
 * unrepresentable rather than merely documented:
 *
 *   - exactly one of `path` / `fileName`
 *   - `frontmatter: forbidden` carries no payload at all
 */
export type FrontmatterRule = RuleCommon & RuleSelector & RulePayload;

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
   * Paths this rule does NOT govern, as globs.
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
  excludeFiles?: Glob[];
}

/**
 * How a rule selects files. Exactly one of the two.
 *
 * `fileName` is defined as sugar: `fileName: "log.md"` desugars to
 * `path: ["**\/log.md"]`. Everything is a path glob underneath, so precedence
 * stays one-dimensional and the resolver keeps one code path.
 */
export type RuleSelector = { path: Glob[]; fileName?: never } | { fileName: string; path?: never };

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

/** A glob, matched against repo-root-relative paths. */
export type Glob = string;
