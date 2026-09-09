/**
 * The answer, composed from what the stages before it found.
 *
 * Extracted so the entry point sequences and does not decide: every branch
 * below is a business rule about what an agent should be told, and the entry
 * point's job is to gather the file and the rule, not to rank the five states.
 *
 * The ORDER of these branches is the contract. Absence is answered before any
 * reading of bytes, and an unreadable file before any freshness claim, because
 * each earlier state makes the later question unanswerable rather than false.
 */

import type { AssessEvidence, AssessResult, WinningRule } from '../../../response-contract/index.ts';
import type { AssessedFile, Freshness } from './assess.types.ts';

/** The Operator's sentence and its provenance, when one applied. */
interface Prompt {
  prompt: string;
  source: 'rule' | 'module';
}

/** Everything the four earlier stages found, gathered so this file only ranks it. */
interface Findings {
  /** The rule that won under first-match, reduced to what the response carries. */
  rule: WinningRule;
  /** What the filesystem found at the path. */
  file: AssessedFile;
  /** The judgement, if the bytes were read and could answer. */
  freshness: Freshness | undefined;
  /** The effective `assess.stale` prompt, if the config carried one. */
  prompt: Prompt | undefined;
}

/** The one branch that carries prose, split out so the ranking above stays a list of returns. */
function staleResult(rule: WinningRule, evidence: AssessEvidence, prompt: Prompt | undefined): AssessResult {
  // The judgement travels whether or not the Operator wrote a sentence for it.
  // Inventing one here would make this the only place the tool speaks prose of
  // its own about a corpus.
  if (prompt === undefined) return { agentAction: 'REVIEW', state: 'stale', evidence, rule };

  return {
    agentAction: 'REVIEW',
    instruction: prompt.prompt,
    state: 'stale',
    source: prompt.source,
    evidence,
    rule,
  };
}

/**
 * What to tell an agent about a governed file.
 *
 * `prompt` is resolved by the caller and passed in rather than looked up here,
 * because it is only ever read on one branch — and a lookup performed for four
 * branches that ignore it reads as though it mattered to all five.
 *
 * @param found Everything the earlier stages established about the file.
 */
export function assessResultFor({ rule, file, freshness, prompt }: Findings): AssessResult {
  if (file.kind === 'absent') return { agentAction: 'PROCEED', state: 'absent', rule };
  if (freshness === undefined || freshness.state === 'unassessable') {
    return { agentAction: 'FIX_FILE', state: 'unassessable', rule };
  }

  if (freshness.state === 'fresh') {
    return { agentAction: 'PROCEED', state: 'fresh', evidence: freshness.evidence, rule };
  }

  return staleResult(rule, freshness.evidence, prompt);
}
