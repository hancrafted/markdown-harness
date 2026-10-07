// Colocated unit test for what each probe asks of one minimal session and what it plants in the workspace.

import { describe, expect, it } from 'vitest';
import { CANDIDATE_MODE, HOOKS_JSON, HOOK_SCRIPT, NOTE_PATH, SENTINEL, probeTask } from './probe-task.pure.ts';

describe('probeTask', () => {
  describe('success cases', () => {
    it('asks the two writing probes to create one file at the path the verdict looks for', () => {
      // ARRANGE
      const probes = ['hook-fires-headless', 'scoped-permission-mode'] as const;
      // ACT
      const tasks = probes.map(probeTask);
      // ASSERT
      for (const task of tasks) expect(task).toContain(NOTE_PATH);
    });

    it('asks the credential probe a question that needs no tool, so only authentication is measured', () => {
      // ARRANGE
      const forbidden = NOTE_PATH;
      // ACT
      const task = probeTask('scratch-home-credentials');
      // ASSERT
      expect(task).not.toContain(forbidden);
      expect(task).toMatch(/no tool/i);
    });
  });

  describe('failure cases', () => {
    it('plants a hook that writes a sentinel file beside hooks.json, the evidence a silent stream cannot give', () => {
      // ARRANGE
      const expected = SENTINEL;
      // ACT
      const script = HOOK_SCRIPT;
      // ASSERT
      expect(script).toContain(expected);
    });

    it('registers the hook for the write tool under PreToolUse, from R3 reading of the embedded guide', () => {
      // ARRANGE
      const expected = { PreToolUse: [{ matcher: 'write_to_file' }] };
      const handler = 'hook.mjs';
      // ACT
      const config = JSON.parse(HOOKS_JSON) as { PreToolUse: { matcher: string; hooks: { command: string }[] }[] };
      // ASSERT
      expect(config).toMatchObject(expected);
      expect(config.PreToolUse[0]?.hooks[0]?.command).toContain(handler);
    });
  });

  describe('edge cases', () => {
    it('tries one candidate mode, the one R3 named and left unexercised', () => {
      // ARRANGE
      const expected = 'accept-edits';
      // ACT
      const actual = CANDIDATE_MODE;
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});
