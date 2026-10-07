// Colocated unit test for the Antigravity (`agy`) argv and environment builders. The flag set is the one R3
// measured working on `agy` 1.3.0; it has not been re-run, so a flag that moved would show only on a live run.

import { describe, expect, it } from 'vitest';
import {
  AGY_ALLOWED_ENVIRONMENT,
  buildAgyArgv,
  buildAgyEnvironment,
  printTimeoutSeconds,
} from './agy-invocation.pure.ts';

const INPUT = { task: 'write a note', model: 'gemini-3.8-flash-low', wallClockMs: 600_000 };

describe('buildAgyArgv', () => {
  describe('success cases', () => {
    it('asks for one headless prompt with streamed JSON and an explicit model', () => {
      // ARRANGE
      const expected = ['-p', INPUT.task, '--output-format', 'stream-json', '--model', 'gemini-3.8-flash-low'];
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      expect(argv.slice(0, expected.length)).toEqual(expected);
    });

    it('skips every permission, the one working headless write mode R3 measured', () => {
      // ARRANGE
      const expected = '--dangerously-skip-permissions';
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      expect(argv).toContain(expected);
    });

    it('bounds the session by a print timeout shorter than the wall clock, so agy stops itself first', () => {
      // ARRANGE
      const expected = ['--print-timeout', '595s'];
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      expect(argv.slice(-expected.length)).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('passes no turn cap flag, because agy has none', () => {
      // ARRANGE
      const forbidden = ['--max-turns', '--max-budget-usd'];
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      for (const flag of forbidden) expect(argv).not.toContain(flag);
    });

    it('never reaches for the authentication or gateway modes R3 put out of scope', () => {
      // ARRANGE
      const forbidden = ['--sandbox', '--conversation', '--continue', '--project', '--add-dir'];
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      for (const flag of forbidden) expect(argv).not.toContain(flag);
    });
  });

  describe('edge cases', () => {
    it('keeps a task that starts with a dash from being read as a flag by passing it as the -p value', () => {
      // ARRANGE
      const expected = ['-p', '--help me'];
      // ACT
      const argv = buildAgyArgv({ ...INPUT, task: '--help me' });
      // ASSERT
      expect(argv.slice(0, expected.length)).toEqual(expected);
    });
  });
});

describe('printTimeoutSeconds', () => {
  describe('success cases', () => {
    it('leaves five seconds for the process to be killed after agy stops itself', () => {
      // ARRANGE
      const expected = 55;
      // ACT
      const actual = printTimeoutSeconds(60_000);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('failure cases', () => {
    it('never returns zero, which agy reads as wait forever', () => {
      // ARRANGE
      const expected = 1;
      // ACT
      const actual = printTimeoutSeconds(3_000);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('rounds a fractional second down', () => {
      // ARRANGE
      const expected = 6;
      // ACT
      const actual = printTimeoutSeconds(11_900);
      // ASSERT
      expect(actual).toBe(expected);
    });
  });
});

describe('buildAgyEnvironment', () => {
  describe('success cases', () => {
    it('passes the real HOME, because a scratch HOME is an unprobed capability and the OAuth token lives under HOME', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/Users/h', LANG: 'C', NOT_LISTED: 'x' };
      const expected = { PATH: '/bin', HOME: '/Users/h', LANG: 'C' };
      // ACT
      const child = buildAgyEnvironment(parent);
      // ASSERT
      expect(child).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('drops the gateway key, the ADC switch, and every Anthropic and Gemini key', () => {
      // ARRANGE
      const parent = {
        PATH: '/bin',
        AGY_LLM_GATEWAY_API_KEY: 'k',
        AGY_ADC_AUTH: '1',
        GEMINI_API_KEY: 'g',
        GOOGLE_API_KEY: 'g',
        ANTHROPIC_API_KEY: 'a',
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:8787',
      };
      const forbidden = Object.keys(parent).filter((name) => name !== 'PATH');
      // ACT
      const keys = Object.keys(buildAgyEnvironment(parent));
      // ASSERT
      for (const name of forbidden) expect(keys).not.toContain(name);
    });

    it('keeps the allow-list free of any API-key variable', () => {
      // ARRANGE
      const keyed = AGY_ALLOWED_ENVIRONMENT.filter((name) => /KEY|TOKEN|SECRET|ADC/.test(name));
      // ACT
      const actual = keyed;
      // ASSERT
      expect(actual).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('omits an allow-listed variable the parent does not have, rather than setting it empty', () => {
      // ARRANGE
      const expected = ['PATH'];
      // ACT
      const keys = Object.keys(buildAgyEnvironment({ PATH: '/bin' }));
      // ASSERT
      expect(keys).toEqual(expected);
    });
  });
});
