// Colocated unit test for the errno-to-answer rule.
//
// Extracted from the reader so the rule can be asserted without a filesystem.
// Two of the four cases below cannot be planted at all: a permission refusal is
// a mode change that does not survive a clone on every platform and that CI
// runners routinely run past as root, and an errno the platform declines to
// name has no reproducible cause. The integration suite plants what can be
// planted; this states the rule for everything else.

import { describe, expect, it } from 'vitest';
import { fileReadFor } from './read-outcome.pure';

const LOCATION = 'docs/read.md';

describe('fileReadFor', () => {
  describe('success cases', () => {
    it('passes the bytes through unchanged', () => {
      // ARRANGE
      const bytes = 'the file said this\n';
      const expected = { kind: 'text', text: bytes };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'text', text: bytes });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('maps the one errno that proves absence to absent', () => {
      // ARRANGE
      const missing = 'ENOENT';
      const expected = { kind: 'absent', location: LOCATION };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'failed', errorCode: missing });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('maps a permission refusal to unreadable', () => {
      // ARRANGE
      const refused = 'EACCES';
      const expected = { kind: 'unreadable', location: LOCATION };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'failed', errorCode: refused });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('maps a directory standing where a file was expected to unreadable', () => {
      // NOT absent. This is the line that keeps the rejected-config tier's
      // not-found case and its unreadable case two cases rather than one.
      // ARRANGE
      const directory = 'EISDIR';
      const expected = { kind: 'unreadable', location: LOCATION };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'failed', errorCode: directory });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('treats an errno the platform declined to name as unreadable rather than absent', () => {
      // Only ENOENT proves absence. Anything unnamed is "there but unusable",
      // because claiming a file is missing when it exists is the false negative
      // this distinction exists to prevent.
      // ARRANGE
      const unnamed = undefined;
      const expected = { kind: 'unreadable', location: LOCATION };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'failed', errorCode: unnamed });
      // ASSERT
      expect(actual).toEqual(expected);
    });

    it('treats a symlink chain that closes on itself as unreadable', () => {
      // The host raises this rather than reporting absence, and an uncaught one
      // is the stack trace a corpus cycle used to produce.
      // ARRANGE
      const looped = 'ELOOP';
      const expected = { kind: 'unreadable', location: LOCATION };
      // ACT
      const actual = fileReadFor(LOCATION, { kind: 'failed', errorCode: looped });
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });
});
