/**
 * What rule resolution answers about one rule and one path.
 *
 * There is no matcher seam here any more. A selector carries two axes of
 * literal tokens and no wildcard, so resolution compares strings and reaches no
 * platform function at all — the seam that existed to keep the deterministic
 * half deterministic has nothing left to keep out.
 */

/**
 * What one rule did with one path.
 *
 * Three states rather than a boolean, because `--audit` has to tell the two
 * ways of not selecting apart: a rule whose axes never reached a file is
 * reporting a possible typo, while a rule whose own `excludeFiles` removed one
 * is reporting the exclusion working. Collapsing them would make the
 * diagnostic silent in the direction it exists to speak.
 */
export type RuleSelection = 'selected' | 'excluded' | 'unselected';
