// The response contract: the shape of everything `mh` writes to stdout.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: a re-exported subtree grows silently, so a declaration
// added to a types file becomes public without anyone deciding it.
//
// Two runtime exports, `isConfigError` and `FIELD_VIOLATION_CODES`. Neither can
// live beside its own types — ARCH-005 keeps a `types` file free of runtime
// values — so each sits in a `pure` sibling and is re-exported here, giving the
// Package one public shape. `FIELD_VIOLATION_CODES` is the reason the catalog is
// a value at all: a consumer that cannot reach it cannot enumerate the codes.

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
export type {
  CheckResult,
  CheckSummary,
  FileNameFindings,
  FileViolations,
  FrontmatterFindings,
  ModuleFindings,
} from './lib/check.types.ts';
export { isConfigError } from './lib/config-error.pure.ts';
export type { ConfigErrorResult, ConfigFault, ConfigFaultCode } from './lib/config-error.types.ts';
export { FILE_NAME_VIOLATION_CODES } from './lib/file-name-violation.pure.ts';
export type { FileNameViolationCode, NameRequirement, SegmentViolation } from './lib/file-name-violation.types.ts';
export type {
  ConstrainingRequirements,
  FieldRequirement,
  FileNameGovernance,
  FrontmatterGovernance,
  GovernedPath,
  InvisiblePath,
  ModuleGovernance,
  NameRequirements,
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
export { FIELD_VIOLATION_CODES } from './lib/violation.pure.ts';
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
