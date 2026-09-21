// The guard on the declared Module set, and the one compile-time guarantee this
// architecture traded away.
//
// A whole-config interface could not declare a key twice: `frontmatter?:` twice
// in one `interface` is `TS2300`. The Module set is a list, so two descriptors
// both claiming `'frontmatter'` compile clean and the second one's section would
// be silently unreachable through `sectionFor` — a Module that registered and
// governs nothing, with nothing anywhere saying so.
//
// The replacement is this file. It is written as a two-sided canary on purpose:
// the failure case plants the duplicate the check exists to catch, so the check
// re-proves itself on every run rather than passing over a set that happens to
// be fine. A one-sided version would pass just as happily with `duplicateKeys`
// returning `[]` unconditionally.
//
// `duplicateKeys` is hand-written here rather than imported from a production
// file, because nothing in production would call it: the declared set is a
// constant, so the only moment a duplicate can appear is the moment someone
// edits this repository. A `.pure.ts` nothing calls is one more check that can
// never go red.

import { describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../config-contract/index.ts';
import { MODULE_SET } from '../module-set.ts';

/** Every key claimed by more than one descriptor, in the order they were claimed. */
function duplicateKeys(modules: readonly ModuleDescriptor<unknown>[]): readonly string[] {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const module of modules) {
    if (seen.has(module.key)) repeated.push(module.key);
    seen.add(module.key);
  }
  return repeated;
}

/** A descriptor that validates nothing, standing in for a Module by its key alone. */
function descriptorFor(key: string): ModuleDescriptor<unknown> {
  return { key, validateSection: () => ({ faults: [] }) };
}

describe('the declared Module set', () => {
  describe('success cases', () => {
    it('claims each top-level key once', () => {
      // ARRANGE
      const none: readonly string[] = [];
      // ACT
      const actual = duplicateKeys(MODULE_SET);
      // ASSERT
      expect(actual).toEqual(none);
    });

    it('declares at least one Module, so the key set it derives is not empty', () => {
      // A recognised key set computed from an empty list would reject every
      // config ever written, and every assertion above would still pass.
      // ARRANGE
      const atLeastOne = 0;
      // ACT
      const actual = MODULE_SET.map((module) => module.key);
      // ASSERT
      expect(actual.length).toBeGreaterThan(atLeastOne);
    });
  });

  describe('failure cases', () => {
    it('names the key two descriptors both claim', () => {
      // The planted violation. Both descriptors compile, which is exactly the
      // guarantee that was traded away.
      // ARRANGE
      const contested = 'frontmatter';
      const expected = [contested];
      const collided = [descriptorFor(contested), descriptorFor('indexes'), descriptorFor(contested)];
      // ACT
      const actual = duplicateKeys(collided);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('finds nothing to report in a set of distinct keys', () => {
      // The clean half of the canary: the check must pass a set it should pass,
      // or a `duplicateKeys` that returned every key would satisfy the case
      // above and prove nothing.
      // ARRANGE
      const none: readonly string[] = [];
      const distinct = [descriptorFor('frontmatter'), descriptorFor('indexes'), descriptorFor('drift')];
      // ACT
      const actual = duplicateKeys(distinct);
      // ASSERT
      expect(actual).toEqual(none);
    });
  });
});
