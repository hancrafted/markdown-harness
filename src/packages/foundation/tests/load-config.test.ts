// Integration suite for the config loader, at the grain a caller sees.
//
// These reach the filesystem on purpose: the read edge is the one part of the
// loader no colocated test can exercise, because the colocated lane admits only
// a `.pure` sibling.
//
// Every Module here is a HAND-WRITTEN STAND-IN, kept in this file where a reader
// can see exactly what it does (ARCH-003 Decision 1.2 forbids `vi.mock`, and a
// stand-in is the substitute it names). That is not only a testing convenience:
// `foundation` may not import a Module Package (ARCH-008 §1.2), and the whole
// point of the descriptor is that the loader no longer knows a Module exists. A
// suite that reached for `frontmatter-harness` to drive the loader would be
// asserting the opposite of what this change bought.
//
// Two stand-ins rather than one, because the interesting properties are all
// about a SET: that the recognised key list is derived from it, that a section
// comes back under its own descriptor and nobody else's, and that a Module whose
// key is absent is handed `undefined` rather than a neighbour's section.
//
// Each case writes its own config file under a fresh name. The gate memoises a
// read for the life of the process, so two cases sharing a path would share an
// answer.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../config-contract/index.ts';
import { loadConfig } from '../load-config.ts';

const VALID = 'fixtures/conformance/frontmatter/valid-test-config.yaml';
const A_DIRECTORY = 'fixtures/conformance/frontmatter';
const NOT_YAML = 'fixtures/conformance/frontmatter/docs/log.md';
const MISSING = 'fixtures/conformance/frontmatter/no-such-config.yaml';

const scratch = mkdtempSync(join(tmpdir(), 'mh-load-config-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Write one config and point the loader at it. Each name is used once. */
function configAt(name: string, yaml: string): string {
  const path = join(scratch, name);
  writeFileSync(path, yaml);
  return path;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What the `alpha` stand-in calls a section: one string under one key. */
interface AlphaSection {
  alpha: string;
}

/** What the `beta` stand-in calls a section, deliberately a different shape. */
interface BetaSection {
  beta: number;
}

/**
 * Every raw value each stand-in was handed, in call order.
 *
 * The loader's one unmechanised promise (ARCH-008 §1.5, transposed from the cut
 * `claimsFor` onto `validateSection`) is that a descriptor sees its own key's
 * value and nothing else. The type system was measured unable to catch a
 * cross-wired section, so this ledger is the guard.
 */
const handed: { key: string; raw: unknown }[] = [];

const alphaModule: ModuleDescriptor<AlphaSection> = {
  key: 'alpha',
  validateSection(raw: unknown) {
    handed.push({ key: 'alpha', raw });
    if (isMapping(raw) && typeof raw.alpha === 'string') return { section: { alpha: raw.alpha }, faults: [] };
    return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'alpha' }] };
  },
  query() {
    return undefined;
  },
  audit() {
    return undefined;
  },
  assess() {
    return undefined;
  },
  check() {
    return undefined;
  },
};

const betaModule: ModuleDescriptor<BetaSection> = {
  key: 'beta',
  validateSection(raw: unknown) {
    handed.push({ key: 'beta', raw });
    if (isMapping(raw) && typeof raw.beta === 'number') return { section: { beta: raw.beta }, faults: [] };
    return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'beta' }] };
  },
  query() {
    return undefined;
  },
  audit() {
    return undefined;
  },
  assess() {
    return undefined;
  },
  check() {
    return undefined;
  },
};

/**
 * A HETEROGENEOUS Module set, pinned the way the composing Package pins its own.
 *
 * `ModuleDescriptor<AlphaSection>` and `ModuleDescriptor<BetaSection>` sit in one
 * array under `strict`, which is the whole point of keeping the section type in
 * return position: the descriptor widens to `ModuleDescriptor<unknown>` soundly.
 * A second member taking a section as an argument would put the type in a
 * parameter position and this line is where that would have shown up.
 */
const MODULES = [alphaModule, betaModule] as const satisfies readonly ModuleDescriptor<unknown>[];

