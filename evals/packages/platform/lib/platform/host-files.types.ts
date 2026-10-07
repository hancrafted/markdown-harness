export interface TreeEntryRecord {
  /** Relative to the walked root, forward slashes. */
  readonly path: string;
  readonly kind: 'file' | 'dir' | 'symlink';
}

export interface FileText {
  readonly path: string;
  readonly text: string;
}
