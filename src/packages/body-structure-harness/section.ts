// The `body-structure:` section of the config file, as this Module declares it.
//
// A root entry point with NO classifier that re-exports type declarations and
// nothing else — ARCH-005 §1.3's admitted idiom, the shape `frontmatter-harness`
// already uses. The declarations sit in `lib/section/section.types.ts`, because
// ARCH-004 §2.4 fails a classified file at a Package root.
//
// ARCH-008 §1.4: no Package outside this one may name these declarations. The
// address exists so this Module's own files and its two test homes share one
// spelling for them.

export type {
  BlockKind,
  BodyStructureConfig,
  BodyStructureRule,
  HeadingEntry,
  HeadingPresence,
  HeadingPurpose,
  UndefinedHeadings,
  VocabularyItem,
} from './lib/section/section.types.ts';
