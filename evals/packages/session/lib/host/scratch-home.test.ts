// Colocated unit test for the credential copy a scratch home needs. The copy touches the account's authentication
// files, so what it would copy, from where and to where must be stated exactly before anything is copied.

import { describe, expect, it } from 'vitest';
import { CREDENTIAL_FILES, consentNotice, credentialCopies } from './scratch-home.pure.ts';

describe('credentialCopies', () => {
  describe('success cases', () => {
    it('maps each credential file under the real home to the same relative path under the scratch home', () => {
      // ARRANGE
      const expected = CREDENTIAL_FILES.map((file) => ({ from: `/Users/h/${file}`, to: `/tmp/s/${file}` }));
      // ACT
      const actual = credentialCopies('/Users/h', '/tmp/s');
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('names only the two OAuth token files R3 found, and nothing broader under ~/.gemini', () => {
      // ARRANGE
      const expected = ['.gemini/jetski-standalone-oauth-token', '.gemini/antigravity-cli/antigravity-oauth-token'];
      // ACT
      const actual = CREDENTIAL_FILES;
      // ASSERT
      expect(actual).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('does not double a trailing slash on either home', () => {
      // ARRANGE
      const [first] = credentialCopies('/Users/h/', '/tmp/s/');
      const doubled = '//';
      // ACT
      const actual = first;
      // ASSERT
      expect(actual?.from).not.toContain(doubled);
      expect(actual?.to).not.toContain(doubled);
    });
  });
});

describe('consentNotice', () => {
  const copies = credentialCopies('/Users/h', '/tmp/s');

  describe('success cases', () => {
    it('lists every copy as from and to, so the operator sees exactly which files move where', () => {
      // ARRANGE
      const lines = copies.map((copy) => `${copy.from} -> ${copy.to}`);
      // ACT
      const actual = consentNotice(copies, '/tmp/s');
      // ASSERT
      for (const line of lines) expect(actual).toContain(line);
    });

    it('says the scratch home is deleted afterwards', () => {
      // ARRANGE
      const expected = 'deleted';
      const scratch = '/tmp/s';
      // ACT
      const actual = consentNotice(copies, scratch);
      // ASSERT
      expect(actual).toContain(expected);
      expect(actual).toContain(scratch);
    });
  });

  describe('failure cases', () => {
    it('says nothing is copied until the consent flag is given', () => {
      // ARRANGE
      const expected = '--consent-credential-copy';
      // ACT
      const actual = consentNotice(copies, '/tmp/s');
      // ASSERT
      expect(actual).toContain(expected);
    });
  });

  describe('edge cases', () => {
    it('still names the flag and the deletion when there is nothing to copy', () => {
      // ARRANGE
      const expected = ['--consent-credential-copy', 'deleted'];
      // ACT
      const actual = consentNotice([], '/tmp/s');
      // ASSERT
      for (const part of expected) expect(actual).toContain(part);
    });
  });
});
