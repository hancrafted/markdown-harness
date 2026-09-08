// This Module's half of the config catalog.
//
// The loader owns the four faults that name the config FILE; everything from
// the `frontmatter:` key down names a key inside it and is decided here. The
// section arrives as an opaque value rather than as a parsed config: a loader
// that knew the rule language would have to be edited to gain a second Module.
//
// What goes back is the section itself when it is sound, not merely a verdict
// on it. The loader cannot type the section — that would mean knowing the rule
// language — so the Module that can is the one that must hand it over already
// typed.

import { sectionFaults } from './lib/validate/section-faults.pure.ts';
import { isFrontmatterConfig } from './lib/validate/section-narrowing.pure.ts';
import type { SectionValidation } from './lib/validate/validate.types.ts';

export type { SectionValidation } from './lib/validate/validate.types.ts';

/**
 * Every fault the `frontmatter:` section carries, and the section itself if it
 * carries none.
 *
 * The predicate runs first and the fault walk runs only when it fails, so the
 * sound path validates exactly once. The failing path walks twice, and that is
 * the right way round: the second walk is what produces the faults the caller
 * has to report anyway.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function validateFrontmatterSection(section: unknown): SectionValidation {
  if (isFrontmatterConfig(section)) return { section, faults: [] };
  return { faults: sectionFaults(section) };
}
