/**
 * The `assess:` vocabulary — the conditions a file can be assessed against, and
 * the Operator's own sentence for each.
 *
 * Its own file rather than a section of `config.types`, because the growth rule
 * it is the first key to need cuts the config language in two: `rules:` for what
 * varies by path, and Module-wide keys for what does not. The two halves are
 * read by different people at different times, and `config.types` had reached
 * the length where one more section stopped being readable as a whole.
 */

/**
 * The conditions a file can be assessed against.
 *
 * ONE condition ships. `stale` is the only one that needs a clock, and
 * therefore the only one that needs a command of its own: `unverified`,
 * `unsourced` and `invalid` are all answerable by `--check` today through
 * `presence` and `minItems`, and restating them here would move work out of the
 * tier that already covers it. Any other key under `assess:` is
 * `CONFIG_UNRECOGNISED_KEY`.
 *
 * The value is a FLAT STRING and interpolation is deliberately absent. Every
 * fact an Operator would interpolate — the path, the instant, the field and its
 * value — already travels beside their sentence in the response, so a template
 * would hold one fact twice and two representations of one fact drift. It would
 * also become public portable surface, and an Operator writing `{{path}}` would
 * ship literal braces to their agent with no warning.
 */
export interface AssessConditions {
  /**
   * What to tell an agent that opened a file at or past its `stale_after`.
   *
   * Written to be read by an agent mid-task, so it reads as an instruction
   * rather than a description: the tool never writes prose of its own here, it
   * only carries the Operator's.
   */
  stale: string;
}
