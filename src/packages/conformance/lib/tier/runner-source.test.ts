import { describe, expect, it } from 'vitest';
import { readsOwnTier } from './runner-source.pure.ts';

describe('readsOwnTier', () => {
  describe('success cases', () => {
    it('recognises a runner that derives its record from its own module URL', () => {
      // ARRANGE
      const source = [
        'const TIER = tierForRunner(import.meta.url);',
        'const config = TIER.configFile;',
        'const declaredCases = TIER.caseCount;',
        'expect(enumerated).toBe(declaredCases);',
      ].join('\n');
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('rejects an empty runner', () => {
      // ARRANGE
      const source = '';
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a runner that names another tier directly', () => {
      // ARRANGE
      const source = "const TIER = tierNamed('rejected-config');\n";
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a comment that only looks like an own-record declaration', () => {
      // ARRANGE
      const source = '// const TIER = tierForRunner(import.meta.url);\n';
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects a runner that supplies a different module URL', () => {
      // ARRANGE
      const source = "const TIER = tierForRunner('file:///other-tier.test.ts');\n";
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('rejects a runner with no reviewed count assertion', () => {
      // ARRANGE
      const source = 'const TIER = tierForRunner(import.meta.url);';
      // ACT
      const actual = readsOwnTier(source);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
