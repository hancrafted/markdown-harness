/**
 * Earn the config type for a validated section, rather than asserting it.
 */

import type { FrontmatterConfig } from '../../section.types.ts';
import { sectionFaults } from './section-faults.pure.ts';

/**
 * Whether a section is assignable to FrontmatterConfig.
 *
 * @param section The value written under `frontmatter:`, or `undefined` if the key was never written.
 */
export function isFrontmatterConfig(section: unknown): section is FrontmatterConfig {
  if (section === undefined || section === null || typeof section !== 'object') return false;
  return sectionFaults(section).length === 0;
}
