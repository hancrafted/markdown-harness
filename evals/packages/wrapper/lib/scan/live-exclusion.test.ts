// Colocated unit test for the live-script exclusion scanner. It is proved
// non-vacuous: a planted reference goes red, and a real chain reports the known
// gate steps rather than an empty expansion.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { forbiddenNames, scanForLiveScripts } from './live-exclusion.pure.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
function realInput(addedScripts: Record<string, string> = {}) {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  const scripts = { ...manifest.scripts, ...addedScripts };
  const readDirectory = (directory: string) =>
    readdirSync(join(ROOT, directory))
      .filter((name) => /\.ya?ml$|^pre-|^commit-msg$/.test(name))
      .map((name) => [`${directory}/${name}`, readFileSync(join(ROOT, directory, name), 'utf8')] as const);
  return {
    scripts,
    gateScripts: ['verify', 'verify:commit'],
    workflows: Object.fromEntries([...readDirectory('.github/workflows'), ...readDirectory('.husky')]),
    forbidden: forbiddenNames(scripts),
  };
}

const SCRIPTS = {
  verify: 'archgate check && npm run lint:boundaries && vitest run',
  'verify:commit': 'lint-staged && npm run verify',
  'lint:boundaries': 'depcruise src evals',
  'evals:live': 'node evals/live.ts',
  'evals:self-test': 'npx promptfoo@0.124.0 eval',
};
const FORBIDDEN = ['evals:live', 'evals:self-test', 'promptfoo', 'claude -p', 'agy -p'];
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

describe('forbiddenNames', () => {
  describe('success cases', () => {
    it('names every evals script, the entry file each runs, the eval tool and a Host harness invocation', () => {
      // ARRANGE
      const scripts = {
        verify: 'vitest run',
        'evals:x': 'node evals/packages/x/run-x.ts --flag',
        'evals:y': 'npx tool',
      };
      const expected = ['evals:x', 'evals:y', 'run-x', 'promptfoo', 'claude -p', 'agy -p'];
      // ACT
      const actual = forbiddenNames(scripts);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('goes red on the real repository once a new evals script is planted in the verify chain', () => {
      // ARRANGE
      const added = { 'evals:x': 'node evals/packages/x/run-x.ts' };
      const input = realInput(added);
      const planted = { ...input, scripts: { ...input.scripts, verify: `${input.scripts.verify} && npm run evals:x` } };
      const expected = 'the gate chain reaches evals:x';
      // ACT
      const report = scanForLiveScripts(planted);
      // ASSERT
      expect(report.violations).toContain(expected);
    });
  });

  describe('failure cases', () => {
    it('does not name a script that only mentions evals in its command', () => {
      // ARRANGE
      const scripts = { 'lint:boundaries': 'depcruise src evals' };
      const notExpected = 'lint:boundaries';
      // ACT
      const actual = forbiddenNames(scripts);
      // ASSERT
      expect(actual).not.toContain(notExpected);
    });
  });

  describe('edge cases', () => {
    it('names only the eval tool and the Host harness invocation when no script is an evals script', () => {
      // ARRANGE
      const expected = ['promptfoo', 'claude -p', 'agy -p'];
      // ACT
      const actual = forbiddenNames({ verify: 'vitest run' });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});

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

    it('finds no live or self-test script in the verify chain, the commit chain, the workflows or the hooks, over a non-empty chain', () => {
      // ARRANGE
      const expectedChain = ['verify', 'verify:commit', 'lint:boundaries', 'build'];
      // ACT
      const report = scanForLiveScripts(realInput());
      // ASSERT
      expect(report.violations).toEqual([]);
      expect(report.chain).toEqual(expect.arrayContaining(expectedChain));
    });

    it('goes red on the real repository once the live Antigravity script is planted in the verify chain', () => {
      // ARRANGE
      const input = realInput();
      const planted = {
        ...input,
        scripts: { ...input.scripts, verify: `${input.scripts.verify} && npm run evals:agy` },
      };
      const expected = 'the gate chain reaches evals:agy';
      // ACT
      const report = scanForLiveScripts(planted);
      // ASSERT
      expect(report.violations).toContain(expected);
    });

    it('knows the live Antigravity script by name, so the scanner covers it before anyone can plant it', () => {
      // ARRANGE
      const expected = 'evals:agy';
      // ACT
      const actual = realInput().forbidden;
      // ASSERT
      expect(actual).toContain(expected);
    });

    it('goes red on the real repository once a live script is planted in the verify chain', () => {
      // ARRANGE
      const input = realInput();
      const planted = {
        ...input,
        scripts: { ...input.scripts, verify: `${input.scripts.verify} && npm run evals:live` },
      };
      const expected = 'the gate chain reaches evals:live';
      // ACT
      const report = scanForLiveScripts(planted);
      // ASSERT
      expect(report.violations).toContain(expected);
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
        '.github/workflows/ci.yml':
          'steps:\n  - run: npx promptfoo@1 eval\n  - run: claude -p "hi"\n  - run: /opt/homebrew/bin/agy -p "hi"\n',
      };
      const expected = [
        '.github/workflows/ci.yml names promptfoo',
        '.github/workflows/ci.yml names claude -p',
        '.github/workflows/ci.yml names agy -p',
      ];
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
