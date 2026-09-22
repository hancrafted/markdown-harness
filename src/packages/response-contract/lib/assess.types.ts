/**
 * What `--assess` answers about one file, at one instant.
 *
 * The only command that consults a clock, and it never reads one: the instant
 * arrives as an argument and is echoed beside the answer, so the comparison is
 * reproducible by hand. Nothing here exits 1 — an assessment is advice to an
 * agent mid-task, and a command that can fail a build must not also be the one
 * that reads a clock.
 *
 * Inside each Module block, `agentAction` leads every variant and is FULLY
 * DERIVABLE from `state` on purpose. Five Module states map onto three actions,
 * and asking a busy model to do that mapping is asking for the one thing it is
 * least reliable at. The whole-config `ungoverned` result carries the fifth
 * state and its own derived action only after every Module passed the path by.
 */

/**
 * What the agent that asked should do about the file, as a closed set of three.
 *
 * Verbs, not states: this is the key an agent acts on, so anything that reads
 * as a description belongs in `state` instead. `REVIEW` is the only one that
 * carries the Operator's sentence, which is what keeps this tool from writing
 * prose of its own — everything else it says, it says as data.
 */
export type AgentAction =
  /** Past its freshness date. The Operator's `instruction` travels with this and only this. */
  | 'REVIEW'
  /** Nothing to say about this file: fresh, or beyond what any rule claims. */
  | 'PROCEED'
  /** A rule governs it and the file cannot answer — a repair the author owes. */
  | 'FIX_FILE';

/** Which of the two `assess:` blocks the sentence came from, so nobody has to diff the config. */
export type PromptSource =
  /** The winning rule's own block, which replaces the Module-wide one whole. */
  | 'rule'
  /** The Module-wide block beside `rules:`, because the winning rule wrote none. */
  | 'module-wide';

/**
 * How the file answered, at the instant supplied.
 *
 * Six values, four of which are not about freshness at all: a governed file
 * can be unreadable, unable to answer or absent, while the composed whole-config
 * result can be ungoverned. Collapsing any of those into "fresh" would report
 * an untested file as a sound one. A Module answer uses five variants.
 */
export type AssessState =
  /** The freshness date falls at or before the Assessment instant. */
  | 'stale'
  /** The freshness date falls after it. */
  | 'fresh'
  /** A rule governs the file, and `stale_after` is missing or the frontmatter will not parse. */
  | 'unassessable'
  /** A rule governs the file, but it would not open. */
  | 'unreadable'
  /** No declared Module selects the path. Produced only after composition. */
  | 'ungoverned'
  /** Nothing exists at the path. */
  | 'absent';

/**
 * The rule that won under first-match, and its reason.
 *
 * Deliberately NOT `audit.types`' `RuleRef`, which also carries the selector.
 * `--audit` answers about rules, so a reader there needs to see which paths a
 * rule claimed; an assessment answers about one file the caller already named,
 * and echoing the glob back would be noise in a response an agent reads
 * mid-task. Same two keys `--query` reports, for the same reason.
 */
export interface WinningRule {
  /** The rule's id, the way every report refers to a rule. */
  ruleId: string;
  /** The rule's `intent`, verbatim — the Operator's reason, travelling with the judgement. */
  intent: string;
}

/** The two values a freshness judgement was actually made from, so it can be checked by hand. */
export interface AssessEvidence {
  /** The frontmatter address the judgement read. Today always `stale_after`. */
  field: string;
  /** What sat there, verbatim. */
  value: string;
}

/** What one Module answers before composition names it. */
export type ModuleAssess = StaleFile | FreshFile | UnassessableFile | UnreadableFile | AbsentFile;

/** One Module's assessment, named by the top-level config key the Operator typed. */
export type ModuleAssessment = ModuleAssess & { module: string };

/** Either at least one Module assessed the file, or the whole config passed it by. */
export type AssessResult = AssessedFile | UngovernedFile;

/** Every Module that governs the file, in declared Module order. */
export interface AssessedFile {
  /** Per-Module answers; never empty. */
  modules: readonly ModuleAssessment[];
}

