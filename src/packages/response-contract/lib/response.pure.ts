/**
 * The constructors and JSON serialisation for every response envelope.
 *
 * The response contract owns both the shapes and their construction, so every
 * caller names its invocation values without re-spelling the wire format.
 */

import type { ConfigFault } from '../../config-contract/index.ts';
import type { AssessResult } from './assess.types.ts';
import type { AuditResult } from './audit.types.ts';
import type { CheckResult } from './check.types.ts';
import type { ConfigErrorResult } from './config-error.types.ts';
import type { QueryResult } from './query.types.ts';
import type {
  AssessResponse,
  AuditResponse,
  CheckResponse,
  MarkdownHarnessResponse,
  QueryResponse,
} from './response.types.ts';

/** The result every command returns when it cannot trust the config. */
export function configError(faults: readonly ConfigFault<string>[]): ConfigErrorResult {
  return { error: 'CONFIG_REJECTED', faults };
}

/**
 * Construct the envelope for `check`.
 *
 * Every constructor takes what was asked as one object and copies only the
 * fields its envelope names, so a caller can hand over everything it gathered
 * without an extra key reaching the wire.
 */
export function checkResponse<TViolation>(
  invocation: Pick<CheckResponse, 'modules' | 'root' | 'config'>,
  result: CheckResult<TViolation> | ConfigErrorResult,
): CheckResponse<TViolation> {
  const { modules, root, config } = invocation;
  return { command: 'check', modules, root, config, result };
}

/** Construct the envelope for `query`. */
export function queryResponse<TRequirements>(
  invocation: Pick<QueryResponse, 'modules' | 'path' | 'config'>,
  result: QueryResult<TRequirements> | ConfigErrorResult,
): QueryResponse<TRequirements> {
  const { modules, path, config } = invocation;
  return { command: 'query', modules, path, config, result };
}

/** Construct the envelope for `audit`. */
export function auditResponse(
  invocation: Pick<AuditResponse, 'modules' | 'root' | 'config'>,
  result: AuditResult | ConfigErrorResult,
): AuditResponse {
  const { modules, root, config } = invocation;
  return { command: 'audit', modules, root, config, result };
}

/** Construct the envelope for `assess`. */
export function assessResponse(
  invocation: Pick<AssessResponse, 'modules' | 'path' | 'now' | 'config'>,
  result: AssessResult | ConfigErrorResult,
): AssessResponse {
  const { modules, path, now, config } = invocation;
  return { command: 'assess', modules, path, now, config, result };
}

/** Serialize one response with the contract's two-space indentation and trailing newline. */
export function serializeResponse<TRequirements, TViolation>(
  response: MarkdownHarnessResponse<TRequirements, TViolation>,
): string {
  return `${JSON.stringify(response, null, 2)}\n`;
}
