/**
 * What `--audit` answers about every rule in the config.
 *
 * The stated cost of first-match is that every LOSING rule is silent: a rule
 * that wins no file reports nothing, so an ordering mistake or a glob typo is
 * invisible in exactly the direction a trust tool cannot afford. This is the
 * diagnostic that makes them visible, and it is the Operator's instrument —
 * which is why none of it rides in `--check`, whose reader can act on none of it.
 */

/** Every rule's fate across one corpus. */
export interface AuditResult {
  /** One row per rule, in config order — including rules that governed nothing. */
  rules: readonly RuleAudit[];
}

/** How one rule fared. */
export interface RuleAudit {
  /** Which rule this row is about. */
  rule: RuleRef;
  /** Files this rule selected, where no rule above it had already taken them. */
  won: number;
  /** Files this rule selected, but a rule above it had already won. */
  shadowed: number;
  /** The winning `ruleId`s, deduped, in config order. Always present, `[]` when none. */
  shadowedBy: readonly string[];
  /** Files this rule selected, but its own `excludeFiles` removed. */
  excluded: number;
}

/** Which rule — plus the only place a selector appears in any response. */
export interface RuleRef {
  /** The rule's id, the way every report refers to a rule. */
  ruleId: string;
  /** As written: the `fileName` sugar is reported as sugar, never expanded away. */
  selector: SelectorRef;
  /** The rule's `intent`, verbatim. */
  intent: string;
}

/**
 * A rule's selector, in the shape the Operator wrote it.
 *
 * Reporting `fileName` as the sugar it is, rather than the `path: ["**\/<name>"]`
 * it desugars to, is deliberate: an Operator reading a diagnostic has to
 * recognise their own config in it.
 */
export type SelectorRef = { path: readonly string[]; fileName?: never } | { fileName: string; path?: never };
