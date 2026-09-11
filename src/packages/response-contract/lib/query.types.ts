/**
 * What `--query` answers about one path.
 *
 * `git check-attr` semantics: the entire input is a path string and the config.
 * A path that does not exist and one that does are answered identically — an
 * agent about to author a file cannot be asked to write it first and be told
 * afterwards.
 *
 * This is the command a naming Module matters most to, because it is the one
 * an agent reaches for WHILE CHOOSING THE NAME.
 */

import type { FieldConstraints, FileSubject } from '../../config-contract/index.ts';

/** Either some Module claimed the path, or the whole config passed it by. */
export type QueryResult = GovernedPath | InvisiblePath;

/** A path at least one Module selects, and everything every such Module asks of it. */
export interface GovernedPath {
  /** The discriminant. */
  governance: 'governed';
  /** Normalised: `/`-separated, no leading `./` or `/`. */
  path: string;
  /**
   * EVERY Module that governs this path, in the order `MarkdownHarnessConfig`
   * declares its keys.
   *
   * Where `--check` lists only Modules with findings, this lists them all —
   * including a Module whose requirements the path already satisfies, because
   * the path may not exist yet and "already satisfies" is not yet a fact about
   * anything. Telling an agent only about the Modules it is currently failing
   * would withhold the naming rule from exactly the agent that is about to
   * choose a name.
   *
   * Never empty: a `GovernedPath` with no Modules would be an `InvisiblePath`.
   */
  modules: readonly ModuleGovernance[];
}

/**
 * Nothing will ever be reported about this path, by any rule OF ANY MODULE — a
 * claim about the whole config, not a null rule.
 *
 * Note what this is *not*: it does not mean a rule excluded the path. It means
 * no rule of any Module selected it in the first place (a rule's own
 * `excludeFiles` can be one reason why). The widening from "no rule" to "no
 * Module" is what the second Module cost this word, and it is the stronger
 * claim: a file the frontmatter Module ignores is still visible if a naming
 * rule names it.
 */
export interface InvisiblePath {
  /** The discriminant. */
  governance: 'invisible';
  /** Normalised the same way, so the caller can key on what it gets back. */
  path: string;
}

/**
 * One Module's answer for one path.
 *
 * Discriminated on `module`, which carries the Module's own CONFIG KEY and
 * never its Package name.
 */
export type ModuleGovernance = FrontmatterGovernance | FileNameGovernance;

/** What the `frontmatter` Module asks of this path. */
export interface FrontmatterGovernance {
  /** The Module's own config key. */
  module: 'frontmatter';
  /** The rule that won under first-match within this Module, and its intent verbatim. */
  rule: { ruleId: string; intent: string };
  /** Everything that rule asks. */
  requirements: Requirements;
}

/** What the `file-names` Module asks of this path. */
export interface FileNameGovernance {
  /** The Module's own config key. */
  module: 'file-names';
  /** The rule that won under first-match within this Module, and its intent verbatim. */
  rule: { ruleId: string; intent: string };
  /** Everything that rule asks of the name. */
  requirements: NameRequirements;
}

/**
 * Either the rule forbids frontmatter outright, or it constrains it.
 *
 * This union sits INSIDE the frontmatter Module's own block now. It used to
 * discriminate the whole `--query` answer, which made the response
 * frontmatter-shaped at its top level and left a naming rule nowhere to appear.
 */
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

/**
 * What a naming rule asks of the name, re-exposed in the config's own
 * vocabulary verbatim.
 *
 * The subject is handed back WHOLE rather than flattened, so the shape an agent
 * reads here is the shape an Operator would have to write. Flattening
 * `segments:` into a sentence would put a word in the Operator's mouth, which
 * is the same reason `ConstrainingRequirements` re-exposes constraint keys
 * rather than composing prose from them.
 */
export interface NameRequirements {
  /** The `file:` subject, verbatim from the config. */
  file: FileSubject;
}
