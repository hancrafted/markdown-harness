/**
 * The envelope every command returns.
 *
 * A discriminated union on `command`, not a generic `Response<T>`: what was
 * asked travels with what was answered, so two runs of the same corpus under
 * different configs stay distinguishable.
 *
 * No shared base interface for the one field all commands have in common —
 * `config: string` written per variant costs two lines and saves every reader a
 * hop, and a base named after what the variants share ends up named after
 * nothing.
 */

import type { AuditResult } from './audit.types.ts';
import type { ConfigErrorResult } from './config-error.types.ts';
import type { QueryResult } from './query.types.ts';

/** The `--query` envelope. */
export interface QueryResponse {
  /** The discriminant, naming what was asked. */
  command: 'query';
  /** The path asked about, echoed exactly as the caller wrote it. It need not exist. */
  path: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** The answer, or the reason the config could not be trusted. */
  result: QueryResult | ConfigErrorResult;
}

/** The `--audit` envelope. */
export interface AuditResponse {
  /** The discriminant, naming what was asked. */
  command: 'audit';
  /** The corpus directory, echoed exactly as the caller wrote it — never resolved. */
  root: string;
  /** The config path, echoed exactly as the caller wrote it — never resolved. */
  config: string;
  /** Every rule's fate, or the reason the config could not be trusted. */
  result: AuditResult | ConfigErrorResult;
}