/** Past its freshness date: the one case that carries the Operator's words. */
export interface StaleFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'REVIEW';
  /**
   * The Operator's own sentence, verbatim from the effective `assess.stale`
   * block. Never substituted for and never wrapped in prose of ours.
   *
   * ABSENT when no `assess:` block reached this rule. The finding is real
   * either way — `state` and `evidence` still carry it — but this tool does not
   * write prose, so a corpus with no configured prompt gets the judgement
   * without a sentence rather than a sentence of ours.
   */
  instruction?: string;
  /** The discriminant. */
  state: 'stale';
  /** Which block the sentence came from. Absent exactly when `instruction` is. */
  source?: PromptSource;
  /** What the judgement read, so a human can repeat the comparison. */
  evidence: AssessEvidence;
  /** The rule that won under first-match, and its intent verbatim. */
  rule: WinningRule;
}

/** Within its freshness date. Nothing to say, but the evidence still travels. */
export interface FreshFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'PROCEED';
  /** Absent by construction: only `REVIEW` carries the Operator's words. */
  instruction?: never;
  /** The discriminant. */
  state: 'fresh';
  /** Absent: no sentence was rendered, so no block answered. */
  source?: never;
  /** What the judgement read. Present, because a `PROCEED` a reader cannot check is worth little. */
  evidence: AssessEvidence;
  /** The rule that won under first-match. */
  rule: WinningRule;
}

/**
 * Governed, and unable to answer.
 *
 * Deliberately not `fresh`. A file with no `stale_after`, or with frontmatter
 * that will not parse, has made no freshness claim at all — and reporting that
 * as fresh would let an ungoverned-in-practice file read as a sound one.
 */
export interface UnassessableFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'FIX_FILE';
  /** Absent by construction. */
  instruction?: never;
  /** The discriminant. */
  state: 'unassessable';
  /** Absent. */
  source?: never;
  /** Absent: the readable frontmatter made no usable freshness claim. */
  evidence?: never;
  /** The rule that won, so the reader knows who is asking for the repair. */
  rule: WinningRule;
}

/**
 * Governed, but impossible to read.
 *
 * This is distinct from `unassessable`: that state reports bytes whose
 * frontmatter made no usable freshness claim; this one reports no bytes at
 * all. The assessment envelope already echoes the requested path, so the
 * result keeps the rule and adds no duplicate location.
 */
export interface UnreadableFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'FIX_FILE';
  /** Absent by construction. */
  instruction?: never;
  /** The discriminant. */
  state: 'unreadable';
  /** Absent. */
  source?: never;
  /** Absent: there were no bytes to inspect. */
  evidence?: never;
  /** The rule that made opening this file necessary. */
  rule: WinningRule;
}

/**
 * Outside every declared Module's rules.
 *
 * The same whole-config claim `QueryResult` calls `invisible`, named for the
 * file because this command answers about the file. One Module passing the path
 * by cannot produce this result; only composition can see that every Module did.
 */
export interface UngovernedFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'PROCEED';
  /** Absent by construction. */
  instruction?: never;
  /** The discriminant. */
  state: 'ungoverned';
  /** Absent. */
  source?: never;
  /** Absent. */
  evidence?: never;
  /** Absent: no rule selected the path, which is a claim about the whole config. */
  rule?: never;
  /** Absent: there is no governing Module block to report. */
  modules?: never;
}

/**
 * Nothing exists at the path, and a rule claims it anyway.
 *
 * Governance is decided before the file is opened, so this is what an agent
 * about to CREATE a governed file is told: proceed, and here is the rule that
 * will judge it. A path no rule claims is `ungoverned` whether or not anything
 * is there.
 */
export interface AbsentFile {
  /** Leads the variant, and derived from `state`. */
  agentAction: 'PROCEED';
  /** Absent by construction. */
  instruction?: never;
  /** The discriminant. */
  state: 'absent';
  /** Absent. */
  source?: never;
  /** Absent: nothing was there to read. */
  evidence?: never;
  /** The rule that would govern the file once it exists. */
  rule: WinningRule;
}
