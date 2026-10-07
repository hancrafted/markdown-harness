/** What a canary proves the hook can do: fire headless for one Host harness, delivery channel and root layout. */
export interface CanaryKey {
  readonly host: string;
  readonly channel: string;
  /** The root layout, named by the seed directory the root is minted from. */
  readonly layout: string;
}

/** The part of a cell the canary keys read. */
export interface CellKind {
  readonly hostName: string;
  readonly deliveryChannel: string;
}
