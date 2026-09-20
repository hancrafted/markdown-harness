// Asserts that fixture tiers and runners match, derived from the tree.
//
// Enrolling a Module costs three steps: Module set, fixture tier, runner.
// Missing any of the three is an enrolment failure.

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MODULE_SET } from '../../cli/module-set.ts';

const MODULES_TIER_DIR = fileURLToPath(new URL('../../../../fixtures/conformance/modules', import.meta.url));
const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url));

const fixtureTiers = readdirSync(MODULES_TIER_DIR, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort();

const NON_MODULE_RUNNERS = ['config.test.ts', 'enrolment.test.ts'];

const moduleRunners = readdirSync(TESTS_DIR, { withFileTypes: true })
  .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.test.ts') && !NON_MODULE_RUNNERS.includes(dirent.name))
  .map((dirent) => dirent.name.replace(/\.test\.ts$/, ''))
  .sort();

const enrolledModules = MODULE_SET.map((mod) => mod.key).sort();

describe('conformance suite enrolment', () => {
  describe('success cases', () => {
    it('gives every fixture tier a matching runner and vice versa', () => {
      // ARRANGE
      const expected = fixtureTiers;
      // ACT
      const actual = moduleRunners;
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('enrols every module fixture tier into the CLI module set', () => {
      // ARRANGE
      const expected = fixtureTiers;
      // ACT
      const actual = enrolledModules;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('has no runner without a corresponding fixture tier', () => {
      // ARRANGE
      const tiers = new Set(fixtureTiers);
      // ACT
      const orphaned = moduleRunners.filter((runner) => !tiers.has(runner));
      // ASSERT
      expect(orphaned).toEqual([]);
    });

    it('has no module in the module set without a corresponding fixture tier', () => {
      // ARRANGE
      const tiers = new Set(fixtureTiers);
      // ACT
      const orphaned = enrolledModules.filter((mod) => !tiers.has(mod));
      // ASSERT
      expect(orphaned).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('has at least one enrolled module tier in Phase 0', () => {
      // ARRANGE
      const atLeastOne = 1;
      // ACT
      const tierCount = fixtureTiers.length;
      // ASSERT
      expect(tierCount).toBeGreaterThanOrEqual(atLeastOne);
    });
  });
});
