// How this Module reaches the Core: one descriptor, one top-level key.
//
// The whole of this Package's registration surface. `cli` holds the one list a
// Module is declared in, and this is the single value that list names — so
// adding a Module is one file like this one plus one entry there, and the
// recognised top-level key set follows from the list rather than from a literal
// anybody has to remember to edit.
//
// It is a root entry point rather than an `index.ts` because this Package
// already exposes four narrow ones. A barrel re-exporting the subtree is what
// ARCH-004 bans; a fifth narrow entry point is what it asks for.

import type { ModuleDescriptor } from '../config-contract/index.ts';
import type { FrontmatterConfig } from './section.ts';
import { validateFrontmatterSection } from './validate-config.ts';

/**
 * This Module, as the Core sees it.
 *
 * The descriptor's IDENTITY is what a section is later looked up by, so there is
 * exactly one of these and it is a constant rather than a factory: two objects
 * carrying the same key would be two Modules to `sectionFor`, and the second
 * would find nothing.
 *
 * `validateSection` is not `validateFrontmatterSection` itself. The indirection
 * is a seam rather than ceremony — the port's parameter is `unknown` and this
 * Module's function may narrow its own argument later without the descriptor
 * changing shape.
 */
export const frontmatterModule: ModuleDescriptor<FrontmatterConfig> = {
  key: 'frontmatter',
  validateSection(raw: unknown) {
    return validateFrontmatterSection(raw);
  },
};
