// The config contract: the shape of the `markdown-harness` config file, as type
// declarations only. This Package exports no runtime value — a reader looking for
// the resolver or the check command is in the wrong place.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: it re-exports a whole subtree and grows silently, so a
// declaration added to a types file becomes public without anyone deciding it.
// Naming each one keeps the public surface a deliberate list.

export type {
  ConstrainingPayload,
  FrontmatterConfig,
  FrontmatterRule,
  Glob,
  MarkdownHarnessConfig,
  NoFrontmatterPayload,
  RuleCommon,
  RulePayload,
  RuleSelector,
  UnknownKeys,
} from './lib/config.types';

export type { AllowedValue, FieldAddress, FieldConstraints, Format } from './lib/constraints.types';
