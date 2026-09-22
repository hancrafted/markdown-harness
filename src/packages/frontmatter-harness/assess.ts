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
//
// The READ is `foundation`'s. Absence is an ordinary answer here rather than a
// failure — the same reading that lets `--query` answer about a path that does
// not exist — while `--check`, reading through the same gate, refuses a corpus
// on it. That difference is policy and it lives at these two call sites, which
// is the whole point of a gate that answers rather than throws.
//
// `unreadable` is covered by planting a directory named `unreadable.md` in the
// assess integration suite. A committed corpus cannot hold that shape as a
// document, so the explicit filesystem case stays beside the entry point.
//
// Corpus membership is asked first, for the same reason `--query` asks it: a
// selector carries no extension any more, so without it this command would
// start assessing a `.txt` file the corpus walk would never have collected.

import { isCorpusPath } from '../foundation/corpus-membership.ts';
import { readTextIn } from '../foundation/read-text.ts';
import type { ModuleAssess, WinningRule } from '../response-contract/index.ts';
import { effectivePrompt } from './lib/assess/assess-prompt.pure.ts';
import { assessResultFor } from './lib/assess/assess-result.pure.ts';

import { normalisePath } from '../foundation/path-shape.ts';
import { freshnessOf } from './lib/assess/freshness.pure.ts';
import { findFirstMatch } from './lib/rules/first-match.pure.ts';
import type { FrontmatterConfig } from './section.ts';

/**
 * Assess one path against this Module's section, at one instant.
 *
 * `root` and `path` arrive together because they are one fact in two halves:
 * where the config's globs are anchored, and which file inside that tree was
 * asked about. It is the same seam `--check` takes, for the same reason — a rule
 * is written relative to the tree it governs, so matching and reading have to
 * agree about where that tree starts. The CLI passes the current directory,
 * because `--assess` names one file rather than a corpus.
 *
 * @param file The corpus root, and the root-relative path asked about. It need not exist.
 * @param section This Module's validated section, or `undefined` when its key was not written — a Module governing nothing passes the path by.
 * @param now The Assessment instant, already known to name a moment.
 */
export function assessPath(
  file: { root: string; path: string },
  section: FrontmatterConfig | undefined,
  now: string,
): ModuleAssess | undefined {
  const path = normalisePath(file.path);
  const winner = isCorpusPath(path) ? findFirstMatch(path, section?.rules ?? []) : undefined;

  if (winner === undefined) return undefined;

  const rule: WinningRule = { ruleId: winner.ruleId, intent: winner.intent };
  const found = readTextIn(file.root, path);
  const freshness = found.kind === 'text' ? freshnessOf(found.text, now) : undefined;

  return assessResultFor({
    rule,
    file: found,
    freshness,
    prompt: effectivePrompt(winner, section?.assess),
  });
}
