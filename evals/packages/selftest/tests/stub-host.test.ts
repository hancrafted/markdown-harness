// Integration suite for how the stand-in decides which Host harness's stream to print. It is told by an explicit
// `--stub-host` flag. An argv holding `--print-timeout` is Antigravity's own flag and must not be a signal: the
// first test below goes red if the stand-in goes back to sniffing it. Every session here is a question with no file
// to write, so nothing is created in the working directory.

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { nodeExecutable } from '../../platform/host-ambient.ts';
import { runProcess } from '../../platform/host-process.ts';

const STUB = join(resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), 'evals/self-test/stub-host.mjs');

function firstLine(extra: readonly string[]): string {
  const report = runProcess({
    command: nodeExecutable(),
    args: [STUB, ...extra, '-p', 'Reply with the single word ok.', '--tools', ''],
    cwd: resolve(dirname(fileURLToPath(import.meta.url))),
    env: { PATH: process.env.PATH ?? '' },
    timeoutMs: 20_000,
  });
  return report.stdout.split('\n')[0] ?? '';
}

describe('the stand-in host', () => {
  describe('success cases', () => {
    it('prints the Antigravity stream when told --stub-host agy', () => {
      // ARRANGE
      const expected = { event: 'init' };
      // ACT
      const actual = JSON.parse(firstLine(['--stub-host', 'agy', '--print-timeout', '5s'])) as object;
      // ASSERT
      expect(actual).toMatchObject(expected);
    });

    it('prints the Claude Code stream when told --stub-host claude', () => {
      // ARRANGE
      const expected = { type: 'system', subtype: 'init' };
      // ACT
      const actual = JSON.parse(firstLine(['--stub-host', 'claude'])) as object;
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('failure cases', () => {
    it('does not read --print-timeout as a signal to print the Antigravity stream', () => {
      // ARRANGE
      const expected = { type: 'system', subtype: 'init' };
      // ACT
      const actual = JSON.parse(firstLine(['--print-timeout', '5s'])) as object;
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });

  describe('edge cases', () => {
    it('defaults to the Claude Code stream when no Host harness is named, which the pre-screen relies on', () => {
      // ARRANGE
      const expected = { type: 'system' };
      // ACT
      const actual = JSON.parse(firstLine([])) as object;
      // ASSERT
      expect(actual).toMatchObject(expected);
    });
  });
});
