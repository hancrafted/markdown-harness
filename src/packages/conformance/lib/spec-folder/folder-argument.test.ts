import { describe, expect, it } from 'vitest';
import { folderRequestOf } from './folder-argument.pure.ts';

const TIERS = [
  { name: 'body-structure', specFolders: true },
  { name: 'frontmatter', specFolders: false },
];

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
    it.each([undefined, '', 'body-structure/docs', 'body-structure/docs/minCount__zero/passes.md'])(
      'refuses %s, which names no single spec folder',
      (argument) => {
        // ARRANGE
        const refused = 'refused';
        // ACT
        const actual = folderRequestOf(argument, TIERS);
        // ASSERT
        expect(actual.kind).toBe(refused);
      },
    );
  });
});
