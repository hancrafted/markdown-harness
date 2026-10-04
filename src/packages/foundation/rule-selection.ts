// Rule selection: which files a Rule claims, which Rule wins a file, and how
// every Rule fared across a corpus.
//
// Published from this gate-owned Package because two Modules select with the
// same Core vocabulary and neither may import the other (ARCH-008 §1.1). Each
// used to restate it; `body-structure-harness` said so in its own docblock.
// The Core selector is two literal axes (design-ADR 0007): a Module's extra
// axis stays in the Module and reaches this file as a callback (design-ADR
// 0012). Restating was recorded as deliberate in design-ADR 0020; design-ADR
// 0022 amends that point.

export { firstMatch, reaches, selectionFor, selectorMatches, selectorRefFor } from './lib/rules/rule-selection.pure.ts';
export type { RuleHead, Selection, TallyReading } from './lib/rules/rule-selection.types.ts';
export { tallyRules } from './lib/rules/rule-tally.pure.ts';
