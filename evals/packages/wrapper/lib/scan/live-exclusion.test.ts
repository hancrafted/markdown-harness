// Colocated unit test for the live-script exclusion scanner. It is proved
// non-vacuous: a planted reference goes red, and a real chain reports the known
// gate steps rather than an empty expansion.

import { describe, expect, it } from 'vitest';
import { scanForLiveScripts } from './live-exclusion.pure.ts';

const SCRIPTS = {
  verify: 'archgate check && npm run lint:boundaries && vitest run',
  'verify:commit': 'lint-staged && npm run verify',
  'lint:boundaries': 'depcruise src evals',
  'evals:live': 'node evals/live.ts',
  'evals:self-test': 'npx promptfoo@0.124.0 eval',
};
const FORBIDDEN = ['evals:live', 'evals:self-test', 'promptfoo', 'claude -p'];
const WORKFLOW = {
  '.github/workflows/ci.yml':
    'steps:\n  - run: npx archgate check\n  - run: npm run lint:boundaries\n  - run: npm test\n',
};

function scan(overrides: object = {}) {
  return scanForLiveScripts({
    scripts: SCRIPTS,
    gateScripts: ['verify', 'verify:commit'],
    workflows: WORKFLOW,
    forbidden: FORBIDDEN,
    ...overrides,
  });
}

describe('scanForLiveScripts', () => {
  describe('success cases', () => {
    it('passes a clean tree and reports the known gate steps it expanded', () => {
      // ARRANGE
      const expectedChain = ['verify', 'lint:boundaries', 'verify:commit'];
      // ACT
      const report = scan();
      // ASSERT
      expect(report.violations).toEqual([]);
      expect(report.chain).toEqual(expect.arrayContaining(expectedChain));
    });
  });

  describe('failure cases', () => {
    it('goes red when a gate chain invokes a live script, directly or through another script', () => {
      // ARRANGE
      const planted = { ...SCRIPTS, 'lint:boundaries': 'depcruise src evals && npm run evals:live' };
      const expected = 'the gate chain reaches evals:live';
      // ACT
      const report = scan({ scripts: planted });
      // ASSERT
      expect(report.violations).toContain(expected);
    });

    it('goes red when a workflow names the eval tool or a Host harness invocation', () => {
      // ARRANGE
      const workflows = {
        '.github/workflows/ci.yml': 'steps:\n  - run: npx promptfoo@1 eval\n  - run: claude -p "hi"\n',
      };
      const expected = ['.github/workflows/ci.yml names promptfoo', '.github/workflows/ci.yml names claude -p'];
      // ACT
      const report = scan({ workflows });
      // ASSERT
      expect(report.violations).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reports an empty chain as a violation, because a scan that read nothing proves nothing', () => {
      // ARRANGE
      const expected = ['the scan read nothing: no gate script expanded'];
      // ACT
      const report = scan({ gateScripts: ['no-such-script'], workflows: {} });
      // ASSERT
      expect(report.violations).toEqual(expected);
    });

    it('does not follow a script into a cycle forever', () => {
      // ARRANGE
      const cyclic = { verify: 'npm run a', a: 'npm run verify' };
      const expected = ['verify', 'a'];
      // ACT
      const report = scan({ scripts: cyclic, gateScripts: ['verify'], workflows: {} });
      // ASSERT
      expect(report.chain).toEqual(expected);
    });
  });
});
