// Colocated unit test for the path closure, shown red in both directions by
// deleting one reference and by naming one path that does not exist.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { transcriptionGuardHits } from '../../../arms/steering-markers.ts';
import { closureOf, isPackageRoot, namedRoots } from './path-closure.pure.ts';

const EVALS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const TOOL_INVOKED = ['adapters', 'wrapper', 'selftest'];
const realConfig = () => readFileSync(join(EVALS, 'promptfooconfig.yaml'), 'utf8');

function realRoots(): string[] {
  return TOOL_INVOKED.flatMap((name) =>
    readdirSync(join(EVALS, 'packages', name))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => `packages/${name}/${file}`),
  );
}

function realScripts(): string[] {
  const manifest = JSON.parse(readFileSync(join(EVALS, '..', 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  return Object.values(manifest.scripts);
}

function suiteFiles(directory: string): { path: string; text: string }[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? suiteFiles(full) : [{ path: full, text: readFileSync(full, 'utf8') }];
  });
}

const CONFIG =
  '- id: file://packages/adapters/claude-provider.ts\n- value: file://packages/adapters/steering-assertion.ts:gradeSteering\n- tests: file://suites/steering/cases/a.yaml\n';
const SCRIPTS = ['node evals/packages/wrapper/run-evals.ts --host claude'];
const ROOTS = [
  'packages/adapters/claude-provider.ts',
  'packages/adapters/steering-assertion.ts',
  'packages/wrapper/run-evals.ts',
];

describe('path closure', () => {
  describe('success cases', () => {
    it('every path the committed configuration names resolves to a Package root, and every tool-invoked root is named', () => {
      // ARRANGE
      const expected = { unresolved: [], unreferenced: [] };
      // ACT
      const actual = closureOf(namedRoots(realConfig(), realScripts()), realRoots());
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('is closed when every named path is a root and every root is named', () => {
      // ARRANGE
      const expected = { unresolved: [], unreferenced: [] };
      // ACT
      const actual = closureOf(namedRoots(CONFIG, SCRIPTS), ROOTS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a path with a function name after it, and ignores a data file that is not a root', () => {
      // ARRANGE
      const expected = [
        'packages/adapters/claude-provider.ts',
        'packages/adapters/steering-assertion.ts',
        'packages/wrapper/run-evals.ts',
      ];
      // ACT
      const actual = namedRoots(CONFIG, SCRIPTS);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('goes red on the real configuration with one reference deleted', () => {
      // ARRANGE
      const config = realConfig().split('steering-assertion').join('gone');
      const expected = ['packages/adapters/steering-assertion.ts'];
      // ACT
      const actual = closureOf(namedRoots(config, realScripts()), realRoots()).unreferenced;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('goes red when one reference is deleted: its root is left unreferenced', () => {
      // ARRANGE
      const without = CONFIG.split('\n')
        .filter((line) => !line.includes('steering-assertion'))
        .join('\n');
      const expected = ['packages/adapters/steering-assertion.ts'];
      // ACT
      const actual = closureOf(namedRoots(without, SCRIPTS), ROOTS);
      // ASSERT
      expect(actual.unreferenced).toEqual(expected);
    });

    it('goes red when a named path does not exist, or is not a Package root', () => {
      // ARRANGE
      const config = `${CONFIG}- id: file://packages/adapters/lib/deep.ts\n- id: file://packages/adapters/missing.ts\n`;
      const expected = ['packages/adapters/lib/deep.ts', 'packages/adapters/missing.ts'];
      // ACT
      const actual = closureOf(namedRoots(config, SCRIPTS), ROOTS);
      // ASSERT
      expect(actual.unresolved).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds no steering-marker-shaped string in any committed suite file, over a non-empty scan', () => {
      // ARRANGE
      const files = suiteFiles(join(EVALS, 'suites'));
      const floor = 3;
      // ACT
      const hits = transcriptionGuardHits(files);
      // ASSERT
      expect(files.length).toBeGreaterThanOrEqual(floor);
      expect(hits).toEqual([]);
    });

    it('tells a Package root from a deeper file and from a classified name', () => {
      // ARRANGE
      const expected = [true, false, false];
      // ACT
      const actual = ['packages/a/b.ts', 'packages/a/lib/b.ts', 'packages/a/b.pure.ts'].map(isPackageRoot);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
