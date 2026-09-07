/**
 * The usage text, and the only thing stderr ever carries.
 *
 * Quoted from the specification rather than reworded, because it is the one
 * piece of prose this tool prints. Everything else it says, it says as data.
 */

/** The `--config` default: resolved from the current directory, never from `--root`. */
export const DEFAULT_CONFIG = 'markdown-harness.config.yaml';

/** The `--root` default. */
export const DEFAULT_ROOT = '.';

/** Printed on stderr for any usage error, and nothing else ever is. */
export const USAGE = `usage: mh [--check] [--root <dir>] [--config <file>]
       mh  --query <path>          [--config <file>]
       mh  --audit  [--root <dir>] [--config <file>]

  --check   every governed file with a violation, and the counts. The default command.
            Exits 1 when the corpus is wrong.
  --query   what the config asks of one path, before anything exists there. Never exits 1.
  --audit   how every rule fared across the corpus, so a rule that governs nothing is visible.
            Never exits 1.
`;
