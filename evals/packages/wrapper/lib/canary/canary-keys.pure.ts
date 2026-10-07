// Which canaries a matrix owes (decision 13): one for each Host harness, delivery
// channel and root layout the matrix reaches. Only a channel whose row in CHANNELS
// holds a canary can be canaried, so the trusted-prompt control's user-turn channel owes
// none. Phase 1 reaches one of each, so it owes one canary; phase 2 adds rows.

import { CHANNELS } from '../../../session/delivery-surface.ts';
import type { CanaryKey, CellKind } from './canary-keys.types.ts';

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
