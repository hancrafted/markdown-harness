// The declared Module set, and the only place it is written down.
//
// Both members of ModuleDescriptor are methods, which keeps method syntax
// bivariant in TypeScript even under strict.

import type { ModuleDescriptor } from '../config-contract/index.ts';
import { frontmatterModule } from '../frontmatter-harness/index.ts';

export const MODULE_SET = [frontmatterModule] as const satisfies readonly ModuleDescriptor<unknown>[];
