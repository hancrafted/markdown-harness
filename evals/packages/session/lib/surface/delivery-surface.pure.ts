// The delivery surfaces a cell can measure, and what each one needs of the root and
// the Host harness. A pull surface gives the agent one shell command, `bin/mh query`,
// and an instruction-file line saying to use it; the shell allow-list holds that
// command and nothing else, until a cell widens it on purpose.
//
// Everything that differs by delivery channel is one row of CHANNELS, keyed by DeliveryChannel: the shells and
// encodings it may pair with, the scripts it ships, its rung 1 check and rung 2 probe, the settings that wire its
// hook, the finder of its delivery, its canary, and the instruction-file line. Adding a channel is a row here and
// the functions that row names; no other file switches on the channel.

import { evaluateAssessCanary, evaluateCanary, evaluatePullCanary } from '../canary/canary.pure.ts';
import { pullDelivery, pushDelivery } from '../observe/delivery.pure.ts';
import { checkAssessRung1, checkRung1 } from '../preflight/preconditions.pure.ts';
import type { ChannelRow, DeliveryChannel, DeliverySurface, ShellScope } from './delivery-surface.types.ts';

export const SHIM_PATH = 'bin/mh';
/** The note the assess canary reads and every assess layout holds: a far-past `stale_after` keeps it stale at any real clock. */
export const ASSESS_CANARY_TARGET = 'docs/research/feature-flags.md';
/** The one command a pull surface hands the agent; the allow-list, the instruction line and the canary task all say it. */
export const QUERY_COMMAND_TEXT = `${SHIM_PATH} query`;

/** The default instruction-file line a pull surface adds, for a canary that has no case to take its words from. */
export const PULL_LINE = `Before you create a markdown file, run \`${QUERY_COMMAND_TEXT} <path>\` and follow what it says.`;

const QUERY_ALLOWED = [`Bash(${QUERY_COMMAND_TEXT}:*)`, `Bash(./${QUERY_COMMAND_TEXT}:*)`];
// File-writing commands a widened cell adds, so an agent can create the target file without the Write tool. The
// widening is partial on purpose: `cp`, `mv`, `python` and `sed -i` stay denied, so a file written through
// them is not measured, and creation detection (observe/creation.pure.ts) follows this list.
const QUERY_HOOK = 'query-hook.mjs';
// The assess hook imports the activity log, so a root holding one holds the other.
const ASSESS_HOOK = 'assess-hook.mjs';
const ASSESS_SCRIPTS = [ASSESS_HOOK, 'activity-log.mjs'];
// The push hook as `init.mjs` wires it, and the assess hook as it wires it, word for word: a closure test reads
// that file and holds the assess command equal.
const HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.agents/skills/markdown-harness/scripts/query-hook.mjs"';
const PUSH_SETTINGS = {
  hooks: { PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: HOOK_COMMAND }] }] },
};
const ASSESS_COMMAND = 'node "${CLAUDE_PROJECT_DIR}/.agents/skills/markdown-harness/scripts/assess-hook.mjs"';
const ASSESS_SETTINGS = {
  hooks: { PostToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: ASSESS_COMMAND }] }] },
};
const WRITING_ALLOWED = ['Bash(cat:*)', 'Bash(tee:*)', 'Bash(printf:*)', 'Bash(echo:*)', 'Bash(mkdir:*)'];

