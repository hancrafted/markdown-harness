/**
 * The result returned when the config cannot be trusted to describe anything.
 *
 * A config fault is RESULT CONTENT, not a throw. A program whose config errors
 * arrive as stack traces has two output formats, and only one of them is a
 * contract.
 *
 * Like every result here, this data carries no English. The proposal that
 * reshaped these payloads asked for a `message` beside each fault and it is
 * deliberately absent: a `code` plus the address it was found at is a complete
 * basis for the sentence, and storing the sentence beside them would store one
 * fact twice and leave two representations to drift.
 */

/**
 * Where in the config a fault sits, in the config's own notation — the shape
 * the Operator would use to find it: `frontmatter.rules`,
 * `frontmatter.rules[3].intent`, `frontmatter.rules[3].fields.slug.pattern`.
 *
 * POSITIONAL, and that does not contradict a rule being identified by `ruleId`
 * everywhere else. `ruleId` is a rule's IDENTITY, needed because a stored
 * report's reference must survive a rule being inserted above it. This is a
 * location in a file the Operator has open in front of them, and for that job
 * the index is the thing they can actually find.
 */
export type ConfigAddress = string;

/**
 * Why a config was rejected.
 *
 * CAPITAL_SNAKE_CASE for the same reason the violation codes are: these tokens
 * are ours. `frontmatter.rules` beside them is the Operator's own notation, and
 * the casing keeps the two tellable apart.
 */
export const CONFIG_FAULT = {
  /**
   * An empty rule list. A config naming a module and then governing nothing is
   * a mistake rather than a deliberate no-op, so it is a fault rather than a
   * clean report over zero files.
   */
  EMPTY_RULE_LIST: 'EMPTY_RULE_LIST',

  /**
   * `pattern` with no sibling `intent`.
   *
   * `constraints.ts` has always stated this as mandatory — "a sibling `intent`
   * is MANDATORY whenever this is present, and it is what the violation
   * reports" — and nothing enforced it, which made it a promise rather than a
   * rule. It is the whole of what keeps the Kubernetes failure
   * (`"failed rule: {Rule}"`) away now that a violation carries the config
   * fragment verbatim and therefore carries the regex: an unexplained pattern
   * has to be a CONFIG error, because the alternative is a report nobody can
   * act on and no layer of ours left to paper over it.
   */
  MISSING_PATTERN_INTENT: 'MISSING_PATTERN_INTENT',
} as const;

export type ConfigFaultCode = (typeof CONFIG_FAULT)[keyof typeof CONFIG_FAULT];

export interface ConfigFault {
  code: ConfigFaultCode;
  location: ConfigAddress;
}

/**
 * The one result shape that is not about a corpus.
 *
 * `error` is what a consumer branches on — no sibling result declares it — and
 * it is deliberately not a `status` field on every result. A `status: 'ok'`
 * beside a check that found twenty violations says two contradictory things at
 * once; the outcome of a check IS its contents.
 */
export interface ConfigErrorResult {
  error: 'CONFIG_REJECTED';
  faults: readonly ConfigFault[];
}
