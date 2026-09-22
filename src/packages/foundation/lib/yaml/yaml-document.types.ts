/** What a caller must tell `parseYamlDocument` about an empty document. See that seam's own docblock for why this is a caller decision rather than one hard-coded answer. */
export type EmptyDocumentPolicy = 'fault' | 'empty-mapping';

/** What a document became, or the fault standing in for it. */
export type YamlDocumentResult = { kind: 'mapping'; document: Record<string, unknown> } | { kind: 'fault' };
