import type { DeliveryChannel } from '../../../session/delivery-surface.ts';
import type { HostName } from '../../../session/host-profile.ts';

/** What a canary proves the hook can do: fire headless for one Host harness, delivery channel and root layout. */
export interface CanaryKey {
  readonly host: HostName;
  readonly channel: DeliveryChannel;
  /** The root layout, named by the seed directory the root is minted from. */
  readonly layout: string;
}

/** The part of a cell the canary keys read. */
export interface CellKind {
  readonly hostName: HostName;
  readonly deliveryChannel: DeliveryChannel;
}

/** The cells of a configuration, read: the kinds a canary can be owed for and a refusal for each host no profile names. */
export interface CellKinds {
  readonly kinds: readonly CellKind[];
  readonly refusals: readonly string[];
}
