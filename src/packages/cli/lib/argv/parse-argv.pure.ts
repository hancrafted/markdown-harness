/**
 * Read argv into an invocation, or refuse it.
 *
 * The grammar is `mh [<module-key>] <command> [<path>] [flags]`: the command is
 * a word, a Module's config key in front of it scopes the run to that Module,
 * and `--root`, `--config`, `--now` and `--help` stay flags, written anywhere.
 *
 * Conflicting input is refused rather than resolved by precedence. A *missing*
 * command is not conflicting input, which is why it has a default and the
 * conflicts do not.
 *
 * Most refusals carry no reason: stderr's one job for argv is the usage text,
 * so the caller learns THAT argv was refused and reads the synopsis to learn
 * why. The exceptions are the four refusals about Modules — an unknown name, a
 * name with no command, a scoped command the Module does not implement, and a
 * command no Module implements — because the synopsis is fixed text and cannot
 * list what the declared Module set accepts. Those name the alternatives.
 */

import type { Invocation, ModuleCommands, ParsedArgv, ReportingCommand } from './argv.types.ts';
import { isAssessmentInstant } from './assessment-instant.pure.ts';
import { DEFAULT_CONFIG, DEFAULT_ROOT } from './usage.pure.ts';

/**
 * The reporting commands, in the order the synopsis lists them — the one list
 * both the parser and the Module-port reading in `module-answers.pure.ts` use.
 */
export const REPORTING_COMMANDS: readonly ReportingCommand[] = ['check', 'query', 'audit', 'assess'];

/** The commands that take one path after the command word. */
const PATH_COMMANDS: readonly ReportingCommand[] = ['query', 'assess'];

/** The flags that take a value. */
const VALUE_FLAGS: readonly string[] = ['--root', '--config', '--now'];

/** The one flag that takes none. */
const HELP_FLAG = '--help';

/** The one command `--now` means anything to. */
const ASSESS = 'assess';

/** A refusal the usage text alone explains. */
const REFUSED: ParsedArgv = { kind: 'refused', reason: '' };

/** A refusal naming the alternatives the synopsis cannot. */
function refusedFor(reason: string): ParsedArgv {
  return { kind: 'refused', reason };
}

/** The flags given, and every other token in order. */
interface Tokens {
  readonly flags: Map<string, string>;
  readonly words: readonly string[];
}

function isCommand(word: string | undefined): word is ReportingCommand {
  return REPORTING_COMMANDS.some((command) => command === word);
}

/**
 * Split argv into flags and words, refusing three malformed flag shapes.
 *
 * A flag given twice, a flag written with no value, and a value beginning with
 * `--` are all conflicting input. Last-one-wins on a repeat would silently
 * discard what the caller asked for, and this tool answers about directories.
 * Any other token beginning with `--` is an unknown flag — the retired
 * `--check` form included, which is refused rather than aliased.
 */
function tokensOf(argv: readonly string[]): Tokens | undefined {
  const flags = new Map<string, string>();
  const words: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      words.push(token);
      continue;
    }
    const value = flagValue(token, argv[index + 1]);
    if (value === undefined || flags.has(token)) return undefined;
    flags.set(token, value);
    if (token !== HELP_FLAG) index += 1;
  }
  return { flags, words };
}

/**
 * What one flag carries — empty for `--help`, the next token for a value flag —
 * or `undefined` when the flag is unknown or its value is missing or itself
 * begins with `--`.
 */
function flagValue(flag: string, next: string | undefined): string | undefined {
  if (flag === HELP_FLAG) return '';
  if (!VALUE_FLAGS.includes(flag)) return undefined;
  if (next === undefined || next.startsWith('--')) return undefined;
  return next;
}

/** Name a list the way every refusal reason does. */
function listed(names: readonly string[]): string {
  return names.join(', ');
}

/** The keys of the Modules implementing one command, in declared order. */
function implementing(modules: readonly ModuleCommands[], command: ReportingCommand): string[] {
  return modules.filter((module) => module.commands.includes(command)).map((module) => module.key);
}

/** What the command words resolved to, before flags are checked against them. */
interface Resolved {
  readonly command: ReportingCommand;
  readonly modules: readonly string[];
  readonly operands: readonly string[];
}

/**
 * The Module scope one scoped invocation names, or the refusal naming why not.
 *
 * Every reason names the alternatives, so a typo or a missing word is caught
 * with the fix beside it, and "not supported" is never answered as "nothing to
 * report".
 */
