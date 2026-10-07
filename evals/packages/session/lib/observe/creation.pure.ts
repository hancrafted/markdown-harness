// The calls that create or edit the target file. A file created through the shell
// counts if it is the file at the target path (R0 D6): a Bash call is a creating
// call when its command names the target file and writes with a redirect, `tee`,
// `cp` or `mv`. The query command is never one, though it names a path.

import type { SessionEvent } from '../stream/session-stream.types.ts';
import type { ToolCall } from './session-observation.types.ts';

const WRITING_TOOLS = ['Write', 'Edit', 'MultiEdit'];
const SHELL_WRITE = /(>|\btee\b|\bcp\b|\bmv\b)/;
const QUERY_COMMAND = /\bmh query\b/;

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** The command of a shell call, or an empty string for any other call. */
export function commandOf(call: ToolCall): string {
  return call.tool === 'Bash' && typeof call.input.command === 'string' ? call.input.command : '';
}

function shellCreates(call: ToolCall, targetPath: string): boolean {
  const command = commandOf(call);
  return command.includes(baseName(targetPath)) && SHELL_WRITE.test(command) && !QUERY_COMMAND.test(command);
}

export function creatingCalls(events: readonly SessionEvent[], targetPath: string): ToolCall[] {
  return events.filter(
    (event): event is ToolCall =>
      event.kind === 'tool-call' && (WRITING_TOOLS.includes(event.tool) || shellCreates(event, targetPath)),
  );
}

/** Everything a creating call wrote: file content and edits for a tool, the whole command for a shell call. */
export function writtenText(call: ToolCall): string {
  if (call.tool === 'Bash') return commandOf(call);
  const input = call.input;
  const edits = Array.isArray(input.edits) ? input.edits.map((edit: { new_string?: unknown }) => edit.new_string) : [];
  return [input.content, input.new_string, input.new_str, ...edits]
    .filter((part): part is string => typeof part === 'string')
    .join('\n');
}

/** The first call that creates the file: a Write or a shell creation, before any edit. */
export function firstCreating(calls: readonly ToolCall[]): ToolCall | undefined {
  return calls.find((call) => call.tool === 'Write' || call.tool === 'Bash') ?? calls[0];
}
