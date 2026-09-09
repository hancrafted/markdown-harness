// The response contract: the shape of everything `mh` writes to stdout.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: a re-exported subtree grows silently, so a declaration
// added to a types file becomes public without anyone deciding it.
//
// One runtime export, `isConfigError`. It cannot live beside its own types —
// ARCH-005 keeps a `types` file free of runtime values — so it sits in a `pure`
// sibling and is re-exported here, giving the Package one public shape.

export type {
  AbsentFile,
  AgentAction,
  AssessEvidence,
  AssessResult,
  AssessState,
  FreshFile,
  PromptSource,
  StaleFile,
  UnassessableFile,
  UngovernedFile,
  WinningRule,
} from './lib/assess.types.ts';
export type { AuditResult, RuleAudit, RuleRef, SelectorRef } from './lib/audit.types.ts';
export type { CheckResult, CheckSummary, FileViolations } from './lib/check.types.ts';
export { isConfigError } from './lib/config-error.pure.ts';
export type { ConfigErrorResult, ConfigFault, ConfigFaultCode } from './lib/config-error.types.ts';
export type {
  ConstrainingRequirements,
  FieldRequirement,
  GovernedPath,
  InvisiblePath,
  NoFrontmatterRequirements,
  QueryResult,
  Requirements,
} from './lib/query.types.ts';
export type {
  AssessResponse,
  AuditResponse,
  CheckResponse,
  MarkdownHarnessResponse,
  QueryResponse,
} from './lib/response.types.ts';
export type {
  CrossFieldViolation,
  CrossFieldViolationOf,
  FieldValue,
  FieldViolation,
  FieldViolationCode,
  FrontmatterForbiddenViolation,
  FrontmatterUnparseableViolation,
  UnknownKeyViolation,
  Violation,
} from './lib/violation.types.ts';
