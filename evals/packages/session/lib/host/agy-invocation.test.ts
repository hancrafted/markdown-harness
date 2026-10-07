// Colocated unit test for the Antigravity (`agy`) argv and environment builders. The flag set is the one R3
// measured working on `agy` 1.3.0; it has not been re-run, so a flag that moved would show only on a live run.

import { describe, expect, it } from 'vitest';
import {
  AGY_ALLOWED_ENVIRONMENT,
  MIN_WALL_CLOCK_MS,
  buildAgyArgv,
  buildAgyEnvironment,
  printTimeoutSeconds,
  wallClockRefusal,
} from './agy-invocation.pure.ts';

const INPUT = { task: 'write a note', model: 'gemini-3.8-flash-low', wallClockMs: 600_000, scopedMode: undefined };

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

    it('skips every permission when no scoped mode was probed, the one working headless write mode R3 measured', () => {
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
    it('passes the probed scoped mode in place of skipping every permission', () => {
      // ARRANGE
      const expected = ['--mode', 'accept-edits'];
      const skipped = '--dangerously-skip-permissions';
      // ACT
      const argv = buildAgyArgv({ ...INPUT, scopedMode: 'accept-edits' });
      // ASSERT
      expect(argv).toEqual(expect.arrayContaining(expected));
      expect(argv).not.toContain(skipped);
    });

    it('passes no scoped mode while none was probed', () => {
      // ARRANGE
      const forbidden = '--mode';
      // ACT
      const argv = buildAgyArgv(INPUT);
      // ASSERT
      expect(argv).not.toContain(forbidden);
    });

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

describe('wallClockRefusal', () => {
  describe('success cases', () => {
    it('lets a bound at the minimum through, and a print timeout stays below it by the margin', () => {
      // ARRANGE
      const expected = { refusal: undefined, margin: 5 };
      // ACT
      const actual = {
        refusal: wallClockRefusal(MIN_WALL_CLOCK_MS),
        margin: MIN_WALL_CLOCK_MS / 1000 - printTimeoutSeconds(MIN_WALL_CLOCK_MS),
      };
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a bound under six seconds, where the print timeout floor of one second leaves no margin', () => {
      // ARRANGE
      const bounds = [1_000, 5_000, 5_999];
      // ACT
      const actual = bounds.map((ms) => wallClockRefusal(ms) !== undefined);
      // ASSERT
      expect(actual).toEqual([true, true, true]);
    });

    it('names the minimum in the refusal', () => {
      // ARRANGE
      const expected = expect.stringContaining(String(MIN_WALL_CLOCK_MS / 1000));
      // ACT
      const actual = wallClockRefusal(3_000);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('keeps the print timeout under the bound for every bound it lets through', () => {
      // ARRANGE
      const bounds = [10_000, 10_001, 12_999, 60_000, 600_000];
      // ACT
      const actual = bounds.map((ms) => printTimeoutSeconds(ms) * 1000 < ms);
      // ASSERT
      expect(actual).toEqual([true, true, true, true, true]);
    });
  });
});

describe('buildAgyEnvironment', () => {
  describe('success cases', () => {
    it('passes a scratch HOME in place of the real one when one is given, and no other variable changes', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/Users/h', LANG: 'C' };
      const expected = { PATH: '/bin', HOME: '/tmp/scratch', LANG: 'C' };
      // ACT
      const child = buildAgyEnvironment(parent, '/tmp/scratch');
      // ASSERT
      expect(child).toEqual(expected);
    });

    it('passes the real HOME when no scratch home is given, because the OAuth token lives under HOME', () => {
      // ARRANGE
      const parent = { PATH: '/bin', HOME: '/Users/h', LANG: 'C', NOT_LISTED: 'x' };
      const expected = { PATH: '/bin', HOME: '/Users/h', LANG: 'C' };
      // ACT
      const child = buildAgyEnvironment(parent, undefined);
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
      const keys = Object.keys(buildAgyEnvironment(parent, undefined));
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
      const keys = Object.keys(buildAgyEnvironment({ PATH: '/bin' }, undefined));
      // ASSERT
      expect(keys).toEqual(expected);
    });
  });
});
