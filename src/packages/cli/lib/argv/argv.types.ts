/**
 * What one invocation of `mh` asked for.
 *
 * The parser answers with this or with a refusal: every shape of conflicting
 * input is refused rather than resolved by precedence, so there is no
 * partially-understood invocation to model.
 */

/** The four commands that report. Each is a word on the command line: `mh check`. */
export type ReportingCommand = 'check' | 'query' | 'audit' | 'assess';

/**
 * The four commands that report, plus `help`, which answers about the tool
 * itself and is the one command still spelled as a flag. Absent on the command
 * line means `check`.
 */
export type Command = ReportingCommand | 'help';

/**
 * One declared Module, as the parser needs to see it: the config key that names
 * it on the command line, and the commands it implements.
 *
 * Handed in rather than imported, so the parser stays a function of its
 * arguments and the Module names stay derived from the declared Module set.
 */
export interface ModuleCommands {
  /** The Module's top-level config key — its name on the command line. */
  readonly key: string;
  /** The reporting commands the Module implements. */
  readonly commands: readonly ReportingCommand[];
}

/** One fully-defaulted invocation. */
export interface Invocation {
  /** Which command was asked for. */
  command: Command;
  /**
   * The keys of the Modules this run asks, in declared Module order: the one
   * Module the caller named, or every Module implementing the command when
   * none was named. Empty for `help`.
   */
  modules: readonly string[];
  /** The path `query` or `assess` asked about, exactly as the caller wrote it. Empty for the other commands. */
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

/**
 * What the parser answered: an invocation, or a refusal.
 *
 * A refusal's `reason` is empty when the usage text alone says what was wrong,
 * and names the alternatives when a Module name was involved — the four cases
 * where the synopsis cannot list what this declared Module set accepts.
 */
export type ParsedArgv =
  { readonly kind: 'parsed'; readonly invocation: Invocation } | { readonly kind: 'refused'; readonly reason: string };
