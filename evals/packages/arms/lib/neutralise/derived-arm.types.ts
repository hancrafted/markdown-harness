export type ArmName = 'steered' | 'neutralised';

/** What an arm's derived config delivers at one carrier. */
export interface DeliveredCarrier {
  readonly address: string;
  readonly text: string;
}

export interface DerivedArm {
  /** The derived config as YAML text; produced inside a minted root, never committed. */
  readonly configText: string;
  readonly carriers: readonly DeliveredCarrier[];
  /** How many placeholders the substitution replaced. */
  readonly substitutions: number;
  /** The characters every carrier delivers, recorded because the filler is not padded to length. */
  readonly charactersDelivered: number;
}

export interface DeriveArmInput {
  readonly configText: string;
  readonly arm: ArmName;
  /** The plain-string placeholder the committed config holds where the steering-marker clause goes. */
  readonly placeholder: string;
  /** The generated clause the steered arm substitutes; unused by the intent-neutralised arm. */
  readonly clause: string;
}
