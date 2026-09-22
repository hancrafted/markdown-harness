// The literal selector-token grammar shared by config validation and matching.
//
// This lives in Foundation because it is Core vocabulary: a Module validates
// the config spelling and later reaches the same spelling from a path. Keeping
// those operations together prevents a token from validating but matching
// nothing after normalisation.

export { fileNameOf, folderOf, isFileNameToken, isFolderToken } from './lib/tree/selector-grammar.pure.ts';
