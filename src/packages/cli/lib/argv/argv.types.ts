/**
 * What one invocation of `mh` asked for.
 *
 * The parser answers with this or with nothing at all: every shape of
 * conflicting input is refused rather than resolved by precedence, so there is
 * no partially-understood invocation to model.
 */

/**
 * The four commands that report, plus `help`, which answers about the tool
 * itself. Absent on the command line means `check`.
 */
export type Command = 'check' | 'query' | 'audit' | 'assess' | 'help';

/** One fully-defaulted invocation. */
export interface Invocation {
  /** Which command was asked for. */
  command: Command;
  /** The path `--query` or `--assess` asked about, exactly as the caller wrote it. Empty for the other commands. */
  path: string;

  /**
   * `--now`, exactly as the caller wrote it, or empty when it was not given.
   *
   * Empty is the ONE default this parser does not apply, and deliberately: the
   * default is the host clock, which is an ambient read a deterministic parser
   * must not perform. So absence is recorded here and resolved at the impure
   * edge, the same way `--root`'s readability is. A `--now` that WAS given is
   * always a valid instant by the time it reaches here, so empty cannot mean
   * anything else.
   *
   * Meaningless for every command but `assess`.
   */
  now: string;
  /** `--root`, exactly as the caller wrote it, or `.`. Meaningless for `query` and `help`. */
  root: string;
  /** `--config`, exactly as the caller wrote it, or the default filename. Meaningless for `help`. */
  config: string;
}
