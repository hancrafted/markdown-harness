import type { ClaimKind, ClaimStance } from './claim.types.ts';
import type { FieldAddress } from './constraints.types.ts';
import type { Selector } from './selector.types.ts';

/**
 * The closed catalog of config faults (§3.5).
 *
 * A union of string literals rather than an enum.
 * Phase 0 ends at fifteen codes.
 */
export type ConfigFaultCode =
  /** Nothing exists at the config path. */
  | 'CONFIG_NOT_FOUND'
  /** Something is there but cannot be read as a file (permissions, a directory). */
  | 'CONFIG_UNREADABLE'
  /** The bytes are not valid YAML, or they parse to something other than a mapping. */
  | 'CONFIG_NOT_YAML'
  /** A key no declared Module claims. */
  | 'CONFIG_UNRECOGNISED_KEY'
  /** A defined key holding a value outside its type (e.g. wildcards in selectors). */
  | 'CONFIG_INVALID_VALUE'
  /** A config where no declared Module's key is present. */
  | 'CONFIG_NO_MODULE_SECTION'
  /** A module section carrying rules: [] alone. */
  | 'CONFIG_EMPTY_RULE_LIST'
  /** Two rules share a ruleId. */
  | 'CONFIG_DUPLICATE_RULE_ID'
  /** A rule carrying none of the three selector keys. */
  | 'CONFIG_SELECTOR_MISSING'
  /** A rule with no intent. */
  | 'CONFIG_MISSING_RULE_INTENT'
  /** A pattern with no sibling intent. */
  | 'CONFIG_MISSING_PATTERN_INTENT'
  /** Any intent key written and empty. */
  | 'CONFIG_EMPTY_INTENT'
  /** A constraint object stating nothing. */
  | 'CONFIG_EMPTY_CONSTRAINT'
  /** frontmatter: forbidden beside any payload key. */
  | 'CONFIG_FRONTMATTER_FORBIDDEN_WITH_PAYLOAD'
  /**
   * A rule whose effective assess.stale prompt has no
   * stale_after: { presence: required } beside it.
   */
  | 'CONFIG_ASSESS_WITHOUT_REQUIRED_FIELD';

/** One fault: which constraint failed, and where in the config to look. */
export interface ConfigFault {
  code: ConfigFaultCode;
  location: string;
}

export interface ConflictClaim {
  at: string;
  label?: string;
  kind: ClaimKind;
  stance: ClaimStance;
  field?: FieldAddress;
}

/** What the two sides disagree about. Holds a Selector, NEVER a witness path. */
export interface ConflictSubject {
  kind: 'selector';
  value: Selector;
}

export interface ConfigConflict {
  code: 'CONFIG_MODULE_CONFLICT';
  locations: readonly string[];
  subject: ConflictSubject;
  claims: readonly ConflictClaim[];
}

export type ConfigRejection = ConfigFault | ConfigConflict;
