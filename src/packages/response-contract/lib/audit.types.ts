/**
 * What `--audit` answers about every rule in the config.
 *
 * The stated cost of first-match is that every LOSING rule is silent: a rule
 * that wins no file reports nothing, so an ordering mistake or a glob typo is
 * invisible in exactly the direction a trust tool cannot afford. This is the
 * diagnostic that makes them visible, and it is the Operator's instrument —
 * which is why none of it rides in `--check`, whose reader can act on none of it.
 */

/** Every Module's rule tallies across one corpus. */
export interface AuditResult {
  /** One block per declared Module, in declared Module order. */
  modules: readonly ModuleAuditResult[];
}

/** What one Module answers before composition names it. */
export interface ModuleAudit {
  /** One row per rule, in section order — including rules that governed nothing. */
  rules: readonly RuleAudit[];
}

/** One Module's rule tallies, named by the top-level config key the Operator typed. */
export interface ModuleAuditResult extends ModuleAudit {
  /** Present even when the Module declares no rules, so its empty audit remains attributable. */
  module: string;
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
  /** As written: an axis the Operator left out is left out here too. */
  selector: SelectorRef;
  /** The rule's `intent`, verbatim. */
  intent: string;
}

/**
 * A rule's selector, in the shape the Operator wrote it.
 *
 * Both axes optional, and an axis the rule never carried is ABSENT rather than
 * echoed back as an empty list: an Operator reading a diagnostic has to
 * recognise their own config in it, and "every file name" spelled as `[]` is
 * not what they typed. A selector carries at least one axis, so this is never
 * the empty object.
 *
 * Declared here rather than imported from the config contract on purpose. This
 * is the wire format, and the two are free to diverge — a response is read by
 * tools that never see a config type.
 */
export interface SelectorRef {
  /** The folders the rule listed, each selecting that folder alone. */
  folders?: readonly string[];
  /** The literal basenames the rule listed. */
  fileNames?: readonly string[];
}
