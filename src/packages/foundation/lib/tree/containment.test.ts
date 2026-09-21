// Colocated unit test for the containment comparison.
//
// Asserted without a tree because both arguments arrive already resolved: what
// is left is a string comparison, and the cases worth pinning — a sibling one
// character away, a root that already ends in a separator — are awkward to
// plant and trivial to state. The tree half is proven in the walker's
// integration suite, which plants a real escaping symlink.

import { describe, expect, it } from 'vitest';
import { isInsideRoot } from './containment.pure';

const ROOT = '/corpus';

describe('isInsideRoot', () => {
  describe('success cases', () => {
    it('admits a file directly inside the root', () => {
      // ARRANGE
      const inside = '/corpus/docs/a.md';
      // ACT
      const actual = isInsideRoot(ROOT, inside);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('admits the root itself', () => {
      // ARRANGE
      const itself = ROOT;
      // ACT
      const actual = isInsideRoot(ROOT, itself);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('refuses a target that shares a prefix but sits beside the root', () => {
      // A bare prefix check reads this as contained, which is the one mistake
      // that would let a whole sibling repository into a corpus.
      // ARRANGE
      const sibling = '/corpus-backup/docs/a.md';
      // ACT
      const actual = isInsideRoot(ROOT, sibling);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('refuses a target somewhere else entirely', () => {
      // ARRANGE
      const elsewhere = '/etc/passwd';
      // ACT
      const actual = isInsideRoot(ROOT, elsewhere);
      // ASSERT
      expect(actual).toBe(false);
    });

    it('refuses the roots parent', () => {
      // ARRANGE
      const above = '/';
      // ACT
      const actual = isInsideRoot(ROOT, above);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('admits a target below a root that already ends in a separator', () => {
      // ARRANGE
      const rootWithSeparator = '/corpus/';
      const inside = '/corpus/docs/a.md';
      // ACT
      const actual = isInsideRoot(rootWithSeparator, inside);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('admits a target below a Windows-shaped root', () => {
      // The separator is an ambient read, so both are accepted rather than the
      // one this process happens to run under.
      // ARRANGE
      const windowsRoot = 'C:\\corpus';
      const inside = 'C:\\corpus\\docs\\a.md';
      // ACT
      const actual = isInsideRoot(windowsRoot, inside);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('refuses a target whose extra characters are not a separator', () => {
      // ARRANGE
      const glued = '/corpusdocs/a.md';
      // ACT
      const actual = isInsideRoot(ROOT, glued);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
