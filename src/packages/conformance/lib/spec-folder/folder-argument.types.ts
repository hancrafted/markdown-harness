/** One decided `npm run conformance` request. */
export type FolderRequest =
  | { readonly kind: 'spec-folder'; readonly tier: string; readonly folder: string }
  | { readonly kind: 'spec-tier'; readonly tier: string }
  | { readonly kind: 'tier-runner'; readonly tier: string }
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'refused'; readonly reason: string };

/** What the request needs to know of one declared tier. */
export interface TierShape {
  readonly name: string;
  readonly specFolders: boolean;
}
