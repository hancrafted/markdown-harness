// Colocated unit test for the argv and environment builders. The environment is an
// allow-list, so the proxy base URL, an API key and the parent session's variables
// never reach the Host harness child.

import { describe, expect, it } from 'vitest';
import { ALLOWED_ENVIRONMENT, buildChildEnvironment, buildClaudeArgv } from './host-invocation.pure.ts';

const INPUT = { task: 'write a note', model: 'sonnet', maxTurns: 6, tools: ['Read', 'Write'], allowedTools: [] };

describe('buildClaudeArgv', () => {
  describe('success cases', () => {
    it('asks for headless streamed JSON with hook events and project-only settings', () => {
      // ARRANGE
      const expected = [
        '-p',
        INPUT.task,
        '--output-format',
        'stream-json',
        '--verbose',
        '--include-hook-events',
        '--setting-sources',
        'project',
        '--strict-mcp-config',
        '--disable-slash-commands',
      ];
      // ACT
      const argv = buildClaudeArgv(INPUT);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });

    it('sets an explicit model, a turn cap, no session persistence and accept-edits mode', () => {
      // ARRANGE
      const expected = [
        '--model',
        'sonnet',
        '--max-turns',
        '6',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
      ];
      // ACT
      const argv = buildClaudeArgv(INPUT);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });

    it('passes each pre-approved shell pattern as its own value after the allow-list flag, and the shell in the tool set', () => {
      // ARRANGE
      const input = {
        ...INPUT,
        tools: ['Read', 'Bash'],
        allowedTools: ['Bash(bin/mh query:*)', 'Bash(./bin/mh query:*)'],
      };
      const expected = ['--tools', 'Read,Bash', '--allowedTools', 'Bash(bin/mh query:*)', 'Bash(./bin/mh query:*)'];
      // ACT
      const argv = buildClaudeArgv(input);
      // ASSERT
      expect(argv.slice(-expected.length)).toEqual(expected);
    });

    it('lists exactly the tools the session may use', () => {
      // ARRANGE
      const expected = ['--tools', 'Read,Write'];
      // ACT
      const argv = buildClaudeArgv(INPUT);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });
  });

  describe('failure cases', () => {
    it('adds no allow-list flag when no shell command is pre-approved, so a session with no shell has none to widen', () => {
      // ARRANGE
      const forbidden = '--allowedTools';
      // ACT
      const argv = buildClaudeArgv(INPUT);
      // ASSERT
      expect(argv).not.toContain(forbidden);
    });

    it('never offers a dangerous permission bypass', () => {
      // ARRANGE
      const forbidden = '--dangerously-skip-permissions';
      // ACT
      const argv = buildClaudeArgv(INPUT);
      // ASSERT
      expect(argv).not.toContain(forbidden);
    });
  });

  describe('edge cases', () => {
    it('keeps a task that starts with a dash from being read as a flag by passing it as the -p value', () => {
      // ARRANGE
      const task = '--help me';
      const expected = ['-p', task];
      // ACT
      const argv = buildClaudeArgv({ ...INPUT, task });
      // ASSERT
      expect(argv.slice(0, expected.length)).toEqual(expected);
    });
  });
});

describe('buildChildEnvironment', () => {
  describe('success cases', () => {
    it('passes only the allow-listed variables and switches auto-memory off', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/h', LANG: 'C', TERM: 'xterm', NOT_LISTED: 'x' };
      const expected = { PATH: '/bin', HOME: '/h', LANG: 'C', TERM: 'xterm', CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };
      // ACT
      const child = buildChildEnvironment(parent);
      // ASSERT
      expect(child).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('drops the proxy base URL, an API key and the parent session variables', () => {
      // ARRANGE
      const parent = {
        PATH: '/bin',
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:8787',
        ANTHROPIC_API_KEY: 'k',
        CLAUDE_CODE_EXECPATH: '/x',
        CLAUDE_CODE_SUBAGENT_MODEL: 'm',
      };
      const forbidden = [
        'ANTHROPIC_BASE_URL',
        'ANTHROPIC_API_KEY',
        'CLAUDE_CODE_EXECPATH',
        'CLAUDE_CODE_SUBAGENT_MODEL',
      ];
      // ACT
      const keys = Object.keys(buildChildEnvironment(parent));
      // ASSERT
      for (const name of forbidden) expect(keys).not.toContain(name);
    });
  });

  describe('edge cases', () => {
    it('omits an allow-listed variable the parent does not have, rather than setting it empty', () => {
      // ARRANGE
      const parent = { PATH: '/bin' };
      const expected = ['PATH'];
      // ACT
      const keys = Object.keys(buildChildEnvironment(parent));
      // ASSERT
      expect(keys.filter((key) => ALLOWED_ENVIRONMENT.includes(key))).toEqual(expected);
    });
  });
});
