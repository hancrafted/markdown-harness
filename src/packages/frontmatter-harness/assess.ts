// What one governed file is worth believing, at one instant.
//
// The only command that reads a clock, and it never does: the instant arrives
// as an argument. That is what keeps this command inside the same guarantee as
// the rest of the tool — the same tree and the same instant give the same
// answer out — and it is why `--check` was left alone rather than taught to
// consult a date.
//
// READS ONLY. Nothing here writes to a tree, and nothing repairs frontmatter:
// the answer is advice to whoever asked, and the repair is theirs.
//
// Governance is decided BEFORE the file is opened, and the order is contract. A
// path no rule selects is answered without a read at all, which is what lets
// this command stay silent about files the config never claimed — a governance
// tool that comments on everything is one that gets switched off.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import type { AssessResult, WinningRule } from '../response-contract/index.ts';
import { effectivePrompt } from './lib/assess/assess-prompt.pure.ts';
import { assessResultFor } from './lib/assess/assess-result.pure.ts';
import { readAssessedFile } from './lib/assess/assessed-file.impure.ts';
import { freshnessOf } from './lib/assess/freshness.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';
import { normalisePath } from './lib/rules/path-shape.pure.ts';

/**
 * Assess one path against the config, at one instant.
 *
 * `root` and `path` arrive together because they are one fact in two halves:
 * where the config's globs are anchored, and which file inside that tree was
 * asked about. It is the same seam `--check` takes, for the same reason — a rule
 * is written relative to the tree it governs, so matching and reading have to
 * agree about where that tree starts. The CLI passes the current directory,
 * because `--assess` names one file rather than a corpus.
 *
 * @param file The corpus root, and the root-relative path asked about. It need not exist.
 * @param config A config that has already been validated.
 * @param now The Assessment instant, already known to name a moment.
 */
export function assessPath(
  file: { root: string; path: string },
  config: MarkdownHarnessConfig,
  now: string,
): AssessResult {
  const path = normalisePath(file.path);
  const winner = findFirstMatch(path, config.frontmatter?.rules ?? [], matchGlob);

  if (winner === undefined) return { agentAction: 'PROCEED', state: 'ungoverned' };

  const rule: WinningRule = { ruleId: winner.ruleId, intent: winner.intent };
  const found = readAssessedFile(file.root, path);
  const freshness = found.kind === 'text' ? freshnessOf(found.text, now) : undefined;

  return assessResultFor({
    rule,
    file: found,
    freshness,
    prompt: effectivePrompt(winner, config.frontmatter?.assess),
  });
}
