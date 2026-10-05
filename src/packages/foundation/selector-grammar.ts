// The literal selector-token grammar shared by config validation and matching.
//
// Validation and matching both live in `foundation` now (`selector-faults.ts`,
// `rule-selection.ts`), so only the path-reading half is
// published; the token predicates are reached inside the Package.
//
// This lives in Foundation because it is Core vocabulary: a Module validates
// the config spelling and later reaches the same spelling from a path. Keeping
// those operations together prevents a token from validating but matching
// nothing after normalisation.

export { fileNameOf, folderOf } from './lib/tree/selector-grammar.pure.ts';
