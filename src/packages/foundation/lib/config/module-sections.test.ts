// Colocated unit test for the one place a Module's own section is answered
// straight back to it, and nowhere else (ARCH-008 §1.5).
//
// Two stand-in descriptors, never one: the property under test is TELLING TWO
// MODULES APART, and a single descriptor has nothing else for its section to
// be confused with. The document writes both keys in the OPPOSITE order the
// Modules are declared in throughout, so a pairing built by position rather
// than by key would hand each Module the wrong value.

import { describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../../config-contract/index.ts';
import { configOf, validateDeclaredSections } from './module-sections.pure';

/** Every raw value a stand-in was handed, in call order. Reset per test that reads it. */
const handed: { key: string; raw: unknown }[] = [];

/** A stand-in Module: records what it is handed, and echoes it back typed. */
function stubModule<TSection>(key: string, coerce: (raw: unknown) => TSection): ModuleDescriptor<TSection> {
  return {
    key,
    validateSection(raw: unknown) {
      handed.push({ key, raw });
      return { section: coerce(raw), faults: [] };
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
}

const ALPHA = stubModule('alpha', (raw) => ({ alpha: raw as string }));
const BETA = stubModule('beta', (raw) => ({ beta: raw as number }));
const MODULES: readonly ModuleDescriptor<unknown>[] = [ALPHA, BETA];

/** A stand-in Module whose own key is always written wrong. */
const REJECTING: ModuleDescriptor<unknown> = {
  key: 'rejecting',
  validateSection() {
    return { faults: [{ code: 'CONFIG_INVALID_VALUE', location: 'rejecting' }] };
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

describe('validateDeclaredSections', () => {
  describe('success cases', () => {
    it('hands each Module the raw value written under its own key, never a value read by document position', () => {
      // Call order follows the DECLARED Module order (ALPHA, BETA), while the
      // document below writes those same two keys in the opposite order — so
      // a lookup that read `Object.values(document)` by position rather than
      // `document[module.key]` would hand ALPHA the value written for beta.
      // ARRANGE
      handed.length = 0;
      const document = { beta: 2, alpha: 'mine' };
      const expected = [
        { key: 'alpha', raw: 'mine' },
        { key: 'beta', raw: 2 },
      ];
      // ACT
      validateDeclaredSections(document, MODULES);
      // ASSERT
      expect(handed).toEqual(expected);
    });

    it('stores each Module’s validated section under that Module’s own descriptor', () => {
      // ARRANGE
      const document = { beta: 2, alpha: 'mine' };
      const expectedAlpha = { alpha: 'mine' };
      const expectedBeta = { beta: 2 };
      // ACT
      const outcome = validateDeclaredSections(document, MODULES);
      // ASSERT
      expect(outcome.sections.get(ALPHA)).toEqual(expectedAlpha);
      expect(outcome.sections.get(BETA)).toEqual(expectedBeta);
    });
  });

  describe('failure cases', () => {
    it('collects the fault a Module reports for its own key, and stores no section for it', () => {
      // ARRANGE
      const document = { rejecting: 'anything' };
      const expectedFaults = [{ code: 'CONFIG_INVALID_VALUE', location: 'rejecting' }];
      // ACT
      const outcome = validateDeclaredSections(document, [REJECTING]);
      // ASSERT
      expect(outcome.faults).toEqual(expectedFaults);
      expect(outcome.sections.has(REJECTING)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('never calls a Module whose key was not written', () => {
      // ARRANGE
      handed.length = 0;
      const document = { beta: 9 };
      const expected = ['beta'];
      // ACT
      validateDeclaredSections(document, MODULES);
      // ASSERT
      expect(handed.map((call) => call.key)).toEqual(expected);
    });
  });
});

describe('configOf', () => {
  describe('success cases', () => {
    it('answers a descriptor the section stored under its own identity', () => {
      // ARRANGE
      const expectedAlpha = { alpha: 'mine' };
      const expectedBeta = { beta: 2 };
      const sections = new Map<ModuleDescriptor<unknown>, unknown>([
        [BETA, expectedBeta],
        [ALPHA, expectedAlpha],
      ]);
      // ACT
      const config = configOf(sections);
      // ASSERT
      expect(config.sectionFor(ALPHA)).toEqual(expectedAlpha);
      expect(config.sectionFor(BETA)).toEqual(expectedBeta);
    });
  });

  describe('failure cases', () => {
    it('answers undefined for a Module whose validation reported a fault instead of a section', () => {
      // ARRANGE
      const sections = new Map<ModuleDescriptor<unknown>, unknown>();
      // ACT
      const config = configOf(sections);
      // ASSERT
      expect(config.sectionFor(REJECTING)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('never answers one descriptor with the section stored under a different descriptor', () => {
      // ARRANGE
      // Only BETA has an entry; ALPHA is a wholly separate identity with
      // nothing stored for it, deliberately — the point under proof is that
      // ALPHA cannot read BETA's section by any route.
      const expectedBeta = { beta: 2 };
      const sections = new Map<ModuleDescriptor<unknown>, unknown>([[BETA, expectedBeta]]);
      // ACT
      const config = configOf(sections);
      // ASSERT
      expect(config.sectionFor(ALPHA)).toBeUndefined();
      expect(config.sectionFor(BETA)).toEqual(expectedBeta);
    });
  });
});
