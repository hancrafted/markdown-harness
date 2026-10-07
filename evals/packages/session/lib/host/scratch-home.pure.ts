// The credential copy a scratch home needs. `agy` reads its OAuth token from under HOME, so a scratch HOME is
// authenticated only if the token files are copied into it. R3 found two such files and did not try the copy. The
// list is fixed here and printed before any copy happens; nothing broader under ~/.gemini is ever copied.

import type { CredentialCopy } from './scratch-home.types.ts';

/** The authentication files R3 found, relative to the home. */
export const CREDENTIAL_FILES: readonly string[] = [
  '.gemini/jetski-standalone-oauth-token',
  '.gemini/antigravity-cli/antigravity-oauth-token',
];

const trimmed = (home: string): string => home.replace(/\/+$/, '');

/** Each credential file's source under the real home and its destination under the scratch home. */
export function credentialCopies(sourceHome: string, scratchHome: string): CredentialCopy[] {
  return CREDENTIAL_FILES.map((file) => ({
    from: `${trimmed(sourceHome)}/${file}`,
    to: `${trimmed(scratchHome)}/${file}`,
  }));
}

/** What the credential probe would do, stated for the person who must consent to it before it does. */
export function consentNotice(copies: readonly CredentialCopy[], scratchHome: string): string {
  const lines = copies.map((copy) => `  ${copy.from} -> ${copy.to}`);
  return [
    'This probe copies the account authentication files below into a scratch home, which touches them:',
    ...lines,
    `The scratch home ${scratchHome} is deleted afterwards, whatever the outcome.`,
    'Nothing is copied until you pass --consent-credential-copy.',
  ].join('\n');
}
