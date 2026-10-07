import { describe, expect, it } from 'vitest';
import { conformanceArgumentsOf, folderRequestOf } from './folder-argument.pure.ts';

const TIERS = [
  { name: 'body-structure', unit: 'spec-folder' },
  { name: 'frontmatter', unit: 'none' },
  { name: 'rejected-config', unit: 'case-directory' },
] as const;

describe('folderRequestOf', () => {
  describe('success cases', () => {
    it.each([
      'body-structure/docs/minCount__zero',
      'fixtures/conformance/body-structure/docs/minCount__zero',
      './fixtures/conformance/body-structure/docs/minCount__zero/',
    ])('reads %s as one spec folder', (argument) => {
      // ARRANGE
      const expected = { kind: 'spec-folder', tier: 'body-structure', folder: 'minCount__zero' };
      // ACT
      const actual = folderRequestOf(argument, TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a spec-folder tier root as every spec folder in it', () => {
      // ARRANGE
      const expected = { kind: 'spec-tier', tier: 'body-structure' };
      // ACT
      const actual = folderRequestOf('fixtures/conformance/body-structure', TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it.each([
      'rejected-config/frontmatter__duplicate-rule-id',
      'fixtures/conformance/rejected-config/file__config-not-found/',
    ])('reads %s as one case directory', (argument) => {
      // ARRANGE
      const expected = { kind: 'case-directory', tier: 'rejected-config', caseName: expect.stringMatching(/__/u) };
      // ACT
      const actual = folderRequestOf(argument, TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a case-directory tier root as every case in it', () => {
      // ARRANGE
      const expected = { kind: 'case-tier', tier: 'rejected-config' };
      // ACT
      const actual = folderRequestOf('fixtures/conformance/rejected-config', TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads another tier root as that tier runner', () => {
      // ARRANGE
      const expected = { kind: 'tier-runner', tier: 'frontmatter' };
      // ACT
      const actual = folderRequestOf('frontmatter', TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses a subfolder of a tier that has no spec folders, with the reason', () => {
      // ARRANGE
      const expected = { kind: 'refused', reason: expect.stringContaining('is not split into spec folders') };
      // ACT
      const actual = folderRequestOf('frontmatter/docs/reference', TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads a path outside every tier as a directory to compare on its own', () => {
      // ARRANGE
      const expected = { kind: 'directory', path: '/tmp/scratch' };
      // ACT
      const actual = folderRequestOf('/tmp/scratch/', TIERS);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it.each([
      undefined,
      '',
      'body-structure/docs',
      'body-structure/docs/minCount__zero/passes.md',
      'rejected-config/file__config-not-found/expected-rejection.json',
    ])('refuses %s, which names no single spec folder or case directory', (argument) => {
      // ARRANGE
      const refused = 'refused';
      // ACT
      const actual = folderRequestOf(argument, TIERS);
      // ASSERT
      expect(actual.kind).toBe(refused);
    });
  });
});

describe('conformanceArgumentsOf', () => {
  describe('success cases', () => {
    it('reads no argument as every tier, which is what the gate runs', () => {
      // ARRANGE
      const expected = { kind: 'every-tier' };
      // ACT
      const actual = conformanceArgumentsOf([]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads every path after --path, across repeats, in the order typed', () => {
      // ARRANGE
      const argv = ['--path', 'body-structure/docs/a', 'integrated/docs/b', '--path', 'rejected-config/c'];
      const expected = { kind: 'paths', paths: ['body-structure/docs/a', 'integrated/docs/b', 'rejected-config/c'] };
      // ACT
      const actual = conformanceArgumentsOf(argv);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses --path that names no path, with the usage', () => {
      // ARRANGE
      const expected = {
        kind: 'refused',
        reason: '--path names no path — usage: npm run conformance [-- --path <path> [<path> ...]]',
      };
      // ACT
      const actual = conformanceArgumentsOf(['--path']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('refuses an option it does not know, rather than running every tier', () => {
      // ARRANGE
      const expected = {
        kind: 'refused',
        reason: 'unknown option --paths — usage: npm run conformance [-- --path <path> [<path> ...]]',
      };
      // ACT
      const actual = conformanceArgumentsOf(['--paths', 'body-structure']);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('reads a bare path as if --path preceded it, so the one-folder form keeps working', () => {
      // ARRANGE
      const expected = { kind: 'paths', paths: ['body-structure/docs/a'] };
      // ACT
      const actual = conformanceArgumentsOf(['body-structure/docs/a']);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reads blank arguments as no path, so an empty shell variable still runs every tier', () => {
      // ARRANGE
      const expected = { kind: 'every-tier' };
      // ACT
      const actual = conformanceArgumentsOf(['', '  ']);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
