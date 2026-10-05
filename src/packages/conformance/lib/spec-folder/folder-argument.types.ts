/** One decided `npm run conformance` request. */
export type FolderRequest =
  | { readonly kind: 'spec-folder'; readonly tier: string; readonly folder: string }
  | { readonly kind: 'spec-tier'; readonly tier: string }
  | { readonly kind: 'case-directory'; readonly tier: string; readonly caseName: string }
  | { readonly kind: 'case-tier'; readonly tier: string }
  | { readonly kind: 'tier-runner'; readonly tier: string }
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'refused'; readonly reason: string };

/**
 * What a tier's directory holds that the script can run alone: spec folders
 * under `docs/`, case directories straight under the tier root, or nothing
 * smaller than the tier.
 */
export type RunnableUnit = 'spec-folder' | 'case-directory' | 'none';

/** What the request needs to know of one declared tier. */
export interface TierShape {
  readonly name: string;
  readonly unit: RunnableUnit;
}
