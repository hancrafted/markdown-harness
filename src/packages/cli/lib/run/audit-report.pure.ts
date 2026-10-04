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

/** A Module's audit, or the first candidate file it could not read. */
type GatheredAudit = ModuleAudit | { kind: 'unreadable'; path: string };

/** Whether one Module's answer is a read refusal rather than a tally. */
function isUnreadable(audit: GatheredAudit): audit is { kind: 'unreadable'; path: string } {
  return 'kind' in audit && audit.kind === 'unreadable';
}

/**
 * Refuse an incomplete audit, or compose every Module's tally.
 *
 * A Module that selects on file content has to open a file to tally it
 * (design-ADR 0015), so an audit can now fail to read one. The first refusal
 * in declared Module order wins before anything is composed, for the same
 * reason `checkVerdict` refuses: a report quietly missing a file looks
 * complete.
 *
 * @param answers Each Module's answer under its own config key, in declared Module order.
 */
export function auditVerdict(
  answers: readonly { module: string; audit: GatheredAudit }[],
): { kind: 'audited'; result: AuditResult } | { kind: 'unreadable'; path: string } {
  const tallies: ModuleAnswer[] = [];
  for (const answer of answers) {
    if (isUnreadable(answer.audit)) return { kind: 'unreadable', path: answer.audit.path };
    tallies.push({ module: answer.module, audit: answer.audit });
  }
  return { kind: 'audited', result: auditReport(tallies) };
}
