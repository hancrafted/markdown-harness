// The named formats, as one grammar per name, shared by every Module.
//
// A Package of its own because a named format is PORTABLE SPECIFICATION rather
// than one Module's behaviour. `frontmatter:` judges a field value against
// `format: datetime`; `file-names:` judges a name segment against
// `format: kebab-case`. Both are the same claim about the same string, and a
// reimplementation in another language has to agree with both at once.
//
// It sits here rather than inside either Module because ARCH-004 forbids
// reaching into another Package's internals: the grammar had to become a
// Package the moment a second Module needed to read it. Copying it instead
// would give one portable contract two authors, which is the failure the
// `FIELD_VIOLATION_CODES` catalog is written as a single value to avoid.
//
// It is NOT in `config-contract`, which declares the config language and
// deliberately exports no runtime value at all.

export { matchesFormat } from './lib/format-grammar.pure.ts';
