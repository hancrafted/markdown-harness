// Which canaries a matrix owes (decision 13): one for each Host harness, delivery
// channel and root layout the matrix reaches. Only a channel that delivers through
// a hook can be canaried, so the trusted-prompt control's user-turn channel owes
// none. Phase 1 reaches one of each, so it owes one canary; phase 2 adds rows.

import type { CanaryKey, CellKind } from './canary-keys.types.ts';

const HOOK_CHANNELS = ['push'];

export function describeKey(key: CanaryKey): string {
  return `${key.host}/${key.channel}/${key.layout}`;
}

export function canaryKeysFor(cells: readonly CellKind[], layouts: readonly string[]): CanaryKey[] {
  const keys = cells
    .filter((cell) => HOOK_CHANNELS.includes(cell.deliveryChannel))
    .flatMap((cell) =>
      layouts.map((layout) => ({ host: cell.hostName, channel: cell.deliveryChannel, layout }) as CanaryKey),
    );
  const distinct = new Map(keys.map((key) => [describeKey(key), key] as const));
  return [...distinct.values()].sort((left, right) => describeKey(left).localeCompare(describeKey(right)));
}
