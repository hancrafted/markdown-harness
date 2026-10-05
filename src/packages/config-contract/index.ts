// The config contract: the vocabulary a Module's config section is BUILT from,
// the port a Module declares through, and the fault a config earns — as type
// declarations only. This Package exports no runtime value, and it no longer
// describes the config FILE: `MarkdownHarnessConfig` retired with nothing in its
// place, because a dynamic Module set has no single interface over the whole
// file that describes a consumer this architecture has.
//
// What is NOT here is anything one Module owns: its section, the vocabulary
// only its section uses, and the config faults only its grammar can earn. Those
// live in the Module's own Package (ARCH-008), which is what lets the import
// graph catch one Module reaching into another and keeps this Package
// Module-free.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: it re-exports a whole subtree and grows silently, so a
// declaration added to a types file becomes public without anyone deciding it.
// Naming each one keeps the public surface a deliberate list.

export type { ConfigFault, ConfigFaultCode } from './lib/fault.types.ts';

export type { LoadedConfig, ModuleDescriptor, SectionValidation } from './lib/module.types.ts';

export type { FileName, FolderPath, Selector } from './lib/selector.types.ts';