export const CHANNELS: Readonly<Record<DeliveryChannel, ChannelRow>> = {
  push: {
    // The widened shell sits here because the coverage hole is push's Write matcher; pull stays query-only.
    shells: ['none', 'widened'],
    encodings: ['hook-prose'],
    hookScripts: () => [QUERY_HOOK],
    scripts: [QUERY_HOOK],
    rung1: { command: 'query', check: checkRung1 },
    probe: { kind: 'hook', script: QUERY_HOOK, tool: 'Write' },
    settings: PUSH_SETTINGS,
    delivery: pushDelivery,
    canary: {
      surface: { channel: 'push', shell: 'none', encoding: 'hook-prose' },
      task: (target) => `Use the Write tool to create ${target} with a short note.`,
      verdict: evaluateCanary,
    },
    line: undefined,
  },
  pull: {
    shells: ['query-only'],
    encodings: ['json', 'prose', 'intent-only'],
    // The prose encoding renders through the hook script, so it ships it; the others never touch it.
    hookScripts: (surface) => (surface.encoding === 'prose' ? [QUERY_HOOK] : []),
    scripts: [QUERY_HOOK],
    rung1: { command: 'query', check: checkRung1 },
    probe: { kind: 'command' },
    settings: undefined,
    delivery: pullDelivery,
    canary: {
      surface: { channel: 'pull', shell: 'query-only', encoding: 'json' },
      task: (target) =>
        `Run ${QUERY_COMMAND_TEXT} ${target} first, then use the Write tool to create ${target} with a short note.`,
      verdict: evaluatePullCanary,
    },
    line: PULL_LINE,
  },
  assess: {
    // The agent reads, the hook answers, the agent repairs with the edit tools: no shell is given.
    shells: ['none'],
    encodings: ['hook-prose'],
    hookScripts: () => ASSESS_SCRIPTS,
    scripts: ASSESS_SCRIPTS,
    rung1: { command: 'assess', check: checkAssessRung1 },
    probe: { kind: 'hook', script: ASSESS_HOOK, tool: 'Read' },
    settings: ASSESS_SETTINGS,
    delivery: pushDelivery,
    canary: {
      surface: { channel: 'assess', shell: 'none', encoding: 'hook-prose' },
      task: (target) => `Read ${target}, then use the Edit tool to add one short line to it.`,
      verdict: evaluateAssessCanary,
      target: ASSESS_CANARY_TARGET,
    },
    line: undefined,
  },
  'user-turn': {
    shells: ['none'],
    encodings: ['none'],
    hookScripts: () => [],
    scripts: [],
    rung1: { command: 'query', check: checkRung1 },
    probe: undefined,
    settings: undefined,
    delivery: () => undefined,
    canary: undefined,
    line: undefined,
  },
};

export function isDeliveryChannel(value: unknown): value is DeliveryChannel {
  return typeof value === 'string' && Object.hasOwn(CHANNELS, value);
}

/** Whether the shell may write files, the push cell's widening: the coverage hole of the Write matcher. */
export const grantsShellWrites = (shell: ShellScope | undefined): boolean => shell === 'widened';

/** A sentence naming what is wrong with a surface, or undefined when its three fields agree. */
export function incoherentSurface(surface: DeliverySurface): string | undefined {
  const allowed = CHANNELS[surface.channel];
  if (!allowed.shells.includes(surface.shell))
    return `shell ${surface.shell} is not a ${surface.channel} surface (${allowed.shells.join(' or ')})`;
  if (!allowed.encodings.includes(surface.encoding))
    return `encoding ${surface.encoding} is not a ${surface.channel} surface (${allowed.encodings.join(' or ')})`;
  return undefined;
}

/** The tools a session is given: the base set, plus the shell for any surface that grants one. */
export function toolsFor(shell: ShellScope, base: readonly string[]): string[] {
  return shell === 'none' ? [...base] : [...base, 'Bash'];
}

/** The shell permission patterns pre-approved for a session; any other shell command is denied in a headless run. */
export function allowedToolsFor(shell: ShellScope): string[] {
  if (shell === 'none') return [];
  return grantsShellWrites(shell) ? [...QUERY_ALLOWED, ...WRITING_ALLOWED] : [...QUERY_ALLOWED];
}

/** The skill scripts a surface ships into the root: the push hook, the assess hook with its log, or the prose pull command's hook. */
export function hookScriptsFor(surface: DeliverySurface): readonly string[] {
  return CHANNELS[surface.channel].hookScripts(surface);
}

/** Every skill script any channel may ship, each once, in the order the table lists its channels. */
export function allHookScripts(): readonly string[] {
  return [...new Set(Object.values(CHANNELS).flatMap((row) => row.scripts))];
}

/** The constructed instruction-file line a pull surface adds; the committed case supplies its words. */
export function withPullLine(instructions: string, pullLine: string): string {
  return `${instructions.replace(/\n*$/, '\n')}\n${pullLine}\n`;
}