function scoped(
  module: ModuleCommands,
  words: readonly string[],
  modules: readonly ModuleCommands[],
): Resolved | ParsedArgv {
  const [, command, ...operands] = words;
  if (command === undefined) return refusedFor(`${module.key} needs a command: ${listed(module.commands)}`);
  if (!isCommand(command)) return REFUSED;
  if (!module.commands.includes(command)) {
    const others = implementing(modules, command);
    const alternatives =
      others.length === 0 ? 'no Module does' : `${listed(others)} ${others.length === 1 ? 'does' : 'do'}`;
    return refusedFor(`${module.key} does not implement ${command}; ${alternatives}`);
  }
  return { command, modules: [module.key], operands };
}

/**
 * The command, Module scope and operands the words name, or the refusal.
 *
 * No words at all means `check`, unscoped: bare `mh` checks the directory the
 * way `docker compose` finds its own file where you stand.
 */
function resolved(words: readonly string[], modules: readonly ModuleCommands[]): Resolved | ParsedArgv {
  const [first, ...rest] = words;
  if (first === undefined || isCommand(first)) {
    const command = first ?? 'check';
    const keys = implementing(modules, command);
    if (keys.length === 0) return refusedFor(`no Module implements ${command}`);
    return { command, modules: keys, operands: rest };
  }

  const module = modules.find((candidate) => candidate.key === first);
  if (module !== undefined) return scoped(module, words, modules);

  const known = listed(modules.map((candidate) => candidate.key));
  return refusedFor(
    `"${first}" is neither a command nor a Module. Commands: ${listed(REPORTING_COMMANDS)}. Modules: ${known}`,
  );
}

/**
 * Whether the flags or operands name something the command asked not to have.
 *
 * Every one is refused rather than resolved, and none is ignored — an argument
 * silently dropped would let a caller believe they had asked something they had
 * not.
 */
function conflicts(flags: Map<string, string>, { command, operands }: Resolved): boolean {
  // `query` and `assess` take exactly one path; the other two take none.
  if (operands.length !== (PATH_COMMANDS.includes(command) ? 1 : 0)) return true;

  // A query has no corpus, so a `--root` beside one is conflicting input, not
  // an argument to ignore. An assessment answers about one path on the same
  // terms.
  if (PATH_COMMANDS.includes(command) && flags.has('--root')) return true;

  // `--now` beside any command but `assess` would let a caller believe a
  // `check` had been pinned to an instant, and `check` reads no clock.
  return flags.has('--now') && command !== ASSESS;
}

/** The invocation, with the two documented defaults applied. */
function invocationOf(flags: Map<string, string>, { command, modules, operands }: Resolved): Invocation {
  return {
    command,
    modules,
    path: operands[0] ?? '',
    root: flags.get('--root') ?? DEFAULT_ROOT,
    config: flags.get('--config') ?? DEFAULT_CONFIG,
    now: flags.get('--now') ?? '',
  };
}

/** `--help`, alone. Anything beside it names a second question, which is refused rather than outranked. */
function helpOf(tokens: Tokens): ParsedArgv {
  if (tokens.flags.size > 1 || tokens.words.length > 0) return REFUSED;
  const invocation: Invocation = {
    command: 'help',
    modules: [],
    path: '',
    root: DEFAULT_ROOT,
    config: DEFAULT_CONFIG,
    now: '',
  };
  return { kind: 'parsed', invocation };
}

/**
 * Parse the argv tail into one invocation.
 *
 * @param argv The arguments after the executable and script — `process.argv.slice(2)`.
 * @param modules Every declared Module's key and commands, in declared order.
 */
export function parseArgv(argv: readonly string[], modules: readonly ModuleCommands[]): ParsedArgv {
  const tokens = tokensOf(argv);
  if (tokens === undefined) return REFUSED;
  if (tokens.flags.has(HELP_FLAG)) return helpOf(tokens);

  const words = resolved(tokens.words, modules);
  if ('kind' in words) return words;
  if (conflicts(tokens.flags, words)) return REFUSED;

  // An unparseable instant is a usage error, decided here because it is a
  // property of the argument alone. A well-formed value naming no day —
  // `2026-02-30` — is refused too: the argument is compared, not merely read,
  // so form is not enough.
  const now = tokens.flags.get('--now');
  if (now !== undefined && !isAssessmentInstant(now)) return REFUSED;

  return { kind: 'parsed', invocation: invocationOf(tokens.flags, words) };
}
