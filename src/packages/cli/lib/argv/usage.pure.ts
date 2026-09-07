/**
 * The usage text: what stderr carries whenever the invocation itself was wrong.
 *
 * Quoted from the specification rather than reworded, because it is nearly the
 * one piece of prose this tool prints. Everything else it says, it says as
 * data — the single exception being the runtime-floor refusal in
 * `lib/runtime/node-support.pure.ts`, which answers "not on this machine"
 * rather than "not that invocation" and so cannot be this text.
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
