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

/** Printed on stderr for any usage error, and nothing else ever is. */
export const USAGE = `usage: mh [--check] [--root <dir>] [--config <file>]
       mh  --query <path>          [--config <file>]
       mh  --audit  [--root <dir>] [--config <file>]
       mh  --help

  --check   every governed file with a violation, and the counts. The default command.
            Exits 1 when the corpus is wrong.
  --query   what the config asks of one path, before anything exists there. Never exits 1.
  --audit   how every rule fared across the corpus, so a rule that governs nothing is visible.
            Never exits 1.
  --help    this text, plus the flag defaults and the exit-code contract. Exits 0.
`;

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

Reading the output:
  Every command answers as JSON on stdout. This help text is the one exception.

    0  ran, nothing wrong
    1  ran, the corpus is wrong — only --check ever exits this
    2  could not report at all

  Exit 2 has two flavours, told apart by the channel and never by the number: a
  usage error puts the synopsis above on stderr and nothing on stdout, while a
  config it could not trust puts a CONFIG_REJECTED response on stdout and nothing
  on stderr. Read the channel and you can always tell which happened.

Authoring a config:
  Nothing generates a config for you, and nothing here writes to your tree.
  Write \`${DEFAULT_CONFIG}\` at the repo root, then let
  \`mh --query <path>\` judge it: a malformed config comes back with a fault
  code and its location inside the file, and a sound one comes back with the
  rule that governs the path. A path no rule matches is invisible — a correct
  answer, not an error.

References:
  README   https://github.com/hancrafted/markdown-harness#readme
  Issues   https://github.com/hancrafted/markdown-harness/issues
`;
