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
// typed. `SectionValidation` is the port's own shape, instantiated here at this
// Module's own section type.
//
// Called only for a key that was WRITTEN. An absent `frontmatter:` is the
// loader's answer now — `CONFIG_NO_MODULE_SECTION` against the file, decided
// once against the whole declared Module set rather than once per Module — so
// nothing below describes a config this Module was never named in.

import type { SectionValidation } from '../config-contract/index.ts';
import { sectionFaults } from './lib/validate/section-faults.pure.ts';
import { isFrontmatterConfig } from './lib/validate/section-narrowing.pure.ts';
import type { FrontmatterConfig } from './section.ts';

/**
 * Every fault the `frontmatter:` section carries, and the section itself if it
 * carries none.
 *
 * The predicate runs first and the fault walk runs only when it fails, so the
 * sound path validates exactly once. The failing path walks twice, and that is
 * the right way round: the second walk is what produces the faults the caller
 * is going to report anyway.
 *
 * @param section The value written under `frontmatter:`, whatever it parsed to.
 */
export function validateFrontmatterSection(section: unknown): SectionValidation<FrontmatterConfig> {
  if (isFrontmatterConfig(section)) return { section, faults: [] };
  return { faults: sectionFaults(section) };
}
