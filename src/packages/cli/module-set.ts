// The declared Module set: the ONE place a Module is declared.
//
// ARCH-008 §4.1 — `cli` is the only Package that may compose a Module with the
// Core, and this file is the whole of that composition. Adding a Module is one
// import and one entry here; everything else follows. The recognised top-level
// config key set is COMPUTED from this list by the loader, so no hand-maintained
// key list exists anywhere and the config language cannot drift apart from the
// Modules the tool actually ships.
//
// The import-graph rule that forbids one Module importing another is written
// against an explicit Module list inside `.dependency-cruiser.cjs` rather than
// against a naming convention, so a Module added here is a reviewed edit there
// too. The two lists are deliberately separate: one composes, one enforces, and
// a rule derived from the thing it checks could not fail.

import type { ModuleDescriptor } from '../config-contract/index.ts';
import { frontmatterModule } from '../frontmatter-harness/module.ts';

/**
 * Every Module this tool ships, in the order their faults are reported.
 *
 * `satisfies` rather than an annotation, so each entry keeps its own section
 * type for a caller that names one descriptor while the list as a whole still
 * has to be a set of descriptors. The two are only compatible because the port
 * carries one member with its section type in RETURN position: a second member
 * taking a section as an argument would make this widening unsound, which is the
 * variance hole the one-member port exists to close.
 *
 * ONE COMPILE-TIME GUARANTEE IS SPENT HERE. A whole-config interface could not
 * declare a key twice (`TS2300`); a list can, so two descriptors both claiming
 * `'frontmatter'` compile clean. A duplicate key is a COMPOSITION error rather
 * than a config error — the Operator wrote nothing wrong — so it is not a
 * `ConfigFaultCode`, and the replacement is `tests/module-set.test.ts`.
 */
export const MODULE_SET = [frontmatterModule] as const satisfies readonly ModuleDescriptor<unknown>[];
