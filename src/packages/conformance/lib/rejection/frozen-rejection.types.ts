/**
 * The shape a rejected-config case freezes on disk.
 *
 * Deliberately LOOSER than `ConfigErrorResult`: `code` is a plain string here,
 * not a `ConfigFaultCode`. A frozen expectation is bytes an author wrote, and
 * whether every code in it is still a member of the catalog is exactly what the
 * runner's closure assertion decides. Typing the file as the contract would
 * answer that question by construction and leave closure with nothing to check.
 */

/** One fault, as a case's frozen expectation states it. */
export interface FrozenFault {
  /** A catalog code, unverified until the runner's closure assertion runs. */
  code: string;
  /**
   * Where to look, CASE-RELATIVE: the config file's own name for the file-level
   * codes, and the config's own notation (`frontmatter.rules[3].intent`) for
   * every other one. The runner supplies the prefix, so moving the tier stays a
   * rename rather than a rewrite of every case.
   */
  location: string;
}

/** The whole config-error response one case freezes, fault list ORDERED. */
export interface FrozenRejection {
  /** The one literal that marks the failure variant. */
  error: string;
  /**
   * Every fault, in reporting order. The order is a CONTRACT, not an artefact
   * of how the expectation was written: a reimplementation that reports the
   * same set in a different order does not satisfy this tier.
   */
  faults: readonly FrozenFault[];
}
