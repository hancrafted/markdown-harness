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
 * What a rule asserts about one field lives in `./constraints`.
 */

import type { FieldAddress, FieldConstraints } from './constraints.ts';

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
   * A stable name for this rule. MANDATORY, and unique across the rule list.
   *
   * Rules are ORDERED and first match wins, so a rule's position is semantic —
   * but position is a terrible IDENTITY. Inserting one rule renumbers every
   * later one, which means a stored report's `rules[5]` can name a different
   * rule next week, and "why isn't my rule applying?" cannot be answered about
   * a moving target. So the report never refers to a rule by index; it refers
   * to it by this.
   *
   * Required rather than optional, and that is the cheap-now choice: an
   * optional id gives the report two shapes for one field and every consumer
   * has to handle both forever. There are no adopters yet, so requiring it
   * costs one line per rule today and nothing else ever.
   */
  ruleId: string;

  /**
   * Why this rule exists, in the config author's own words. MANDATORY.
   *
   * The fallback reason for every violation this rule reports. A field
   * constraint may carry its own `intent`, which wins for that field — and
   * because a violation now reports the field's constraints VERBATIM, that
   * override travels with them and needs no resolution step.
   *
   * This one is what a rule-level constraint reports, since `exactlyOneOf`,
   * `unknownKeys` and `frontmatter: forbidden` sit on the rule rather than under
   * a field and so have no fragment of their own to carry a reason.
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
}

/** The only legal values of `unknownKeys`. `allowed` is also the default. */
export type UnknownKeys = 'allowed' | 'forbidden';

/** A glob, matched against repo-root-relative paths. */
export type Glob = string;
