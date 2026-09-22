/**
 * Compose every Module's answer about one corpus into the verdict `--check`
 * returns.
 *
 * This is where a file's findings NEST: each Module hands back what it found,
 * and the block naming it is written here, from the key its descriptor carries.
 * A Module that wrote its own name into its own findings would be spelling a
 * config key it never reads, and the promise that a Module costs one descriptor
 * plus one list entry would be quietly false — the second Module would need the
 * report builders edited too.
 *
 * Composition is `cli`'s alone (ARCH-008 §4.1), and the three counts have to be
 * taken here for the same reason: `governedFiles` is a union across Modules
 * rather than one Module's tally, and no Module can see the others to take it.
 */

import type { CheckResult, ModuleCheck, ModuleViolations } from '../../../response-contract/index.ts';

/**
 * One Module's answer, under the name the report will give it.
 *
 * A private local type beside its only consumer: the pairing of a descriptor's
 * key with its Module's answer is `cli`'s own composition step, and nothing
 * outside this Package has anything to do with it.
 */
interface ModuleAnswer {
  /** The Module's top-level config key, read from its descriptor. */
  module: string;
  /** What that Module answered about this corpus. */
  check: ModuleCheck;
}

/** A Module's complete answer about one corpus, including a read refusal. */
interface GatheredModuleAnswer {
  /** The Module's top-level config key, read from its descriptor. */
  module: string;
  /** The Module's checked extent and findings, or the first governed file it could not read. */
  result: { kind: 'checked'; result: ModuleCheck } | { kind: 'unreadable'; path: string };
}

/** How many findings one file's blocks carry between them. */
function countIn(blocks: readonly ModuleViolations[]): number {
  return blocks.reduce((total, block) => total + block.violations.length, 0);
}

/**
 * Every Module block for one file, in the order the Modules were declared.
 *
 * Keyed by path rather than by index, because a Module governs a SUBSET of the
 * corpus and two Modules need not govern the same one.
 */
function blocksByPath(answers: readonly ModuleAnswer[]): Map<string, ModuleViolations[]> {
  const blocks = new Map<string, ModuleViolations[]>();

  for (const answer of answers) {
    for (const finding of answer.check.files) {
      const found = blocks.get(finding.path) ?? [];
      found.push({
        module: answer.module,
        ruleId: finding.ruleId,
        ruleIntent: finding.ruleIntent,
        violations: finding.violations,
      });
      blocks.set(finding.path, found);
    }
  }

  return blocks;
}

/**
 * Walker order, for a path any Module reported.
 *
 * A path the corpus does not hold sorts last rather than disappearing. It
 * cannot arise from a Module handed this same corpus, and a composition step
 * that dropped a finding on the floor would make an incomplete verdict look
 * like a clean one — the one failure this command exists not to have.
 */
function inCorpusOrder(corpus: readonly string[]): (left: string, right: string) => number {
  const order = new Map(corpus.map((path, index) => [path, index]));
  const last = corpus.length;
  return (left, right) => (order.get(left) ?? last) - (order.get(right) ?? last);
}

/**
 * The verdict over one corpus, across every Module that answered.
 *
 * @param corpus Every file the walk enumerated, normalised, in walker order.
 * @param answers Each Module's answer under its own config key, IN DECLARED MODULE ORDER — the order the blocks are reported in.
 */
export function corpusVerdict(corpus: readonly string[], answers: readonly ModuleAnswer[]): CheckResult {
  const blocks = blocksByPath(answers);
  const governed = new Set(answers.flatMap((answer) => [...answer.check.governed]));

  const files = [...blocks.keys()].sort(inCorpusOrder(corpus)).map((path) => ({
    path,
    modules: blocks.get(path) ?? [],
  }));

  return {
    summary: {
      governedFiles: governed.size,
      invalidFiles: files.length,
      totalViolations: files.reduce((total, file) => total + countIn(file.modules), 0),
    },
    files,
  };
}

/**
 * Refuse an incomplete corpus report, or compose every Module's checked answer.
 *
 * A read refusal wins before the verdict is composed: returning a partial
 * report would silently omit a governed file and could look clean. The impure
 * shell gathers each Module's result; this pure composer decides which report
 * shape those gathered results mean.
 */
export function checkVerdict(
  corpus: readonly string[],
  answers: readonly GatheredModuleAnswer[],
): { kind: 'checked'; result: CheckResult } | { kind: 'unreadable'; path: string } {
  const unreadable = answers.find((answer) => answer.result.kind === 'unreadable');
  if (unreadable !== undefined && unreadable.result.kind === 'unreadable') return unreadable.result;

  return {
    kind: 'checked',
    result: corpusVerdict(
      corpus,
      answers.map((answer) => {
        if (answer.result.kind !== 'checked') throw new Error('unreadable Module result escaped its guard');
        return { module: answer.module, check: answer.result.result };
      }),
    ),
  };
}
