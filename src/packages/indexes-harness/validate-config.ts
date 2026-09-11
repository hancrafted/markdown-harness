// This Module's half of the config catalog, as the loader sees it.
//
// The same shape `frontmatter-harness/validate-config.ts` has, and deliberately
// so: the loader cannot type a section without knowing that Module's
// vocabulary, so the Module that can is the one that hands it over already
// typed. A third Module adds a third file of this shape and no edit to the
// loader beyond naming its key.

import { indexesSectionFaults, isIndexesConfig } from './lib/validate/indexes-section.pure.ts';
import type { IndexesValidation } from './lib/validate/validate.types.ts';

export type { IndexesValidation } from './lib/validate/validate.types.ts';

/**
 * Every fault the `indexes:` section carries, and the section itself if it
 * carries none.
 *
 * An ABSENT section is sound and yields no section, which is the one difference
 * from the `frontmatter:` half: that Module is required for a config to govern
 * anything at all, while this one is opt-in on top of it. A config with no
 * `indexes:` key generates nothing and that is not a fault.
 *
 * @param section The value written under `indexes:`, or `undefined` if the key was never written.
 */
export function validateIndexesSection(section: unknown): IndexesValidation {
  if (section === undefined) return { faults: [] };
  if (isIndexesConfig(section)) return { section, faults: [] };
  return { faults: indexesSectionFaults(section) };
}
