/**
 * The report returned when the config cannot be trusted to describe anything.
 *
 * A config fault is REPORT CONTENT, not a throw. A tool whose config errors
 * arrive as stack traces has two output formats, and only one of them is a
 * contract.
 *
 * Like every report here, this data carries no English: a `code` plus the
 * address it was found at is a complete basis for the sentence, and storing the
 * sentence beside them would store one fact twice.
 */

/**
 * Where in the config a fault sits, in the config's own notation — the shape
 * the Operator would use to find it: `frontmatter.rules`,
 * `frontmatter.rules[3].intent`, `frontmatter.rules[3].fields.slug.pattern`.
 */
export type ConfigAddress = string;

/**
 * One reason the config was rejected.
 *
 * Becomes a union discriminated on `code` as the other fault forms land; it is
 * one member today because one form has a test.
 */
export interface ConfigFault {
  /**
   * An empty rule list. A config naming a module and then governing nothing is
   * a mistake rather than an inert harness, so it is a fault rather than a
   * clean report over zero files.
   */
  code: 'empty-rule-list';
  at: ConfigAddress;
}

export type ConfigFaultCode = ConfigFault['code'];

export interface ConfigRejected {
  report: 'config-rejected';
  faults: readonly ConfigFault[];
}
