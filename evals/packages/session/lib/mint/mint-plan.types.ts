export interface AncestorListing {
  readonly dir: string;
  readonly entries: readonly string[];
}

export interface CopyStep {
  /** An absolute source path. */
  readonly from: string;
  /** A path relative to the minted root. */
  readonly to: string;
}

export interface MintSources {
  /** The seed tree the case is cut from: config, instruction file and seeded documents. Not the held-out cases. */
  readonly seedDir: string;
  readonly mhDist: string;
  readonly mhManifest: string;
  readonly markedDir: string;
  readonly yamlDir: string;
  /** The unmodified hook scripts under `.agents/skills/markdown-harness/scripts/`. */
  readonly hookScripts: readonly string[];
}

export interface TreeEntry {
  readonly path: string;
  readonly kind: 'file' | 'dir' | 'symlink';
}

/** Where a case's seed lives: the checkout root and the seed directory relative to it. */
export interface SeedLocation {
  readonly checkout: string;
  readonly seedRelative: string;
}
