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
export function configError(faults: readonly ConfigFault[]): ConfigErrorResult {
  return { error: 'CONFIG_REJECTED', faults };
}

/** Construct the envelope for `--check`. */
export function checkResponse(root: string, config: string, result: CheckResult | ConfigErrorResult): CheckResponse {
  return { command: 'check', root, config, result };
}

/** Construct the envelope for `--query`. */
export function queryResponse(path: string, config: string, result: QueryResult | ConfigErrorResult): QueryResponse {
  return { command: 'query', path, config, result };
}

/** Construct the envelope for `--audit`. */
export function auditResponse(root: string, config: string, result: AuditResult | ConfigErrorResult): AuditResponse {
  return { command: 'audit', root, config, result };
}

/** Construct the envelope for `--assess`. */
export function assessResponse(
  invocation: Pick<AssessResponse, 'path' | 'now' | 'config'>,
  result: AssessResult | ConfigErrorResult,
): AssessResponse {
  const { path, now, config } = invocation;
  return { command: 'assess', path, now, config, result };
}

/** Serialize one response with the contract's two-space indentation and trailing newline. */
export function serializeResponse(response: MarkdownHarnessResponse): string {
  return `${JSON.stringify(response, null, 2)}\n`;
}
