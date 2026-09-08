import { describe, expect, it } from 'vitest';
import { unreadableGovernedFile } from './unreadable-file.pure.ts';

/** What the OTHER exit-2 flavour puts on this channel. */
const USAGE_LEAD = 'usage: mh';

/** Every refusal this command writes to stderr names the command first. */
const PREFIX = 'mh: ';

describe('unreadableGovernedFile', () => {
  describe('success cases', () => {
    it('names the path that would not open', () => {
      // ARRANGE
      const path = 'docs/reference/api-limits.md';
      // ACT
      const refusal = unreadableGovernedFile(path);
      // ASSERT
      expect(refusal).toContain(path);
    });

    it('leads with the command, the way the runtime floor does', () => {
      // ARRANGE
      const path = 'docs/note.md';
      // ACT
      const refusal = unreadableGovernedFile(path);
      // ASSERT
      expect(refusal.startsWith(PREFIX)).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('is not the usage text, which is the whole point of it existing', () => {
      // The two exit-2 flavours are told apart by what the channel says. A
      // refusal that carried the synopsis would be the defect this replaces.
      // ARRANGE
      const path = 'docs/note.md';
      // ACT
      const refusal = unreadableGovernedFile(path);
      // ASSERT
      expect(refusal).not.toContain(USAGE_LEAD);
    });
  });

  describe('edge cases', () => {
    it('says why refusing beats reporting, not only that it refused', () => {
      // A sentence naming a file and nothing else leaves the Operator to guess
      // whether the tool gave up or found the file wrong.
      // ARRANGE
      const path = 'docs/note.md';
      const reason = 'would read as a clean one';
      // ACT
      const refusal = unreadableGovernedFile(path);
      // ASSERT
      expect(refusal).toContain(reason);
    });

    it('ends with a newline, so a terminal prompt starts on its own line', () => {
      // ARRANGE
      const path = 'docs/note.md';
      const ending = '\n';
      // ACT
      const refusal = unreadableGovernedFile(path);
      // ASSERT
      expect(refusal.endsWith(ending)).toBe(true);
    });
  });
});
