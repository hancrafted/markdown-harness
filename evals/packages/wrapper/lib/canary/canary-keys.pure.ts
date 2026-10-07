// Which canaries a matrix owes (decision 13): one for each Host harness, delivery
// channel and root layout the matrix reaches. Only a channel whose row in CHANNELS
// holds a canary can be canaried, so the trusted-prompt control's user-turn channel owes
// none. Phase 1 reaches one of each, so it owes one canary; phase 2 adds rows.

import { CHANNELS, isDeliveryChannel } from '../../../session/delivery-surface.ts';
import type { ProbeRecord } from '../../../session/host-profile.ts';
import { channelRefusal, isHostName, profileOf } from '../../../session/host-profile.ts';
import type { CanaryKey, CellKind, CellKinds } from './canary-keys.types.ts';

export function describeKey(key: CanaryKey): string {
  return `${key.host}/${key.channel}/${key.layout}`;
}

export function canaryKeysFor(cells: readonly CellKind[], layouts: readonly string[]): CanaryKey[] {
  const keys = cells
    .filter((cell) => CHANNELS[cell.deliveryChannel].canary !== undefined)
    .flatMap((cell) =>
      layouts.map((layout): CanaryKey => ({ host: cell.hostName, channel: cell.deliveryChannel, layout })),
    );
  const distinct = new Map(keys.map((key) => [describeKey(key), key] as const));
  return [...distinct.values()].sort((left, right) => describeKey(left).localeCompare(describeKey(right)));
}

/**
 * The keys whose canary cannot be owed because the Host harness's own capability is unprobed or has no builder:
 * each is a refusal sentence. The matrix is refused rather than the key dropped, because a canary quietly not
 * owed would let every cell under it run unproven.
 */
export function unprovableKeys(keys: readonly CanaryKey[], record: ProbeRecord): string[] {
  return keys.flatMap((key) => {
    const refusal = channelRefusal(profileOf(key.host, record), key.channel);
    return refusal === undefined ? [] : [refusal];
  });
}

/**
 * The cell kinds a configuration's providers name. A host no profile names is refused here, at the boundary where
 * the text becomes typed, so every key after it carries a Host harness the table knows.
 */
export function readCellKinds(configs: readonly Partial<Record<'hostName' | 'deliveryChannel', unknown>>[]): CellKinds {
  const kinds: CellKind[] = [];
  const refusals: string[] = [];
  for (const { hostName, deliveryChannel } of configs) {
    if (hostName === undefined || !isDeliveryChannel(deliveryChannel)) continue;
    if (isHostName(hostName)) kinds.push({ hostName, deliveryChannel });
    else refusals.push(`${String(hostName)}: no such Host harness`);
  }
  return { kinds, refusals };
}
