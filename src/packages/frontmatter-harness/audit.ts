// How every rule fared across one corpus.
//
// `--audit` resolves rules against PATHS and never opens a file, which is why
// this takes a file list rather than a root: enumeration belongs to
// `foundation`, and keeping it out of here is what lets the walker's
// refusals be proven before frontmatter parsing can confuse a failure.
//
// It takes the paths and deliberately not a governed subset. "Governed" is
// per-Module, and `shadowed` needs every rule that selected each file rather
// than only the winner — a subset would have thrown that away upstream.

import { normalisePath } from '../foundation/path-shape.ts';
import type { ModuleAudit } from '../response-contract/index.ts';
import { tallyRules } from './lib/audit/rule-tally.pure.ts';
import type { FrontmatterConfig } from './section.ts';

/**
 * Tally this Module's ordered rule list across a corpus.
 *
 * Takes THIS MODULE'S SECTION rather than the whole config, and no longer
 * reaches for its own key inside one: the key is the loader's business and the
 * grammar below it is this Module's, so nothing here has to know it was called
 * `frontmatter:` on the way in.
 *
 * @param files The corpus, as root-relative paths in walker order.
 * @param section This Module's validated section, or `undefined` when its key was not written — a Module governing nothing tallies nothing.
 */
export function auditRules(files: readonly string[], section: FrontmatterConfig | undefined): ModuleAudit {
  const normalised = files.map(normalisePath);
  return { rules: tallyRules(normalised, section?.rules ?? []) };
}
