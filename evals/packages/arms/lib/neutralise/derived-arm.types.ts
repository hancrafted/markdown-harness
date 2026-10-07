import type { ArmKind } from '../../../session/observe-session.ts';

/** The arms a config is derived for: every arm but the trusted-prompt control, which has no derived config of its own. */
export type ArmName = Exclude<ArmKind, 'control'>;

/** What an arm's derived config delivers at one carrier. */
export interface DeliveredCarrier {
  readonly address: string;
  readonly text: string;
}

/** One tested carrier's substitution: the placeholder it holds and the generated clause that replaces it. */
export interface Substitute {
  readonly placeholder: string;
  readonly clause: string;
}

export interface DerivedArm {
  /** The derived config as YAML text; produced inside a minted root, never committed. */
  readonly configText: string;
  readonly carriers: readonly DeliveredCarrier[];
  /** How many carrier strings the substitution changed, in total. */
  readonly substitutions: number;
  /** For each substitute, in order, how many carrier strings held its placeholder. */
  readonly occurrences: readonly number[];
  /** The characters every carrier delivers, recorded because the filler is not padded to length. */
  readonly charactersDelivered: number;
}

export interface DeriveArmInput {
  readonly configText: string;
  readonly arm: ArmName;
  /** One substitute per tested carrier: the placeholder the committed config holds, and the generated clause the steered arm puts there. The intent-neutralised arm ignores the clauses. */
  readonly substitutes: readonly Substitute[];
}
