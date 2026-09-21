// Colocated unit test for top-level key recognition.
//
// Only the top tier is the loader's business: a key inside a Module's section
// belongs to the Module that owns that section, so nothing below the first level
// is asserted here.
//
// The vocabulary is DERIVED, so every case has to supply a Module set — and that
// is the property worth asserting hardest. The same document is clean against
// one set and a fault against another, which is exactly what a hand-maintained
// key list could not express and what makes a mistyped section name a rejection
// by name rather than silence.
//
// The descriptors are hand-written stand-ins, in this file where a reader can
// see what they do. Nothing here validates a section: this unit only ever reads
// `key`.

import { describe, expect, it } from 'vitest';
import type { ModuleDescriptor } from '../../../config-contract/index.ts';
import { findUnrecognisedTopLevelKeys, namesAnyModule } from './top-level-keys.pure';

/** A Module by its key alone, which is all this unit reads. */
function moduleClaiming(key: string): ModuleDescriptor<unknown> {
  return { key, validateSection: () => ({ faults: [] }) };
}

const FRONTMATTER = moduleClaiming('frontmatter');
const INDEXES = moduleClaiming('indexes');

describe('findUnrecognisedTopLevelKeys', () => {
  describe('success cases', () => {
    it('accepts a document holding only a declared Module’s key', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] } };
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toEqual([]);
    });

    it('accepts a key the moment a Module claiming it is declared', () => {
      // The derivation, stated as a difference. The bytes do not change; the
      // declared set does, and the answer follows it.
      // ARRANGE
      const document = { indexes: {} };
      const rejected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'indexes' }];
      // ACT
      const withoutIndexes = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      const withIndexes = findUnrecognisedTopLevelKeys(document, [FRONTMATTER, INDEXES]);
      // ASSERT
      expect(withoutIndexes).toEqual(rejected);
      expect(withIndexes).toEqual([]);
    });
  });

  describe('failure cases', () => {
    it('reports a key no declared Module claims', () => {
      // ARRANGE
      const document = { backmatter: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('reports every unclaimed key rather than the first', () => {
      // A config fails whole, so one fault per offending key.
      // ARRANGE
      const document = { backmatter: {}, sidematter: {} };
      const expected = [
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'backmatter' },
        { code: 'CONFIG_UNRECOGNISED_KEY', location: 'sidematter' },
      ];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('leaves a claimed sibling alone', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] }, typos: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'typos' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('rejects every key when no Module is declared at all', () => {
      // A recognised key set computed from an empty list recognises nothing,
      // which is honest rather than a defect: a tool shipping no Module governs
      // no config.
      // ARRANGE
      const document = { frontmatter: {} };
      const expected = [{ code: 'CONFIG_UNRECOGNISED_KEY', location: 'frontmatter' }];
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, []);
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('finds nothing to reject in an empty mapping', () => {
      // An empty mapping names no key at all, so there is no key to reject. That
      // it also names no Module is `namesAnyModule`'s answer, below.
      // ARRANGE
      const document = {};
      // ACT
      const actual = findUnrecognisedTopLevelKeys(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toEqual([]);
    });
  });
});

describe('namesAnyModule', () => {
  describe('success cases', () => {
    it('answers true for a document naming a declared Module', () => {
      // ARRANGE
      const document = { frontmatter: { rules: [] } };
      // ACT
      const actual = namesAnyModule(document, [FRONTMATTER, INDEXES]);
      // ASSERT
      expect(actual).toBe(true);
    });
  });

  describe('failure cases', () => {
    it('answers false for a document naming only keys nobody claims', () => {
      // The typo, which is the case this whole code exists for: a section
      // addressed to nobody used to be ignored, and is now two reported facts.
      // ARRANGE
      const document = { frontmater: { rules: [] } };
      // ACT
      const actual = namesAnyModule(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('answers true for a key written with a value the Module will refuse', () => {
      // PRESENCE, never soundness. A section that is present and wrong is the
      // Module's fault to report at its own key; answering false here would
      // report the file as governing nothing and bury the real complaint.
      // ARRANGE
      const document = { frontmatter: null };
      // ACT
      const actual = namesAnyModule(document, [FRONTMATTER]);
      // ASSERT
      expect(actual).toBe(true);
    });

    it('does not mistake an inherited property for a declared key', () => {
      // `Object.hasOwn` rather than `in`, which walks the prototype chain and
      // would answer true for a Module keyed `toString`.
      // ARRANGE
      const document = {};
      // ACT
      const actual = namesAnyModule(document, [moduleClaiming('toString')]);
      // ASSERT
      expect(actual).toBe(false);
    });
  });
});
