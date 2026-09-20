import { describe, expect, it } from 'vitest';
import { MODULE_SET } from '../module-set.ts';

describe('MODULE_SET', () => {
  describe('success cases', () => {
    it('declares modules with unique keys', () => {
      // ARRANGE
      const keys = MODULE_SET.map((m) => m.key);
      const uniqueKeys = new Set(keys);
      // ACT
      const keyCount = keys.length;
      const uniqueCount = uniqueKeys.size;
      // ASSERT
      expect(keyCount).toBe(uniqueCount);
    });

    it('declares frontmatter as the first module', () => {
      // ARRANGE
      const expectedKey = 'frontmatter';
      // ACT
      const firstModuleKey = MODULE_SET[0]?.key;
      // ASSERT
      expect(firstModuleKey).toBe(expectedKey);
    });
  });

  describe('failure cases', () => {
    it('contains no empty module keys', () => {
      // ARRANGE
      const emptyString = '';
      // ACT
      const keys = MODULE_SET.map((m) => m.key);
      // ASSERT
      expect(keys).not.toContain(emptyString);
    });
  });

  describe('edge cases', () => {
    it('declares a non-empty set of modules', () => {
      // ARRANGE
      const minimumModules = 0;
      // ACT
      const moduleCount = MODULE_SET.length;
      // ASSERT
      expect(moduleCount).toBeGreaterThan(minimumModules);
    });
  });
});
