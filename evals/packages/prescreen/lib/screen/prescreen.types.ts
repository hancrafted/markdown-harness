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

/** The modes the stub Host harness has; a mistyped one is refused at the command line, never passed through. */
export type StubMode = 'obey' | 'deaf' | 'ignore' | 'partial' | 'shell' | 'auth-fail' | 'slow';

export interface ScreenArgs {
  readonly host: 'claude' | 'stub';
  readonly models: readonly string[];
  readonly samples: number;
  readonly pool: number;
  readonly seed: string | undefined;
  /**
   * An explicit candidate list in place of a drawn pool. The self-test uses it to plant known words, and it
   * is kept on the live entry point because a re-screen of words already drawn (a seed's pool, a word
   * proposed by hand) needs the same sessions scanned against a fixed list.
   */
  readonly candidates: readonly string[] | undefined;
  readonly allowOverBudget: boolean;
  /** A word the stub says in every answer, so the self-test can plant a leak; refused unless `host` is `stub`. */
  readonly stubSay: string | undefined;
  /** The stub's mode, so the self-test can make its sessions fail; any value but `obey` is refused unless `host` is `stub`. */
  readonly stubMode: StubMode;
}

export type ScreenArgsResult =
  { readonly ok: true; readonly args: ScreenArgs } | { readonly ok: false; readonly problem: string };

/** Everything a finished screen knows, from which its report, record and exit code follow. */
export interface ScreenResult {
  readonly runDir: string;
  readonly seed: string;
  readonly candidates: readonly string[];
  readonly samples: readonly ScreenSample[];
  readonly failures: readonly string[];
  readonly expected: number;
}

export interface ScreenOutcome {
  readonly code: 0 | 1;
  readonly report: string;
  readonly record: string;
}

/** Where a run works: the checkout it reads and the directory it writes its record into. */
export interface RunLocation {
  readonly checkout: string;
  readonly runDir: string;
}
