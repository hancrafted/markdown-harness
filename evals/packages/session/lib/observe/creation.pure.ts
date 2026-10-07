// The calls that create or edit the target file. A file created through the shell counts if it is the file at
// the target path (R0 D6): a Bash call is a creating call when one segment of its command writes to that path as
// written into the root, relative, dot-prefixed or absolute, with an output redirect or `tee`. A basename match
// is not enough, a file-descriptor duplication (`2>&1`) is not a write, and a query command in another segment of
// the same compound command does not hide the write part.
//
// `cp` and `mv` are deliberately not detected: the widened shell's allow-list (delivery-surface.pure.ts) holds
// `cat`, `tee`, `printf`, `echo` and `mkdir` and not `cp` or `mv`, so a headless run denies them and neither can
// create the file. Detection follows the allow-list.

import type { SessionEvent } from '../stream/session-stream.types.ts';
import type { ToolCall } from './session-observation.types.ts';

const WRITING_TOOLS = ['Write', 'Edit', 'MultiEdit'];
const SEGMENT_BREAK = /&&|\|\||[;|]/;
const WORD = /"[^"]*"|'[^']*'|\S+/g;
// A word that is only an output redirect (`>`, `>>`, `2>`, `&>`), whose target is the next word.
const REDIRECT_ONLY = /^(?:\d*|&)>>?$/;
// A word that is a redirect glued to its target (`>file`, `2>>file`); a target starting with `&` is a duplication.
const REDIRECT_GLUED = /^(?:\d*|&)>>?([^&].*)$/;

const unquoted = (word: string): string => word.replace(/^(["'])(.*)\1$/, '$2');

/** The command of a shell call, or an empty string for any other call. */
export function commandOf(call: ToolCall): string {
  return call.tool === 'Bash' && typeof call.input.command === 'string' ? call.input.command : '';
}

/** The paths one command segment writes to: each output redirect's target, and each file argument of `tee`. */
function writtenPaths(segment: string): string[] {
  const words = segment.match(WORD) ?? [];
  const paths: string[] = [];
  words.forEach((word, index) => {
    const next = words[index + 1];
    const glued = REDIRECT_GLUED.exec(word)?.[1];
    if (REDIRECT_ONLY.test(word) && next !== undefined && !next.startsWith('&')) paths.push(unquoted(next));
    else if (glued !== undefined) paths.push(unquoted(glued));
    else if (word === 'tee')
      paths.push(
        ...words
          .slice(index + 1)
          .filter((arg) => !arg.startsWith('-'))
          .map(unquoted),
      );
  });
  return paths;
}

function shellCreates(call: ToolCall, targetPath: string, root: string): boolean {
  const spellings = [targetPath, `./${targetPath}`, `${root}/${targetPath}`];
  return commandOf(call)
    .split(SEGMENT_BREAK)
    .some((segment) => writtenPaths(segment).some((path) => spellings.includes(path)));
}

export function creatingCalls(events: readonly SessionEvent[], targetPath: string, root: string): ToolCall[] {
  return events.filter(
    (event): event is ToolCall =>
      event.kind === 'tool-call' && (WRITING_TOOLS.includes(event.tool) || shellCreates(event, targetPath, root)),
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
