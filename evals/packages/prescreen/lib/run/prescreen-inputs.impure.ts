// What the pre-screen reads from the checkout: the case's task and carrier first half, and
// the corpus a candidate word must not occur in. Impure only for the reads.

import { parse as parseYaml } from 'yaml';
import { deriveArm, testedCarrierAddress } from '../../../arms/derive-arms.ts';
import { readText, readTextFiles } from '../../../platform/host-files.ts';
import { promptsFor } from '../screen/prescreen-parts.pure.ts';

export const CASE_FILE = 'evals/suites/steering/cases/research-note.yaml';

// Deliberately a second copy of `CORPUS_SKIP` in `adapters/lib/provider/trial-setup.impure.ts`,
// plus `runs`, which holds earlier screens' answers and would put a drawn word in the corpus.
// One shared home would need a root export on `adapters` (a tool-invoked Package this one has no
// reason to depend on) or on `session` (which owns minting, not the corpus policy); the two lists
// differ by one entry and each Package is the only reader of its own. Revisit if a third reader appears.
const CORPUS_SKIP = ['node_modules', 'dist', '.git', '.worktrees', '.claude', '.scratch', 'runs'];

interface CaseRow {
  readonly vars: {
    readonly task: string;
    readonly seedDir: string;
    readonly carriers: readonly { readonly placeholder: string }[];
  };
}

function firstHalfOf(checkout: string, vars: CaseRow['vars']): string {
  const configText = readText(`${checkout}/${vars.seedDir}/markdown-harness.config.yaml`);
  const placeholder = vars.carriers[0]?.placeholder ?? '';
  const address = testedCarrierAddress(configText, placeholder);
  const derived = deriveArm({ configText, arm: 'steered', substitutes: [{ placeholder, clause: '' }] });
  return derived.carriers.find((entry) => entry.address === address)?.text.trim() ?? '';
}

/** The prompt text of each prompt kind, in `PROMPTS` order; empty when the case file holds no row. */
export function promptTexts(checkout: string): string[] {
  const [row] = parseYaml(readText(`${checkout}/${CASE_FILE}`)) as CaseRow[];
  return row === undefined ? [] : promptsFor(row.vars.task, firstHalfOf(checkout, row.vars));
}

/** Every tracked text a drawn word must not occur in, as one string. */
export function corpusOf(checkout: string): string {
  return readTextFiles(checkout, CORPUS_SKIP)
    .map((file) => file.text)
    .join('\n');
}
