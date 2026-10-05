// This Module's half of the config catalog.
//
// The section arrives as an opaque value, and what goes back is the section
// itself when it is sound, already typed, alongside every fault it carries.
// Called only for a key that was WRITTEN: an absent `body-structure:` is the
// loader's answer, decided once against the whole declared Module set.

import type { SectionValidation } from '../config-contract/index.ts';
import type { BodyStructureFaultCode } from './lib/validate/fault.types.ts';
import { isBodyStructureConfig, sectionFaults } from './lib/validate/section-faults.pure.ts';
import type { BodyStructureConfig } from './section.ts';

/**
 * Every fault the `body-structure:` section carries, and the section itself if
 * it carries none.
 *
 * @param section The value written under `body-structure:`, whatever it parsed to.
 */
export function validateBodyStructureSection(
  section: unknown,
): SectionValidation<BodyStructureConfig, BodyStructureFaultCode> {
  if (isBodyStructureConfig(section)) return { section, faults: [] };
  return { faults: sectionFaults(section) };
}
