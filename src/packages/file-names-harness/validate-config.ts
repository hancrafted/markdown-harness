// Whether the `file-names:` section is one this Module can act on.
//
// The loader owns the four faults that name the config FILE — not found,
// unreadable, not YAML, and an unrecognised TOP-LEVEL key. Everything from the
// `file-names:` key down is decided here, because a loader that understood a
// Module's rule language would have to be edited every time a Module was added.
// That the loader did not need teaching about segments is the growth rule
// working.
//
// What goes back is the section itself when it is sound, not merely a verdict
// on it, so the caller never has to re-narrow a value this file already proved.

import type { FileNamesConfig } from '../config-contract/index.ts';
import { sectionFaults } from './lib/validate/name-rule-faults.pure.ts';
import type { NameSectionValidation } from './lib/validate/name-validate.types.ts';

/**
 * Whether a section is assignable to the type the config contract declares.
 *
 * The validator is the whole check, and there is deliberately no second
 * structural walk here. Two descriptions of one shape drift apart, and the
 * quieter one wins the moment they disagree — so this asks the only authority
 * there is. `sectionFaults` already visits every rule, every subject and every
 * segment.
 *
 * GUARDED, and it must stay guarded. An unconditional assertion would be silent
 * in both the ways that matter: if the validator never learned to check a key
 * the contract declares, or if an edit moved the assertion above the
 * validation, nothing would fail and nothing would say so.
 *
 * @param section The value written under `file-names:`.
 */
function isFileNamesConfig(section: unknown): section is FileNamesConfig {
  return section !== undefined && sectionFaults(section).length === 0;
}

/**
 * Validate the `file-names:` section.
 *
 * An absent key is not a fault: governance is opt-in, and a repo that never
 * writes this section simply has no naming rules. It is distinguished from a
 * present-but-empty section, which IS a fault — an empty rule list is almost
 * always a half-finished edit, and treating it as "governs nothing" would make
 * the two indistinguishable.
 *
 * @param section The value written under `file-names:`, or `undefined` if the
 * key was never written.
 */
export function validateFileNamesSection(section: unknown): NameSectionValidation {
  if (section === undefined) return { faults: [] };
  if (isFileNamesConfig(section)) return { section, faults: [] };
  return { faults: sectionFaults(section) };
}
