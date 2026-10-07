// Colocated unit test for creation detection (R0 D6): which tool calls create or edit the target file. A shell
// call counts when its write part targets the file at the target path, as written into the root, and not on the
// strength of a basename, a query command or a file-descriptor duplication.

import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '../../session-stream.ts';
import { creatingCalls, firstCreating, writtenText } from './creation.pure.ts';

const TARGET = 'docs/research/a.md';
const ROOT = '/r';
const shell = (seq: number, command: string): SessionEvent => ({
  seq,
  kind: 'tool-call',
  id: `s${seq}`,
  tool: 'Bash',
  input: { command },
});
const writeTool = (seq: number, content: string): SessionEvent => ({
  seq,
  kind: 'tool-call',
  id: `w${seq}`,
  tool: 'Write',
  input: { file_path: `${ROOT}/${TARGET}`, content },
});
const seqsOf = (command: string): number[] => creatingCalls([shell(1, command)], TARGET, ROOT).map((call) => call.seq);

describe('creatingCalls', () => {
  describe('success cases', () => {
    it('counts a redirect into the target, written relative, with a dot prefix or absolute', () => {
      // ARRANGE
      const commands = [`cat > ${TARGET} <<'EOF'\nx\nEOF`, `echo x > ./${TARGET}`, `printf x >> ${ROOT}/${TARGET}`];
      const expected = [[1], [1], [1]];
      // ACT
      const seen = commands.map(seqsOf);
      // ASSERT
      expect(seen).toEqual(expected);
    });

    it('counts a tee into the target and a redirect with no space before the path', () => {
      // ARRANGE
      const commands = [`echo x | tee ${TARGET}`, `echo x >${TARGET}`, `echo x 2>/dev/null >"${TARGET}"`];
      const expected = [[1], [1], [1]];
      // ACT
      const seen = commands.map(seqsOf);
      // ASSERT
      expect(seen).toEqual(expected);
    });

    it('counts the write part of a compound command that also runs the query', () => {
      // ARRANGE
      const command = `bin/mh query ${TARGET} && cat > ${TARGET} <<'EOF'\nx\nEOF`;
      const expected = [1];
      // ACT
      const seen = seqsOf(command);
      // ASSERT
      expect(seen).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('does not count a write to another directory that shares the basename', () => {
      // ARRANGE
      const command = 'cat > docs/other/a.md <<EOF\nx\nEOF';
      // ACT
      const seen = seqsOf(command);
      // ASSERT
      expect(seen).toEqual([]);
    });

    it('does not count a query whose stderr is duplicated onto stdout', () => {
      // ARRANGE
      const commands = [`bin/mh query ${TARGET} 2>&1`, `bin/mh query ${TARGET} 2>&1 | head`, `echo x >&2 # ${TARGET}`];
      // ACT
      const seen = commands.map(seqsOf);
      // ASSERT
      expect(seen).toEqual([[], [], []]);
    });

    it('does not count a read of the target', () => {
      // ARRANGE
      const command = `cat ${TARGET}`;
      // ACT
      const seen = seqsOf(command);
      // ASSERT
      expect(seen).toEqual([]);
    });

    it('does not count cp or mv, which the widened allow-list denies and so cannot create the file', () => {
      // ARRANGE
      const commands = [`cp /tmp/x ${TARGET}`, `mv /tmp/x ${TARGET}`];
      // ACT
      const seen = commands.map(seqsOf);
      // ASSERT
      expect(seen).toEqual([[], []]);
    });
  });

  describe('edge cases', () => {
    it('keeps a Write tool call and orders a shell creation first by sequence', () => {
      // ARRANGE
      const events = [shell(1, `echo x > ${TARGET}`), writeTool(2, 'y')];
      const expected = [1, 2];
      // ACT
      const seen = creatingCalls(events, TARGET, ROOT).map((call) => call.seq);
      // ASSERT
      expect(seen).toEqual(expected);
    });

    it('reads the first creating call and its written text for a shell call and a tool call', () => {
      // ARRANGE
      const command = `echo x > ${TARGET}`;
      const calls = creatingCalls([shell(1, command), writeTool(2, 'body')], TARGET, ROOT);
      const expected = [1, command, 'body'];
      // ACT
      const seen = [firstCreating(calls)?.seq, writtenText(calls[0]!), writtenText(calls[1]!)];
      // ASSERT
      expect(seen).toEqual(expected);
    });
  });
});
