// The `frontmatter:` section of the config file, as this Module declares it.
//
// A root entry point with NO classifier that re-exports type declarations and
// nothing else — ARCH-005 §1.3's admitted idiom, and the shape
// `config-contract/index.ts` already uses. The declarations themselves sit in
// `lib/section/section.types.ts`, because ARCH-004 §2.4 fails a classified file
// at a Package root: a literal `section.types.ts` here would not survive the
// gate, so the classifier stays below the root and the public address stays
// above it.
//
// Every export is named rather than starred. `export *` would be the barrel
// ARCH-004 bans: it grows silently, so a declaration added below becomes public
// without anyone deciding it.
//
// ARCH-008 §1.4 puts a ceiling on who may read this: the section type belongs to
// this Package, and no Package outside it may name these declarations. The
// address exists so this Module's own root files and its two test homes have one
// spelling for them, not so another Module can reach in.

export type {
  AssessConditions,
  ConstrainingPayload,
  FrontmatterConfig,
  FrontmatterRule,
  NoFrontmatterPayload,
  RuleCommon,
  RulePayload,
  UnknownKeys,
} from './lib/section/section.types.ts';
