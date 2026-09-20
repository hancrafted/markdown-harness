import type { ModuleDescriptor } from '../config-contract/index.ts';
import { claimsForFrontmatter } from './lib/claims/claims-for.pure.ts';
import type { FrontmatterConfig } from './section.types.ts';
import { validateFrontmatterSection } from './validate-config.ts';

export const frontmatterModule: ModuleDescriptor<FrontmatterConfig> = {
  key: 'frontmatter',
  validateSection: validateFrontmatterSection,
  claimsFor: claimsForFrontmatter,
};
