/**
 * The two texts this tool prints as prose, and the flag defaults they quote.
 *
 * `USAGE` is what stderr carries whenever the invocation itself was wrong.
 * `HELP` is what stdout carries when the caller asked for it, and it is built
 * FROM `USAGE` rather than beside it so the synopsis cannot drift between the
 * text you get for asking and the text you get for getting it wrong.
 *
 * Quoted from the specification rather than reworded, because these are nearly
 * the only prose this tool prints. Everything else it says, it says as data —
 * the other two exceptions being `HELP` here and the runtime-floor refusal in
 * `lib/runtime/node-support.pure.ts`, which answers "not on this machine"
 * rather than "not that invocation" and so cannot be either text.
 */

/** The `--config` default: resolved from the current directory, never from `--root`. */
export const DEFAULT_CONFIG = 'markdown-harness.config.yaml';

/** The `--root` default. */
export const DEFAULT_ROOT = '.';

/**
 * Printed on stderr for any usage error, and nothing else ever is — save the one
 * line `usageRefusal` appends when a Module name was involved.
 */
export const USAGE = `usage: mh [[<module>] check] [--root <dir>] [--config <file>]
       mh [<module>]  query  <path>          [--config <file>]
       mh [<module>]  audit  [--root <dir>]  [--config <file>]
       mh [<module>]  assess <path> [--now <iso>] [--config <file>]
       mh --help

  check     every governed file with a violation, and the counts. The default command.
            Exits 1 when the corpus is wrong.
  query     what the config asks of one path, before anything exists there. Never exits 1.
  audit     how every rule fared across the corpus, so a rule that governs nothing is visible.
            Never exits 1.
  assess    what one file is worth believing, at one instant. Reads the file and
            answers PROCEED, REVIEW or FIX_FILE. Never exits 1.
  <module>  one Module's top-level config key, to run that Module alone. A command
            always follows it. Without one, every Module implementing the command runs.
  --help    this text, plus the flag defaults and the exit-code contract. Exits 0.
`;

/**
 * What stderr carries for one refused invocation: the synopsis, then — when the
 * parser named one — the reason, on a line of its own after it.
 *
 * The synopsis comes first so every usage error still opens with `usage: mh`,
 * and the reason comes last so it is the line a terminal leaves in view. The
 * reason exists only for the refusals the fixed synopsis cannot explain: those
 * about Module names, whose alternatives come from the declared Module set.
 *
 * @param reason The parser's reason, or empty when the synopsis alone explains it.
 */
export function usageRefusal(reason: string): string {
  return reason === '' ? USAGE : `${USAGE}\nmh: ${reason}\n`;
}

/**
 * Printed on stdout when `--help` was asked for, and it exits 0.
 *
 * A caller who types `--help` is asking a question rather than making a
 * mistake, so the answer goes to stdout and succeeds — the convention every
 * command-line tool is read against. The reverse, help on stderr behind a
 * failing exit code, is what this tool did before `--help` existed: the flag
 * was simply unknown, so the likeliest first thing a new caller types looked
 * like an error.
 *
 * It carries the exit-code contract and the authoring loop because the reader
 * is usually an agent, and those are the two things it cannot infer from a
 * synopsis. Restating them here rather than only in the README keeps them
 * somewhere a reader can reach with one command instead of a fetch.
 */
export const HELP = `${USAGE}
  --root <dir>     the directory whose markdown files form the corpus. Default \`.\`.
  --config <file>  the config file, resolved from the current directory and never
                   from --root. Default \`${DEFAULT_CONFIG}\`.
  --now <iso>      the instant assess judges against, as RFC 3339 with an
                   explicit offset: \`2026-12-01T00:00:00Z\`. Defaults to the host
                   clock, and is echoed in the response either way — so a run you
                   did not pin can be replayed exactly by pinning what it echoed.

Assessing one file:
  \`assess\` is the only command that consults a clock, and it never reads one
  of its own accord: the instant arrives through --now and travels back in the
  answer. It reads the file and writes nothing.

    PROCEED    fresh, or beyond what any rule claims
    REVIEW     past its freshness date — carries your own sentence from the config
    FIX_FILE   a rule governs it and the file cannot say when it goes stale

  \`check\` stays clock-free, so a corpus cannot go red overnight on a tree
  nobody touched.

Reading the output:
  Every command answers as JSON on stdout. This help text is the one exception.
  Every response names the Modules that ran in \`modules\`, so a clean run scoped
  to one Module is never mistaken for a clean full run.

    0  ran, nothing wrong
    1  ran, the corpus is wrong — only check ever exits this. A run scoped to
       one Module exits 1 only for that Module's findings.
    2  could not report at all

  Exit 2 has two flavours, told apart by the channel and never by the number: a
  usage error puts the synopsis above on stderr and nothing on stdout, while a
  config it could not trust puts a CONFIG_REJECTED response on stdout and nothing
  on stderr. Read the channel and you can always tell which happened. A usage
  error about a Module — an unknown name, a name with no command, a command
  the named Module does not implement, or a command no Module implements — adds
  one line after the synopsis naming the Modules or commands that would have
  worked.

Authoring a config:
  Nothing generates a config for you, and nothing here writes to your tree.
  Write \`${DEFAULT_CONFIG}\` at the repo root, then let
  \`mh query <path>\` judge it: a malformed config comes back with a fault
  code and its location inside the file, and a sound one comes back with the
  rule that governs the path. A path no rule matches is invisible — a correct
  answer, not an error.

References:
  README   https://github.com/hancrafted/markdown-harness#readme
  Issues   https://github.com/hancrafted/markdown-harness/issues
`;
