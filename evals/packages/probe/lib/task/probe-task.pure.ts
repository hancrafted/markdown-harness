// What each probe asks of its one minimal session, and what the hook probe plants in the workspace. The hooks.json
// shape is R3's reading of the embedded guide (`PreToolUse`, a matcher regex over the tool name, a command handler
// run from the directory holding hooks.json); it was never run, so a hook probe that fails may mean the shape is
// wrong, and its recorded detail says so.

import type { ProbeId } from '../../../session/host-profile.ts';

/** Where the writing probes ask for a file, relative to the workspace. */
export const NOTE_PATH = 'docs/research/probe-note.md';

/** The file the planted hook handler writes beside hooks.json when it runs. */
export const SENTINEL = 'hook-fired.txt';

/** The one candidate the scoped permission probe tries: R3 named it and did not exercise it. */
export const CANDIDATE_MODE = 'accept-edits';

export const HOOKS_JSON = `${JSON.stringify(
  { PreToolUse: [{ matcher: 'write_to_file', hooks: [{ type: 'command', command: 'node hook.mjs' }] }] },
  null,
  2,
)}\n`;

export const HOOK_SCRIPT = `import { writeFileSync } from 'node:fs';
writeFileSync('${SENTINEL}', 'fired\\n');
process.stdout.write('{}\\n');
`;

export function probeTask(probe: ProbeId): string {
  if (probe === 'scratch-home-credentials') return 'Reply with the single word ok. Use no tool.';
  return `Create the file ${NOTE_PATH} containing one line of text, then stop.`;
}
