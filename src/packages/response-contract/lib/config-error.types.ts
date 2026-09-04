/**
 * The rejection payload, shared by every command.
 *
 * A config fault is result content rather than a throw (§4.5). A program whose
 * config errors arrive as stack traces has two output formats, and only one of
 * them is a contract.
 */

/**
 * The closed catalog of config faults (§3.5).
 *
 * A union of string literals rather than an `enum`: `enum` is the one
 * TypeScript construct with no type-erasure, so it emits runtime code Node
 * cannot strip. The entry path is executed by Node directly, which makes an
 * `enum` anywhere on it a startup failure rather than a style choice.
 *
 * Every member carries the `CONFIG_` prefix because a `code` is read in logs
 * and transcripts far from the envelope that scoped it — bare `INVALID_VALUE`
 * beside a frontmatter `VALUE_NOT_ALLOWED` would leave the reader guessing
 * which file to open.
 *
 * The first three name the file, the rest name a key inside it: the same split
 * HTTP draws between "no such thing", "cannot serve it", "malformed", and
 * "well-formed but wrong".
 */
export type ConfigFaultCode =
  /** Nothing exists at the config path. */
  | 'CONFIG_NOT_FOUND'
  /** Something is there but cannot be read as a file (permissions, a directory). */
  | 'CONFIG_UNREADABLE'
  /** The bytes are not valid YAML, or they parse to something other than a mapping. */
  | 'CONFIG_NOT_YAML'
  /** A key the vocabulary does not define, at any depth. */
  | 'CONFIG_UNRECOGNISED_KEY'
  /** A defined key holding a value outside its type (`presence: maybe`). */
  | 'CONFIG_INVALID_VALUE'
  /** No `frontmatter:` section, or `rules: []` — naming a module and governing nothing. */
  | 'CONFIG_EMPTY_RULE_LIST'
  /** Two rules share a `ruleId`. */
  | 'CONFIG_DUPLICATE_RULE_ID'
  /** A rule with neither `path` nor `fileName`. */
  | 'CONFIG_SELECTOR_MISSING'
  /** A rule with both `path` and `fileName`. */
  | 'CONFIG_SELECTOR_AMBIGUOUS'
  /** A rule with no `intent`. */
  | 'CONFIG_MISSING_RULE_INTENT'
  /** A `pattern` with no sibling `intent`. */
  | 'CONFIG_MISSING_PATTERN_INTENT'
  /** Any `intent` key written and empty. */
  | 'CONFIG_EMPTY_INTENT'
  /** A constraint object stating nothing. */
  | 'CONFIG_EMPTY_CONSTRAINT'
  /** `frontmatter: forbidden` beside any payload key. */
  | 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD';

/** One fault: which constraint failed, and where in the config to look. */
export interface ConfigFault {
  /** From §3.5's catalog. */
  code: ConfigFaultCode;
  /** The config's own notation, e.g. `frontmatter.rules[3].intent`. */
  location: string;
}

/** The result variant returned when the config could not be trusted. */
export interface ConfigErrorResult {
  /** The one literal that marks the failure variant; `isConfigError` keys on its presence. */
  error: 'CONFIG_REJECTED';
  /** Every fault validation could find, not the first — a config fails whole (§3.5). */
  faults: readonly ConfigFault[];
}
