/**
 * What one invocation of `mh` asked for.
 *
 * The parser answers with this or with nothing at all: every shape of
 * conflicting input is refused rather than resolved by precedence, so there is
 * no partially-understood invocation to model.
 */

/** The three commands. Absent on the command line means `check`. */
export type Command = 'check' | 'query' | 'audit';

/** One fully-defaulted invocation. */
export interface Invocation {
  /** Which command was asked for. */
  command: Command;
  /** `--query`'s path, exactly as the caller wrote it. Empty for the other commands. */
  path: string;
  /** `--root`, exactly as the caller wrote it, or `.`. Meaningless for `query`. */
  root: string;
  /** `--config`, exactly as the caller wrote it, or the default filename. */
  config: string;
}
