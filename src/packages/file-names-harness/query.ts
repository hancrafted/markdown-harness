// What this Module asks of one path, before anything exists there.
//
// The command this Module matters most to. A naming rule is the one kind of
// governance an agent needs BEFORE it writes — by the time `--check` can
// answer, the file already has the wrong name and renaming it is a second
// commit. `--query` is the surface that gets asked while the name is still
// being chosen.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import type { FileNameGovernance } from '../response-contract/index.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';
import { findFirstNameRule } from './lib/rules/name-selector.pure.ts';

/** This Module's own config key, never its Package name. */
const MODULE = 'file-names';

/**
 * Resolve one path against this Module's ordered rule list.
 *
 * `undefined` means no rule of THIS Module selected the path — never that the
 * path is invisible, which is a claim about every Module at once and is made
 * one tier up.
 *
 * The `file:` subject is handed back WHOLE rather than flattened into prose. An
 * agent reading it sees the shape an Operator would have to write, which is
 * what lets it construct a conforming name rather than guess at one from a
 * description.
 *
 * @param path The path asked about, exactly as the caller wrote it.
 * @param config A config that has already been validated.
 */
export function queryNames(path: string, config: MarkdownHarnessConfig): FileNameGovernance | undefined {
  const rules = config['file-names']?.rules ?? [];
  const winner = findFirstNameRule(normalisePath(path), rules, matchGlob);
  if (winner === undefined) return undefined;

  return {
    module: MODULE,
    rule: { ruleId: winner.ruleId, intent: winner.intent },
    requirements: { file: winner.file },
  };
}
