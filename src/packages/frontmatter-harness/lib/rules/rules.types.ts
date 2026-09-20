/**
 * Types for rule selection.
 */

/**
 * What one rule did with one path.
 *
 * Three states rather than a boolean, because `--audit` has to tell the two
 * ways of not selecting apart: a rule whose selectors never reached a file is
 * reporting a possible typo, while a rule whose own `excludeFiles` removed one
 * is reporting the exclusion working.
 */
export type RuleSelection = 'selected' | 'excluded' | 'unselected';
