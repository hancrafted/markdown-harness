// Every governed file's naming violations, across one corpus.
//
// THIS MODULE NEVER OPENS A FILE. It takes the corpus as a list of paths and
// judges the paths, which is why it cannot fail the way the frontmatter Module
// can: there is no read to refuse, so no `unreadable` branch exists here and
// none is missing. The same property is what makes a naming answer available
// for a file that does not exist yet — the case an agent choosing a name is
// actually in.
//
// It is also why this Module takes no `root`. A root is where bytes are found,
// and no bytes are wanted.
//
// COMPOSITION is not here. This answers for the `file-names` Module and nothing
// else; merging its answer with the frontmatter Module's, and counting the
// union, is `corpus-verdict`'s job.

import type { MarkdownHarnessConfig } from '../config-contract/index.ts';
import { normalisePath } from '../markdown-file-tree/normalise-path.ts';
import type { NameOutcome } from './lib/check/name-check.types.ts';
import { violationsForName } from './lib/check/name-verdict.pure.ts';
import { matchGlob } from './lib/rules/glob-match.impure.ts';
import { findFirstNameRule } from './lib/rules/name-selector.pure.ts';

/** This Module's own config key, carried on every block it produces. */
const MODULE = 'file-names';

/**
 * Check one corpus against this Module's ordered rule list.
 *
 * One outcome per GOVERNED file, conforming ones included, in walker order.
 * Nothing here sorts: the walker's order is the report's order.
 *
 * @param files The corpus, as root-relative paths in walker order.
 * @param config A config that has already been validated.
 */
export function checkNames(files: readonly string[], config: MarkdownHarnessConfig): readonly NameOutcome[] {
  const rules = config['file-names']?.rules ?? [];

  return files.flatMap((raw) => {
    const path = normalisePath(raw);
    const rule = findFirstNameRule(path, rules, matchGlob);
    if (rule === undefined) return [];

    return [
      {
        path,
        findings: {
          module: MODULE,
          ruleId: rule.ruleId,
          ruleIntent: rule.intent,
          violations: violationsForName(path, rule),
        },
      },
    ];
  });
}
