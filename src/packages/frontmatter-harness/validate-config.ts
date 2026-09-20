/**
 * This Module's section validator for frontmatter.
 */

import type { SectionValidation } from '../config-contract/index.ts';
import { sectionFaults } from './lib/validate/section-faults.pure.ts';
import { isFrontmatterConfig } from './lib/validate/section-narrowing.pure.ts';
import type { FrontmatterConfig } from './section.types.ts';

/**
 * Validate the `frontmatter:` section.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function validateFrontmatterSection(section: unknown): SectionValidation<FrontmatterConfig> {
  if (section === undefined) return { faults: [] };
  if (isFrontmatterConfig(section)) return { section, faults: [] };
  return { faults: sectionFaults(section) };
}
