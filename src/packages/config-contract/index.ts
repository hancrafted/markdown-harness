// The config contract: the shared vocabulary a section is built from
// (selector, constraint, claim, fault) plus the port.
// This Package exports no runtime value — a reader looking for
// the resolver or the check command is in the wrong place.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: it re-exports a whole subtree and grows silently, so a
// declaration added to a types file becomes public without anyone deciding it.
// Naming each one keeps the public surface a deliberate list.

export type {
  Claim,
  ClaimExtent,
  ClaimKind,
  ClaimSite,
  ClaimStance,
  NameGrammar,
  NameSegment,
  NamedExtent,
  NamedSelector,
  TopLevelKey,
} from './lib/claim.types.ts';
export type { AllowedValue, FieldAddress, FieldConstraints, Format } from './lib/constraints.types.ts';
export type {
  ConfigConflict,
  ConfigFault,
  ConfigFaultCode,
  ConfigRejection,
  ConflictClaim,
  ConflictSubject,
} from './lib/fault.types.ts';
export type { ModuleDescriptor, SectionValidation } from './lib/module.types.ts';
export type { FileName, FolderPath, Selector } from './lib/selector.types.ts';
