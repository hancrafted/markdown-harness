// Colocated unit test for the eval tool's pin and neutralised hazards.

import { describe, expect, it } from 'vitest';
import { PROMPTFOO_VERSION, toolArgv, toolEnvironment } from './eval-tool.pure.ts';

const SETTINGS = {
  configPath: 'evals/promptfooconfig.yaml',
  trials: 8,
  resultsPath: 'out/results.json',
  concurrency: 1,
  cache: false,
};

describe('toolArgv', () => {
  describe('success cases', () => {
    it('pins the exact version through npx and switches the cache off, concurrency to one', () => {
      // ARRANGE
      const expected = ['-y', `promptfoo@${PROMPTFOO_VERSION}`, 'eval', '--no-cache', '--max-concurrency', '1'];
      // ACT
      const argv = toolArgv(SETTINGS);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });

    it('asks for the repeat count and writes the results where the wrapper will read them', () => {
      // ARRANGE
      const expected = ['--repeat', '8', '-o', 'out/results.json'];
      // ACT
      const argv = toolArgv(SETTINGS);
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
    });

    it('lets a self-test break turn the cache on and raise the concurrency, and nothing else', () => {
      // ARRANGE
      const expected = ['--max-concurrency', '4'];
      const cacheOffFlag = '--no-cache';
      // ACT
      const broken = toolArgv({ ...SETTINGS, concurrency: 4, cache: true });
      // ASSERT
      expect(broken).toEqual(expect.arrayContaining(expected));
      expect(broken).not.toContain(cacheOffFlag);
    });
  });

  describe('failure cases', () => {
    it('never leaves the version floating', () => {
      // ARRANGE
      const floating = /promptfoo(@latest)?$/;
      // ACT
      const argv = toolArgv(SETTINGS);
      // ASSERT
      expect(argv.filter((part) => floating.test(part))).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('pins a dotted exact version, not a range', () => {
      // ARRANGE
      const exact = /^\d+\.\d+\.\d+$/;
      // ACT
      const actual = PROMPTFOO_VERSION;
      // ASSERT
      expect(actual).toMatch(exact);
    });
  });
});

describe('toolEnvironment', () => {
  describe('success cases', () => {
    it('relocates the tool state and switches telemetry, the update check, sharing and the cache off', () => {
      // ARRANGE
      const expected = {
        PROMPTFOO_CONFIG_DIR: '/s',
        PROMPTFOO_DISABLE_TELEMETRY: '1',
        PROMPTFOO_DISABLE_UPDATE: '1',
        PROMPTFOO_DISABLE_SHARING: '1',
        PROMPTFOO_CACHE_ENABLED: 'false',
      };
      // ACT
      const env = toolEnvironment({ PATH: '/bin' }, '/s');
      // ASSERT
      expect(env).toMatchObject(expected);
    });

    it('turns the cache variable on only when a self-test break asks for it', () => {
      // ARRANGE
      const expected = 'true';
      // ACT
      const env = toolEnvironment({}, '/s', true);
      // ASSERT
      expect(env.PROMPTFOO_CACHE_ENABLED).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('passes no key, proxy URL or parent session variable to the tool', () => {
      // ARRANGE
      const parent = {
        PATH: '/bin',
        ANTHROPIC_API_KEY: 'k',
        ANTHROPIC_BASE_URL: 'http://x',
        CLAUDE_CODE_EXECPATH: '/y',
      };
      const forbidden = ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_EXECPATH'];
      // ACT
      const keys = Object.keys(toolEnvironment(parent, '/s'));
      // ASSERT
      for (const name of forbidden) expect(keys).not.toContain(name);
    });
  });

  describe('edge cases', () => {
    it('neutralises the tool exit code, though the wrapper ignores it anyway', () => {
      // ARRANGE
      const expected = '0';
      // ACT
      const env = toolEnvironment({}, '/s');
      // ASSERT
      expect(env.PROMPTFOO_FAILED_TEST_EXIT_CODE).toBe(expected);
    });
  });
});
