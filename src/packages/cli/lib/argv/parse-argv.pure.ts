/**
 * Read argv into an invocation, or refuse it.
 *
 * Conflicting input is refused rather than resolved by precedence. A *missing*
 * command is not conflicting input, which is why it has a default and the
 * conflicts do not.
 *
 * Refusal is spelled `undefined` and carries no reason: §2 gives stderr one
 * job for an argv it will not take — the usage text — so a caller learns THAT
 * its argv was refused and reads the usage to learn why. A per-shape message
 * would be a second output format, and only one of them would be a contract.
 */

import type { Command, Invocation } from './argv.types.ts';
import { isAssessmentInstant } from './assessment-instant.pure.ts';
import { DEFAULT_CONFIG, DEFAULT_ROOT } from './usage.pure.ts';

/** The command flags. At most one may appear. */
const COMMAND_FLAGS: Record<string, Command> = {
  '--check': 'check',
  '--query': 'query',
  '--audit': 'audit',
  '--assess': 'assess',
  '--help': 'help',
};

/** The flags that take a following value. `--query` and `--assess` are each both a command and a value flag. */
const VALUE_FLAGS: readonly string[] = ['--query', '--assess', '--root', '--config', '--now'];

/** The one command `--now` means anything to. */
const ASSESS = 'assess';

function isKnownFlag(token: string): boolean {
  return token in COMMAND_FLAGS || VALUE_FLAGS.includes(token);
}

/**
 * Pair every flag with its value, refusing the three malformed argv shapes.
 *
 * A flag given twice, a flag written with no value, and a value that begins
 * `--` are all conflicting input. Last-one-wins on a repeat would silently
 * discard what the caller asked for, and this tool answers about directories.
 */
function collectFlags(argv: readonly string[]): Map<string, string> | undefined {
  const given = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!isKnownFlag(flag) || given.has(flag)) return undefined;

    if (!VALUE_FLAGS.includes(flag)) {
      given.set(flag, '');
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) return undefined;
    given.set(flag, value);
    index += 1;
  }

  return given;
}

/**
 * Which command was asked for, or nothing if more than one was.
 *
 * A missing command resolves to `check`: bare `mh` checks the current directory
 * the way `docker compose` finds its own file where you stand.
 */
function commandFrom(given: Map<string, string>): Command | undefined {
  const asked = Object.keys(COMMAND_FLAGS).filter((flag) => given.has(flag));
  if (asked.length > 1) return undefined;
  return asked.length === 1 ? COMMAND_FLAGS[asked[0]] : 'check';
}

/** The collected flags, with the two documented defaults applied. */
function withDefaults(given: Map<string, string>, command: Command): Invocation {
  return {
    command,
    path: given.get('--query') ?? given.get('--assess') ?? '',
    root: given.get('--root') ?? DEFAULT_ROOT,
    config: given.get('--config') ?? DEFAULT_CONFIG,
    now: given.get('--now') ?? '',
  };
}

/**
 * Whether the flags given name something the command asked for does not have.
 *
 * Every one of these is refused rather than resolved, and none of them is
 * ignored — an argument silently dropped would let a caller believe they had
 * asked for something they had not.
 */
function conflicts(given: Map<string, string>, command: Command): boolean {
  // A query has no corpus, so a `--root` beside one is conflicting input rather
  // than an argument to ignore. An assessment answers about one path on the
  // same terms.
  if ((command === 'query' || command === ASSESS) && given.has('--root')) return true;

  // `--now` supplies the instant an assessment is judged against, so beside any
  // other command it names something that command does not have. Dropping it
  // would let a caller believe a `--check` had been pinned to an instant when
  // `--check` never reads one.
  if (given.has('--now') && command !== ASSESS) return true;

  // `--help` answers about the tool and reads neither a corpus nor a config, so
  // anything beside it is conflicting input on the same terms. Refusing keeps
  // `--help` from becoming a precedence rule that quietly wins over a real
  // command — `mh --check --help` names two different questions, and guessing
  // which one was meant is exactly what this parser does not do.
  return command === 'help' && given.size > 1;
}

/**
 * Parse an argv tail into one invocation.
 *
 * @param argv The arguments after the executable and script — `process.argv.slice(2)`.
 */
export function parseArgv(argv: readonly string[]): Invocation | undefined {
  const given = collectFlags(argv);
  if (given === undefined) return undefined;

  const command = commandFrom(given);
  if (command === undefined) return undefined;
  if (conflicts(given, command)) return undefined;

  // An unparseable instant is a usage error, decided here because it is a
  // property of the argument alone. A well-formed value naming no day — the
  // `2026-02-30` case — is refused too: this argument is compared, not merely
  // read, so form is not enough.
  const now = given.get('--now');
  if (now !== undefined && !isAssessmentInstant(now)) return undefined;

  return withDefaults(given, command);
}
