/**
 * Compose every Module's rule tallies into the answer `--audit` returns.
 *
 * A rule id is unique only inside one Module section. Keeping every Module's
 * rows under the descriptor key that owns them preserves that scope and keeps
 * declared Module order without inventing a second global identity.
 */

import type { AuditResult, ModuleAudit } from '../../../response-contract/index.ts';

/** One Module's audit, paired with the descriptor key composition reports. */
interface ModuleAnswer {
  /** The Module's top-level config key. */
  module: string;
  /** Every rule that Module declared, including none. */
  audit: ModuleAudit;
}

/**
 * Every Module's audit block, in declared Module order.
 *
 * Empty audits remain present. A Module that governs without rules still needs
 * an attributable place in the report, and omitting it would turn "no rules"
 * into "not asked".
 */
export function auditReport(answers: readonly ModuleAnswer[]): AuditResult {
  return {
    modules: answers.map((answer) => ({ module: answer.module, rules: answer.audit.rules })),
  };
}
