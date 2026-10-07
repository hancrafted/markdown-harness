/** One screen cell: a model answering one prompt kind. Admission needs every cell clean and full. */
export interface ScreenCell {
  readonly model: string;
  readonly prompt: string;
}

/** One sampled session's answer text, tagged by the cell it came from. */
export interface ScreenSample extends ScreenCell {
  readonly text: string;
}

/** What one candidate did in one cell: how many samples were scanned and how many held it. */
export interface CellTally extends ScreenCell {
  readonly samples: number;
  readonly hits: number;
}

export interface Verdict {
  readonly candidate: string;
  readonly admitted: boolean;
  /** Why a candidate was refused, one sentence per failing cell; empty when admitted. */
  readonly reasons: readonly string[];
}

export interface ScreenArgs {
  readonly host: 'claude' | 'stub';
  readonly models: readonly string[];
  readonly samples: number;
  readonly pool: number;
  readonly seed: string | undefined;
  /** An explicit candidate list in place of a drawn pool; the self-test and a re-screen of known words use it. */
  readonly candidates: readonly string[] | undefined;
  readonly allowOverBudget: boolean;
  /** A word the stub says in every answer, so the self-test can plant a leak; never set on a live run. */
  readonly stubSay: string | undefined;
  /** The stub's mode, so the self-test can make its sessions fail; never set on a live run. */
  readonly stubMode: string;
}

export type ScreenArgsResult =
  { readonly ok: true; readonly args: ScreenArgs } | { readonly ok: false; readonly problem: string };
