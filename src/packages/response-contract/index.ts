// The response contract: the shape of everything `mh` writes to stdout.
//
// Every export is named explicitly rather than starred. `export *` would be the
// barrel ARCH-004 bans: a re-exported subtree grows silently, so a declaration
// added to a types file becomes public without anyone deciding it.
//
// Runtime exports sit in `pure` siblings because ARCH-005 keeps a `types` file
// free of values. The constructors and serialiser own envelope construction,
// so callers never re-spell the wire format.

export type {
  AbsentFile,
  AgentAction,
  AssessEvidence,
  AssessResult,
  AssessState,
  AssessedFile,
  FreshFile,
  ModuleAssess,
  ModuleAssessment,
  PromptSource,
  StaleFile,
  UnassessableFile,
  UngovernedFile,
  UnreadableFile,
  WinningRule,
} from './lib/assess.types.ts';
export type {
  AuditResult,
  ModuleAudit,
  ModuleAuditResult,
  RuleAudit,
  RuleRef,
  SelectorRef,
} from './lib/audit.types.ts';
export type {
  CheckResult,
  CheckSummary,
  FileViolations,
  ModuleCheck,
  ModuleFinding,
  ModuleViolations,
  RuleFindings,
} from './lib/check.types.ts';
export { isConfigError } from './lib/config-error.pure.ts';
// `ConfigFault` and `ConfigFaultCode` are re-exported from `config-contract`
// rather than declared here. They moved to repair a cycle — the Module port
// names a validation result, which names a fault, while this Package names
// `FieldConstraints` back out of `config-contract` — and they are re-exported so
// that every consumer that already reached for them at this address still can.
export type { ConfigFault, ConfigFaultCode } from '../config-contract/index.ts';
export type { ConfigErrorResult } from './lib/config-error.types.ts';
export type {
  ConstrainingRequirements,
  FieldRequirement,
  GovernedPath,
  InvisiblePath,
  ModuleClaim,
  ModuleRequirements,
  NoFrontmatterRequirements,
  QueryResult,
  Requirements,
} from './lib/query.types.ts';
export {
  assessResponse,
  auditResponse,
  checkResponse,
  configError,
  queryResponse,
  serializeResponse,
} from './lib/response.pure.ts';
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
