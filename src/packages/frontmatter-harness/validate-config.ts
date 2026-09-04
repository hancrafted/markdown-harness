// This Module's half of the config catalog.
//
// The loader owns the four faults that name the config FILE; everything from
// the `frontmatter:` key down names a key inside it and is decided here. The
// section arrives as an opaque value rather than as a parsed config: a loader
// that knew the rule language would have to be edited to gain a second Module.

import type { ConfigFault } from '../response-contract/index.ts';
import { sectionFaults } from './lib/validate/section-faults.pure.ts';

/**
 * Every fault the `frontmatter:` section carries.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function validateFrontmatterSection(section: unknown): readonly ConfigFault[] {
  return sectionFaults(section);
}
