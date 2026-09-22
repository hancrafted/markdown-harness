/**
 * Compose every Module's answer about one path into `--assess`'s result.
 *
 * A Module may assess a path or pass it by. Only this composing Package can see
 * every answer, so only this function can claim the path is ungoverned.
 */

import type { AssessResult, ModuleAssess, ModuleAssessment } from '../../../response-contract/index.ts';

/**
 * One path's assessments in declared Module order.
 *
 * Module states are never ranked or merged. Two Modules can legitimately tell
 * an agent different things, and both Operator instructions must survive.
 */
export function pathAssessment(
  answers: readonly { module: string; assessment: ModuleAssess | undefined }[],
): AssessResult {
  const modules: ModuleAssessment[] = [];

  for (const answer of answers) {
    if (answer.assessment === undefined) continue;
    modules.push({ module: answer.module, ...answer.assessment });
  }

  if (modules.length === 0) return { agentAction: 'PROCEED', state: 'ungoverned' };

  return { modules };
}
