/**
 * Compose every Module's rule tallies into the answer `audit` returns.
 *
 * A rule id is unique only inside one Module section. Keeping every Module's
 * rows under the descriptor key that owns them preserves that scope and keeps
 * declared Module order without inventing a second global identity.
 */

import type { Unreadable } from '../../../foundation/read-corpus.ts';
import type { AuditResult, ModuleAudit } from '../../../response-contract/index.ts';
import { settledAnswers } from './module-answers.pure.ts';
import type { AuditAnswer, ModuleAnswer } from './module-answers.types.ts';

/**
 * Every Module's audit block, in declared Module order.
 *
 * Empty audits remain present. A Module that governs without rules still needs
 * an attributable place in the report, and omitting it would turn "no rules"
 * into "not asked".
 */
export function auditReport(answers: readonly ModuleAnswer<ModuleAudit>[]): AuditResult {
  return {
    modules: answers.map((answer) => ({ module: answer.module, rules: answer.answer.rules })),
  };
}

/**
 * Refuse an incomplete audit, or compose every Module's tally.
 *
 * A Module that selects on file content has to open a file to tally it
 *, so an audit can now fail to read one. The first refusal
 * in declared Module order wins before anything is composed, for the same
 * reason `checkVerdict` refuses: a report quietly missing a file looks
 * complete.
 *
 * @param answers Each Module's answer under its own config key, in declared Module order.
 */
export function auditVerdict(
  answers: readonly ModuleAnswer<AuditAnswer>[],
): { kind: 'audited'; result: AuditResult } | Unreadable {
  const settled = settledAnswers<ModuleAudit>(answers);
  if ('kind' in settled) return settled;
  return { kind: 'audited', result: auditReport(settled) };
}