describe('loadConfig', () => {
  describe('success cases', () => {
    it('hands each Module back its own section and nothing else', () => {
      // ARRANGE
      const expectedAlpha = { alpha: 'written by the operator' };
      const expectedBeta = { beta: 7 };
      const path = configAt('both.yaml', 'alpha:\n  alpha: written by the operator\nbeta:\n  beta: 7\n');
      // ACT
      const load = loadConfig(path, MODULES);
      // ASSERT
      expect(load.faults).toEqual([]);
      expect(load.config?.sectionFor(alphaModule)).toEqual(expectedAlpha);
      expect(load.config?.sectionFor(betaModule)).toEqual(expectedBeta);
    });

    it('validates a section against the value written under that Module’s own key', () => {
      // The cross-wiring guard. A loader that handed `beta` the `alpha` mapping
      // would still produce two sections and two clean validations here; only
      // the raw value each Module was shown tells the two apart.
      // ARRANGE
      const expected = [
        { key: 'alpha', raw: { alpha: 'mine' } },
        { key: 'beta', raw: { beta: 1 } },
      ];
      handed.length = 0;
      const path = configAt('own-section.yaml', 'alpha:\n  alpha: mine\nbeta:\n  beta: 1\n');
      // ACT
      loadConfig(path, MODULES);
      // ASSERT
      expect(handed).toEqual(expected);
    });

    it('answers undefined for a declared Module whose key was not written', () => {
      // Real as soon as a second Module exists, and unreachable with one: the
      // loader rejects a config naming no Module at all, so `undefined` here
      // means "another Module carried this config", never "nothing governs".
      // ARRANGE
      const expectedBeta = { beta: 3 };
      const path = configAt('beta-only.yaml', 'beta:\n  beta: 3\n');
      // ACT
      const load = loadConfig(path, MODULES);
      // ASSERT
      expect(load.config?.sectionFor(alphaModule)).toBeUndefined();
      expect(load.config?.sectionFor(betaModule)).toEqual(expectedBeta);
    });
  });

  describe('failure cases', () => {
    it('reports CONFIG_NOT_FOUND for a path with nothing at it', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_NOT_FOUND', location: MISSING }];
      // ACT
      const actual = loadConfig(MISSING, MODULES);
      // ASSERT
      expect(actual.faults).toEqual(expected);
      expect(actual.config).toBeUndefined();
    });

    it('reports CONFIG_UNREADABLE when the path is a directory', () => {
      // "Something is there but cannot be read as a file" — the case a bare
      // existence check would call success.
      // ARRANGE
      const expected = [{ code: 'CONFIG_UNREADABLE', location: A_DIRECTORY }];
      // ACT
      const actual = loadConfig(A_DIRECTORY, MODULES);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });

    it('reports CONFIG_NOT_YAML for bytes that are not a mapping', () => {
      // ARRANGE
      const expected = [{ code: 'CONFIG_NOT_YAML', location: NOT_YAML }];
      // ACT
      const actual = loadConfig(NOT_YAML, MODULES);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });

    it('reports CONFIG_NO_MODULE_SECTION for a config no declared Module is named in', () => {
      // The loader's own code, not a Module's. Only the loader knows the whole
      // declared set, so only the loader can tell "this Module has nothing to do
      // here" from "this config governs nothing at all".
      // ARRANGE
      const path = configAt('names-nobody.yaml', 'gamma:\n  anything: at all\n');
      const expected = [
        { code: 'CONFIG_NO_MODULE_SECTION', location: path },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'gamma' },
      ];
      // ACT
      const actual = loadConfig(path, MODULES);
      // ASSERT
      expect(actual.faults).toEqual(expected);
      expect(actual.config).toBeUndefined();
    });

    it('rejects a key no declared Module claims, and claims it once a Module does', () => {
      // The recognised key set is DERIVED. The same bytes are a fault against
      // one Module set and clean against another, which a hand-maintained list
      // could not express — and which is what makes a typo'd section name a
      // rejection by name instead of silence.
      // ARRANGE
      const unclaimed = [
        { code: 'CONFIG_NO_MODULE_SECTION', location: join(scratch, 'derived-a.yaml') },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'beta' },
      ];
      const yaml = 'beta:\n  beta: 4\n';
      // ACT
      const withoutBeta = loadConfig(configAt('derived-a.yaml', yaml), [alphaModule]);
      const withBeta = loadConfig(configAt('derived-b.yaml', yaml), MODULES);
      // ASSERT
      expect(withoutBeta.faults).toEqual(unclaimed);
      expect(withBeta.faults).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('echoes the config path exactly as given, never resolved', () => {
      // A stored response must compare equal on another machine, so an absolute
      // path must never appear in a fault the caller wrote relatively.
      // ARRANGE
      const relative = './fixtures/conformance/frontmatter/no-such-config.yaml';
      // ACT
      const actual = loadConfig(relative, MODULES);
      // ASSERT
      expect(actual.faults[0]?.location).toBe(relative);
    });

    it('stops before validating when the bytes never parsed', () => {
      // A file with no keys has nothing to recognise, so exactly one fault
      // travels rather than that fault plus a cascade of key complaints.
      // ARRANGE
      const only = 1;
      // ACT
      const actual = loadConfig(NOT_YAML, MODULES);
      // ASSERT
      expect(actual.faults).toHaveLength(only);
    });

    it('never calls a Module for a key that was not written', () => {
      // The branch that used to answer an absent section lived in the Module and
      // is deleted, not merely unreached. If the loader called through anyway,
      // every Module would answer for every config it was not named in.
      // ARRANGE
      const expected = ['beta'];
      handed.length = 0;
      const path = configAt('absent-key.yaml', 'beta:\n  beta: 9\n');
      // ACT
      loadConfig(path, MODULES);
      // ASSERT
      expect(handed.map((call) => call.key)).toEqual(expected);
    });

    it('reports every fault across every stage in one run, in reporting order', () => {
      // A config fails whole. The unclaimed key is reported where it was
      // written, and both Modules are still asked, so an Operator sees the
      // typo and the broken section in one run rather than one per invocation.
      // ARRANGE
      const path = configAt('fails-whole.yaml', 'gamma: 1\nalpha: not-a-mapping\nbeta:\n  beta: not-a-number\n');
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'gamma' },
        { code: 'CONFIG_INVALID_VALUE', location: 'alpha' },
        { code: 'CONFIG_INVALID_VALUE', location: 'beta' },
      ];
      // ACT
      const actual = loadConfig(path, MODULES);
      // ASSERT
      expect(actual.faults).toEqual(expected);
    });

    it('withholds every section when any Module found a fault', () => {
      // Half a config is not a config: `alpha` validated cleanly here, and it is
      // still unreachable, because a caller handed one good section out of two
      // would report on a corpus the Operator never finished describing.
      // ARRANGE
      const path = configAt('one-good-one-bad.yaml', 'alpha:\n  alpha: fine\nbeta:\n  beta: not-a-number\n');
      // ACT
      const actual = loadConfig(path, MODULES);
      // ASSERT
      expect(actual.config).toBeUndefined();
      expect(actual.faults).toHaveLength(1);
    });

    it('loads a real committed config through a stand-in that accepts any mapping', () => {
      // The read, parse and derive stages against bytes nobody wrote for this
      // suite. What the `frontmatter:` section MEANS is that Module's business
      // and is proven where that Module lives.
      // ARRANGE
      const anySection: ModuleDescriptor<Record<string, unknown>> = {
        key: 'frontmatter',
        validateSection: (raw: unknown) =>
          isMapping(raw)
            ? { section: raw, faults: [] }
            : { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'frontmatter' }] },
        query() {
          return undefined;
        },
        audit() {
          return undefined;
        },
        assess() {
          return undefined;
        },
        check() {
          return undefined;
        },
      };
      const noFaults = 0;
      // ACT
      const actual = loadConfig(VALID, [anySection]);
      // ASSERT
      expect(actual.faults).toHaveLength(noFaults);
      expect(actual.config?.sectionFor(anySection)).toBeDefined();
    });
  });
});
